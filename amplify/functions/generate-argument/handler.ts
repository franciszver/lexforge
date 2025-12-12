import type { Handler } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-west-2' });

// Cache API key
let cachedOpenAIKey: string | null = null;

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

// ============================================
// Types
// ============================================

interface ArgumentInputRaw {
    mode: 'generate' | 'counter' | 'analyze' | 'strengthen';
    
    // For generate mode - these come as JSON strings from GraphQL
    facts?: string;           // JSON string of string[]
    keyFacts?: string;        // JSON string of string[]
    legalPrinciples?: string; // JSON string of string[]
    jurisdiction?: string;
    documentType?: string;
    practiceArea?: string;
    desiredOutcome?: string;
    clientPosition?: string;
    opposingArguments?: string; // JSON string of string[]
    constraints?: string;       // JSON string of string[]
    tone?: string;
    
    // For counter/analyze/strengthen modes
    existingArgument?: string;
    existingOutline?: string;   // JSON string of ArgumentOutline
}

interface ArgumentInput {
    mode: 'generate' | 'counter' | 'analyze' | 'strengthen';
    facts?: string[];
    keyFacts?: string[];
    legalPrinciples?: string[];
    jurisdiction?: string;
    documentType?: string;
    practiceArea?: string;
    desiredOutcome?: string;
    clientPosition?: string;
    opposingArguments?: string[];
    constraints?: string[];
    tone?: string;
    existingArgument?: string;
    existingOutline?: ArgumentOutline;
}

function parseInputFromRaw(raw: ArgumentInputRaw): ArgumentInput {
    return {
        mode: raw.mode,
        facts: raw.facts ? JSON.parse(raw.facts) : undefined,
        keyFacts: raw.keyFacts ? JSON.parse(raw.keyFacts) : undefined,
        legalPrinciples: raw.legalPrinciples ? JSON.parse(raw.legalPrinciples) : undefined,
        jurisdiction: raw.jurisdiction,
        documentType: raw.documentType,
        practiceArea: raw.practiceArea,
        desiredOutcome: raw.desiredOutcome,
        clientPosition: raw.clientPosition,
        opposingArguments: raw.opposingArguments ? JSON.parse(raw.opposingArguments) : undefined,
        constraints: raw.constraints ? JSON.parse(raw.constraints) : undefined,
        tone: raw.tone,
        existingArgument: raw.existingArgument,
        existingOutline: raw.existingOutline ? JSON.parse(raw.existingOutline) : undefined,
    };
}

interface SupportingPoint {
    id: string;
    text: string;
    type: 'fact' | 'law' | 'precedent' | 'policy' | 'logic';
    strength: 'strong' | 'moderate' | 'weak';
    citations?: string[];
}

interface CounterArgument {
    id: string;
    text: string;
    strength: 'strong' | 'moderate' | 'weak';
    rebuttal?: string;
    rebuttalStrength?: 'strong' | 'moderate' | 'weak';
}

interface Argument {
    id: string;
    type: string;
    title: string;
    thesis: string;
    supportingPoints: SupportingPoint[];
    counterArguments: CounterArgument[];
    conclusion: string;
    strength: 'strong' | 'moderate' | 'weak';
    confidenceScore: number;
    citations: string[];
    order: number;
}

interface ArgumentOutline {
    id: string;
    title: string;
    description?: string;
    documentType: string;
    jurisdiction?: string;
    introduction: string;
    arguments: Argument[];
    conclusion: string;
    overallStrength: 'strong' | 'moderate' | 'weak';
    coherenceScore: number;
    completenessScore: number;
    suggestions?: string[];
}

interface CoherenceAnalysis {
    overallScore: number;
    logicalFlow: number;
    factConsistency: number;
    citationSupport: number;
    counterArgumentCoverage: number;
    conclusionAlignment: number;
    issues: Array<{
        type: string;
        severity: string;
        location: string;
        description: string;
        suggestion?: string;
    }>;
    suggestions: string[];
}

// ============================================
// OpenAI API Calls
// ============================================

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = await getOpenAIApiKey();
    
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
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

function parseJSON<T>(content: string, fallback: T): T {
    try {
        // Handle markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
        return JSON.parse(content);
    } catch (error) {
        console.error('Failed to parse JSON:', content);
        return fallback;
    }
}

// ============================================
// Argument Generation
// ============================================

async function generateArguments(input: ArgumentInput): Promise<ArgumentOutline> {
    const systemPrompt = `You are an expert legal strategist helping to build compelling legal arguments. 
You specialize in ${input.practiceArea || 'general legal practice'} law in ${input.jurisdiction || 'Federal'} jurisdiction.

Your task is to generate a structured argument outline based on the provided facts and legal principles.

Return ONLY valid JSON in this exact format:
{
    "title": "Brief descriptive title for the argument",
    "description": "One sentence summary",
    "introduction": "Opening paragraph that frames the legal issue and previews the arguments",
    "arguments": [
        {
            "type": "legal|factual|policy|equitable|procedural|statutory|constitutional",
            "title": "Argument heading",
            "thesis": "Main argument statement",
            "supportingPoints": [
                {
                    "text": "Supporting point text",
                    "type": "fact|law|precedent|policy|logic",
                    "strength": "strong|moderate|weak",
                    "citations": ["citation if applicable"]
                }
            ],
            "counterArguments": [
                {
                    "text": "Anticipated counter-argument",
                    "strength": "strong|moderate|weak",
                    "rebuttal": "Response to counter-argument",
                    "rebuttalStrength": "strong|moderate|weak"
                }
            ],
            "conclusion": "Conclusion for this argument",
            "citations": ["relevant citations"]
        }
    ],
    "conclusion": "Final conclusion tying all arguments together",
    "suggestions": ["suggestions for strengthening the argument"]
}

Guidelines:
- Create 2-4 strong, distinct arguments
- Each argument should have 2-4 supporting points
- Anticipate at least 1 counter-argument per main argument
- Use ${input.tone || 'moderate'} tone
- Focus on achieving: ${input.desiredOutcome || 'favorable outcome'}
- Client is the ${input.clientPosition || 'plaintiff'}
${input.constraints?.length ? `- Constraints: ${input.constraints.join(', ')}` : ''}`;

    const userPrompt = `Generate legal arguments for the following case:

FACTS:
${input.facts?.join('\n') || 'No facts provided'}

${input.keyFacts?.length ? `KEY FACTS:\n${input.keyFacts.join('\n')}` : ''}

LEGAL PRINCIPLES TO APPLY:
${input.legalPrinciples?.join('\n') || 'Apply relevant legal standards'}

DOCUMENT TYPE: ${input.documentType || 'Brief'}

${input.opposingArguments?.length ? `KNOWN OPPOSING ARGUMENTS TO ADDRESS:\n${input.opposingArguments.join('\n')}` : ''}

DESIRED OUTCOME: ${input.desiredOutcome || 'Favorable ruling for client'}`;

    const content = await callOpenAI(systemPrompt, userPrompt);
    const parsed = parseJSON<Partial<ArgumentOutline>>(content, {});
    
    // Build complete outline with IDs and defaults
    const outline: ArgumentOutline = {
        id: `outline-${Date.now()}`,
        title: parsed.title || 'Legal Argument Outline',
        description: parsed.description,
        documentType: input.documentType || 'Brief',
        jurisdiction: input.jurisdiction,
        introduction: parsed.introduction || '',
        arguments: (parsed.arguments || []).map((arg, index) => ({
            id: `arg-${Date.now()}-${index}`,
            type: arg.type || 'legal',
            title: arg.title || `Argument ${index + 1}`,
            thesis: arg.thesis || '',
            supportingPoints: (arg.supportingPoints || []).map((sp, spIndex) => ({
                id: `sp-${Date.now()}-${index}-${spIndex}`,
                text: sp.text || '',
                type: sp.type || 'logic',
                strength: sp.strength || 'moderate',
                citations: sp.citations || [],
            })),
            counterArguments: (arg.counterArguments || []).map((ca, caIndex) => ({
                id: `ca-${Date.now()}-${index}-${caIndex}`,
                text: ca.text || '',
                strength: ca.strength || 'moderate',
                rebuttal: ca.rebuttal,
                rebuttalStrength: ca.rebuttalStrength,
            })),
            conclusion: arg.conclusion || '',
            strength: arg.strength || 'moderate',
            confidenceScore: arg.confidenceScore || 0.75,
            citations: arg.citations || [],
            order: index,
        })),
        conclusion: parsed.conclusion || '',
        overallStrength: calculateOverallStrength(parsed.arguments || []),
        coherenceScore: 0.8, // Will be calculated by analyze
        completenessScore: 0.75,
        suggestions: parsed.suggestions || [],
    };

    return outline;
}

// ============================================
// Counter-Argument Generation
// ============================================

async function generateCounterArguments(input: ArgumentInput): Promise<CounterArgument[]> {
    const systemPrompt = `You are an expert legal strategist analyzing arguments from the opposing perspective.
Your task is to identify potential counter-arguments to the given legal argument.

Return ONLY valid JSON array:
[
    {
        "text": "Counter-argument text",
        "strength": "strong|moderate|weak",
        "rebuttal": "Suggested rebuttal to this counter-argument",
        "rebuttalStrength": "strong|moderate|weak"
    }
]

Generate 3-5 counter-arguments, prioritizing the strongest ones first.`;

    const userPrompt = `Identify counter-arguments to this legal argument:

${input.existingArgument || JSON.stringify(input.existingOutline, null, 2)}

Jurisdiction: ${input.jurisdiction || 'Federal'}
Document Type: ${input.documentType || 'Brief'}`;

    const content = await callOpenAI(systemPrompt, userPrompt);
    const parsed = parseJSON<Partial<CounterArgument>[]>(content, []);
    
    return parsed.map((ca, index) => ({
        id: `counter-${Date.now()}-${index}`,
        text: ca.text || '',
        strength: ca.strength || 'moderate',
        rebuttal: ca.rebuttal,
        rebuttalStrength: ca.rebuttalStrength,
    }));
}

// ============================================
// Coherence Analysis
// ============================================

async function analyzeCoherence(input: ArgumentInput): Promise<CoherenceAnalysis> {
    const systemPrompt = `You are an expert legal editor analyzing the coherence and strength of legal arguments.
Evaluate the argument structure for logical flow, consistency, and persuasiveness.

Return ONLY valid JSON:
{
    "overallScore": 0.0-1.0,
    "logicalFlow": 0.0-1.0,
    "factConsistency": 0.0-1.0,
    "citationSupport": 0.0-1.0,
    "counterArgumentCoverage": 0.0-1.0,
    "conclusionAlignment": 0.0-1.0,
    "issues": [
        {
            "type": "gap|contradiction|unsupported|weak_link|missing_counter",
            "severity": "high|medium|low",
            "location": "Which argument or section",
            "description": "Description of the issue",
            "suggestion": "How to fix it"
        }
    ],
    "suggestions": ["Overall suggestions for improvement"]
}`;

    const userPrompt = `Analyze the coherence of this legal argument structure:

${JSON.stringify(input.existingOutline, null, 2)}`;

    const content = await callOpenAI(systemPrompt, userPrompt);
    const parsed = parseJSON<Partial<CoherenceAnalysis>>(content, {});
    
    return {
        overallScore: parsed.overallScore || 0.7,
        logicalFlow: parsed.logicalFlow || 0.7,
        factConsistency: parsed.factConsistency || 0.8,
        citationSupport: parsed.citationSupport || 0.6,
        counterArgumentCoverage: parsed.counterArgumentCoverage || 0.7,
        conclusionAlignment: parsed.conclusionAlignment || 0.8,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
    };
}

// ============================================
// Argument Strengthening
// ============================================

async function strengthenArgument(input: ArgumentInput): Promise<ArgumentOutline> {
    const systemPrompt = `You are an expert legal strategist helping to strengthen legal arguments.
Analyze the existing argument and provide an improved version with:
- Stronger supporting points
- Better anticipated counter-arguments
- More compelling language
- Additional citations where helpful

Return the improved argument in the same JSON format as the input, but with enhancements.`;

    const userPrompt = `Strengthen this legal argument:

${JSON.stringify(input.existingOutline, null, 2)}

Jurisdiction: ${input.jurisdiction || 'Federal'}
Focus areas for improvement: ${input.constraints?.join(', ') || 'All areas'}`;

    const content = await callOpenAI(systemPrompt, userPrompt);
    const parsed = parseJSON<Partial<ArgumentOutline>>(content, {});
    
    // Merge improvements with existing outline
    const existing = input.existingOutline!;
    return {
        ...existing,
        id: existing.id,
        title: parsed.title || existing.title,
        introduction: parsed.introduction || existing.introduction,
        arguments: (parsed.arguments || existing.arguments).map((arg, index) => ({
            id: arg.id || `arg-${Date.now()}-${index}`,
            type: arg.type || 'legal',
            title: arg.title || `Argument ${index + 1}`,
            thesis: arg.thesis || '',
            supportingPoints: (arg.supportingPoints || []).map((sp, spIndex) => ({
                id: sp.id || `sp-${Date.now()}-${index}-${spIndex}`,
                text: sp.text || '',
                type: sp.type || 'logic',
                strength: sp.strength || 'moderate',
                citations: sp.citations || [],
            })),
            counterArguments: (arg.counterArguments || []).map((ca, caIndex) => ({
                id: ca.id || `ca-${Date.now()}-${index}-${caIndex}`,
                text: ca.text || '',
                strength: ca.strength || 'moderate',
                rebuttal: ca.rebuttal,
                rebuttalStrength: ca.rebuttalStrength,
            })),
            conclusion: arg.conclusion || '',
            strength: arg.strength || 'moderate',
            confidenceScore: arg.confidenceScore || 0.8,
            citations: arg.citations || [],
            order: index,
        })),
        conclusion: parsed.conclusion || existing.conclusion,
        overallStrength: calculateOverallStrength(parsed.arguments || []),
        coherenceScore: 0.85,
        completenessScore: 0.85,
        suggestions: parsed.suggestions || [],
    };
}

// ============================================
// Helper Functions
// ============================================

function calculateOverallStrength(arguments_: Partial<Argument>[]): 'strong' | 'moderate' | 'weak' {
    if (arguments_.length === 0) return 'weak';
    
    const strengthValues: Record<string, number> = {
        strong: 3,
        moderate: 2,
        weak: 1,
    };
    
    const total = arguments_.reduce((sum, a) => sum + (strengthValues[a.strength || 'moderate'] || 2), 0);
    const average = total / arguments_.length;
    
    if (average >= 2.5) return 'strong';
    if (average >= 1.5) return 'moderate';
    return 'weak';
}

// ============================================
// Handler
// ============================================

export const handler: Handler = async (event) => {
    const rawInput: ArgumentInputRaw = event.arguments || {};
    const input = parseInputFromRaw(rawInput);
    const mode = input.mode || 'generate';

    console.log('Argument generation request:', mode);

    try {
        switch (mode) {
            case 'generate':
                const outline = await generateArguments(input);
                return { success: true, outline };
                
            case 'counter':
                const counterArguments = await generateCounterArguments(input);
                return { success: true, counterArguments };
                
            case 'analyze':
                const analysis = await analyzeCoherence(input);
                return { success: true, analysis };
                
            case 'strengthen':
                const strengthened = await strengthenArgument(input);
                return { success: true, outline: strengthened };
                
            default:
                return { 
                    success: false, 
                    error: `Unknown mode: ${mode}` 
                };
        }
    } catch (error) {
        console.error('Error in argument generation:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

