import { defineFunction } from '@aws-amplify/backend';

export const generateSuggestion = defineFunction({
    name: 'generate-suggestion',
    entry: './handler.ts',
    environment: {
        OPENAI_API_KEY_SECRET_NAME: 'lexforge/openai-api-key',
    },
    runtime: 20,
    timeoutSeconds: 30,
});
