import { defineFunction } from '@aws-amplify/backend';

export const auditLogger = defineFunction({
    name: 'audit-logger',
    entry: './handler.ts',
    runtime: 20,
    timeoutSeconds: 10,
    memoryMB: 256,
});

