import { defineFunction } from '@aws-amplify/backend';

export const generateArgument = defineFunction({
    name: 'generate-argument',
    entry: './handler.ts',
    runtime: 20,
    timeoutSeconds: 60, // Longer timeout for complex argument generation
    memoryMB: 512,
    environment: {
        OPENAI_API_KEY_SECRET_NAME: 'lexforge/openai-api-key',
    },
});

