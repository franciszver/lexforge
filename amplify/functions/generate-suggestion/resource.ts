import { defineFunction } from '@aws-amplify/backend';

export const generateSuggestion = defineFunction({
    name: 'generate-suggestion',
    entry: './handler.ts',
    environment: {
        OPENAI_API_KEY: 'mock-key', // In prod, this would be a secret
    }
});
