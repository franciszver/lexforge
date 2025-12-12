import type { Handler } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const secretsClient = new SecretsManagerClient({ region: 'us-west-2' });
const dynamoClient = new DynamoDBClient({ region: 'us-west-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Cache API keys to avoid repeated Secrets Manager calls
let cachedOpenAIKey: string | null = null;
let cachedBraveKey: string | null = null;

async function getSecret(secretName: string): Promise<string> {
    try {
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const response = await secretsClient.send(command);
        return response.SecretString || '';
    } catch (error) {
        console.error(`Error fetching secret ${secretName}:`, error);
        throw error;
    }
}

async function getOpenAIApiKey(): Promise<string> {
    if (cachedOpenAIKey) return cachedOpenAIKey;
    cachedOpenAIKey = await getSecret(process.env.OPENAI_API_KEY_SECRET_NAME || 'lexforge/openai-api-key');
    return cachedOpenAIKey;
}

async function getBraveApiKey(): Promise<string> {
    if (cachedBraveKey) return cachedBraveKey;
    cachedBraveKey = await getSecret(process.env.BRAVE_API_KEY_SECRET_NAME || 'lexforge/brave-api-key');
    return cachedBraveKey;
}

interface SearchResult {
    title: string;
    url: string;
    description: string;
}

interface SuggestionContext {
    jurisdiction?: string;
    docType?: string;
    practiceArea?: string;
    formality?: string;
    riskAppetite?: string;
    includeClauseSuggestions?: boolean;
}

interface ClauseMatch {
    id: string;
    title: string;
    content: string;
    category: string;
    description?: string;
    relevanceScore: number;
}

// Search for relevant clauses in the Clause library
async function searchRelevantClauses(
    documentContent: string,
    context: SuggestionContext
): Promise<ClauseMatch[]> {
    try {
        // Get the Clause table name from environment or construct it
        const tableName = process.env.CLAUSE_TABLE_NAME || 'Clause-lexforge';
        
        // Scan clauses (in production, use OpenSearch or similar for better search)
        const result = await docClient.send(new ScanCommand({
            TableName: tableName,
            FilterExpression: 'isPublished = :published',
            ExpressionAttributeValues: {
                ':published': true,
            },
            Limit: 100,
        }));
        
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        
        // Simple keyword matching for relevance scoring
        const keywords = extractKeywords(documentContent);
        const docType = context.docType?.toLowerCase() || '';
        const jurisdiction = context.jurisdiction?.toLowerCase() || '';
        
        const scoredClauses = result.Items.map((clause) => {
            let score = 0;
            const clauseContent = String(clause.content || '').toLowerCase();
            const clauseTitle = String(clause.title || '').toLowerCase();
            const clauseCategory = String(clause.category || '').toLowerCase();
            const clauseTags = parseJsonField<string[]>(clause.tags, []);
            const clauseDocTypes = parseJsonField<string[]>(clause.documentTypes, []);
            const clauseJurisdiction = String(clause.jurisdiction || '').toLowerCase();
            
            // Score by keyword matches
            for (const keyword of keywords) {
                if (clauseTitle.includes(keyword)) score += 3;
                if (clauseContent.includes(keyword)) score += 1;
                if (clauseCategory.includes(keyword)) score += 2;
                if (clauseTags.some(t => t.toLowerCase().includes(keyword))) score += 2;
            }
            
            // Bonus for matching document type
            if (docType && clauseDocTypes.some(dt => dt.toLowerCase().includes(docType))) {
                score += 5;
            }
            
            // Bonus for matching jurisdiction
            if (jurisdiction && (clauseJurisdiction.includes(jurisdiction) || clauseJurisdiction === 'federal')) {
                score += 3;
            }
            
            // Boost by usage count
            const usageCount = typeof clause.usageCount === 'number' ? clause.usageCount : 0;
            score += Math.min(usageCount / 10, 5);
            
            return {
                id: String(clause.id || ''),
                title: String(clause.title || ''),
                content: String(clause.content || ''),
                category: String(clause.category || ''),
                description: String(clause.description || ''),
                relevanceScore: score,
            };
        });
        
        // Return top 5 most relevant clauses
        return scoredClauses
            .filter((c: ClauseMatch) => c.relevanceScore > 0)
            .sort((a: ClauseMatch, b: ClauseMatch) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5);
    } catch (error) {
        console.warn('Error searching clauses:', error);
        return [];
    }
}

// Helper to extract keywords from document content
function extractKeywords(text: string): string[] {
    // Legal-specific keywords to look for
    const legalTerms = [
        'confidential', 'indemnif', 'terminat', 'liability', 'warrant',
        'represent', 'covenant', 'agree', 'obligation', 'breach',
        'damages', 'remedies', 'governing law', 'jurisdiction', 'arbitrat',
        'force majeure', 'assign', 'notice', 'amend', 'waiv',
        'intellectual property', 'proprietary', 'disclosure', 'non-compete',
        'severab', 'entire agreement', 'counterpart', 'dispute',
    ];
    
    const lowercaseText = text.toLowerCase();
    return legalTerms.filter(term => lowercaseText.includes(term));
}

// Helper to parse JSON fields
function parseJsonField<T>(value: unknown, defaultValue: T): T {
    if (!value) return defaultValue;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as T;
        } catch {
            return defaultValue;
        }
    }
    return value as T;
}

// Search for legal references using Brave Search API
async function searchLegalReferences(query: string, jurisdiction: string): Promise<SearchResult[]> {
    try {
        const apiKey = await getBraveApiKey();
        const searchQuery = `${query} ${jurisdiction} legal precedent site:law.cornell.edu OR site:uscourts.gov OR site:westlaw.com`;
        
        const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`,
            {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey,
                },
            }
        );

        if (!response.ok) {
            console.warn('Brave Search API failed, proceeding without search results');
            return [];
        }

        const data = await response.json();
        return (data.web?.results || []).slice(0, 3).map((r: { title: string; url: string; description: string }) => ({
            title: r.title,
            url: r.url,
            description: r.description,
        }));
    } catch (error) {
        console.warn('Error in Brave Search:', error);
        return [];
    }
}

// Generate suggestions using OpenAI
async function generateWithOpenAI(
    documentContent: string,
    context: SuggestionContext,
    searchResults: SearchResult[]
): Promise<Array<{
    id: string;
    type: string;
    title: string;
    text: string;
    replacementText?: string;
    confidence: number;
    sourceRefs: string[];
}>> {
    const apiKey = await getOpenAIApiKey();

    const searchContext = searchResults.length > 0
        ? `\n\nRelevant legal sources found:\n${searchResults.map(r => `- ${r.title}: ${r.description} (${r.url})`).join('\n')}`
        : '';

    const systemPrompt = `You are a senior legal editor reviewing legal documents. Analyze the document and provide specific, actionable suggestions for improvement.

Context:
- Jurisdiction: ${context.jurisdiction || 'Federal'}
- Document Type: ${context.docType || 'Legal Document'}
- Practice Area: ${context.practiceArea || 'General'}
- Formality Level: ${context.formality || 'moderate'}
- Risk Appetite: ${context.riskAppetite || 'moderate'}
${searchContext}

Provide suggestions in the following JSON format (return ONLY valid JSON array):
[
  {
    "type": "tone|precision|risk|source|structured",
    "title": "Brief title for the suggestion",
    "text": "Detailed explanation of the issue or improvement",
    "replacementText": "Optional: suggested replacement text if applicable",
    "confidence": 0.0-1.0,
    "sourceRefs": ["url1", "url2"]
  }
]

Focus on:
1. Tone and formality appropriate to the document type
2. Legal precision and clarity
3. Risk mitigation based on the risk appetite setting
4. Citations and legal precedents
5. Document structure and organization

Provide 3-5 high-quality suggestions.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Review this legal document and provide improvement suggestions:\n\n${documentContent}` },
            ],
            temperature: 0.7,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // Parse JSON from response (handle markdown code blocks)
    let suggestions;
    try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseError) {
        console.error('Failed to parse OpenAI response:', content);
        suggestions = [];
    }

    // Add IDs and validate structure
    return suggestions.map((s: {
        type?: string;
        title?: string;
        text?: string;
        replacementText?: string;
        confidence?: number;
        sourceRefs?: string[];
    }) => ({
        id: crypto.randomUUID(),
        type: s.type || 'structured',
        title: s.title || 'Suggestion',
        text: s.text || '',
        replacementText: s.replacementText,
        confidence: Math.min(1, Math.max(0, s.confidence || 0.75)),
        sourceRefs: Array.isArray(s.sourceRefs) ? s.sourceRefs.filter((url: string) => typeof url === 'string' && url.startsWith('http')) : [],
    }));
}

export const handler: Handler = async (event) => {
    const { text, context } = event.arguments || {};

    console.log('Received drafting request, content length:', text?.length || 0);
    console.log('Context:', JSON.stringify(context));

    try {
        // Extract document content (strip HTML tags for analysis)
        const plainText = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        if (!plainText || plainText.length < 10) {
            return {
                suggestions: [{
                    id: crypto.randomUUID(),
                    type: 'structured',
                    title: 'Add Content',
                    text: 'Start drafting your document to receive AI-powered suggestions for improvement.',
                    confidence: 1.0,
                    sourceRefs: [],
                }],
            };
        }

        // Search for relevant legal references and clauses in parallel
        const [searchResults, relevantClauses] = await Promise.all([
            searchLegalReferences(
                plainText.substring(0, 200),
                context?.jurisdiction || 'Federal'
            ),
            context?.includeClauseSuggestions !== false 
                ? searchRelevantClauses(plainText, context || {})
                : Promise.resolve([]),
        ]);

        // Generate suggestions using OpenAI
        const suggestions = await generateWithOpenAI(plainText, context || {}, searchResults);
        
        // Convert relevant clauses to clause suggestions
        const clauseSuggestions = relevantClauses.map((clause) => ({
            id: crypto.randomUUID(),
            type: 'clause',
            title: `Insert: ${clause.title}`,
            text: clause.description || `Consider adding a ${clause.category} clause to strengthen this document.`,
            clauseId: clause.id,
            clauseContent: clause.content,
            clauseCategory: clause.category,
            confidence: Math.min(0.95, 0.5 + clause.relevanceScore / 20),
            sourceRefs: [],
        }));

        return { 
            suggestions: [...suggestions, ...clauseSuggestions],
            relevantClauses: relevantClauses.map(c => ({
                id: c.id,
                title: c.title,
                category: c.category,
                description: c.description,
                relevanceScore: c.relevanceScore,
            })),
        };
    } catch (error) {
        console.error('Error in generate-suggestion handler:', error);
        
        // Return fallback suggestion on error
        return {
            suggestions: [{
                id: crypto.randomUUID(),
                type: 'structured',
                title: 'AI Service Unavailable',
                text: 'Unable to generate suggestions at this time. Please try again later.',
                confidence: 0.5,
                sourceRefs: [],
            }],
        };
    }
};
