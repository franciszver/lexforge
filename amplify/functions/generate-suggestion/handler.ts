import type { Handler } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-west-2' });

// Cache the API key to avoid repeated Secrets Manager calls
let cachedApiKey: string | null = null;

async function getOpenAIApiKey(): Promise<string> {
    if (cachedApiKey) {
        return cachedApiKey;
    }

    try {
        const secretName = process.env.OPENAI_API_KEY_SECRET_NAME || 'lexforge/openai-api-key';
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const response = await secretsClient.send(command);
        cachedApiKey = response.SecretString || '';
        return cachedApiKey;
    } catch (error) {
        console.error('Error fetching OpenAI API key from Secrets Manager:', error);
        throw error;
    }
}

export const handler: Handler = async (event) => {
    const { text, context } = event.arguments || {};

    console.log('Received drafting request:', text);

    try {
        // Fetch OpenAI API key from Secrets Manager
        const apiKey = await getOpenAIApiKey();

        // TODO: Implement full RAG pipeline:
        // 1. Call Jina Search API here for 'context.jurisdiction'
        // 2. Then call OpenAI with search results + text
        // For now, using mock data

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate latency

        return {
            suggestions: [
                {
                    id: crypto.randomUUID(),
                    type: 'tone',
                    text: 'This language may be too informal for a Demand Letter in New York.',
                    replacementText: 'We formally request immediate remuneration...',
                    confidence: 0.85,
                    source: 'NY Bar Association Guidelines'
                },
                {
                    id: crypto.randomUUID(),
                    type: 'precision',
                    text: 'Specify the exact date of the breach to strengthen the claim.',
                    confidence: 0.92,
                    source: 'Precedent: Smith v. Jones (2019)'
                }
            ]
        };
    } catch (error) {
        console.error('Error in generate-suggestion handler:', error);
        throw error;
    }
};
