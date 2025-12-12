import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateSuggestion } from './functions/generate-suggestion/resource';
import { auditLogger } from './functions/audit-logger/resource';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export const backend = defineBackend({
  auth,
  data,
  generateSuggestion,
  auditLogger,
});

// Note: Advanced Security Features (advancedSecurityMode) removed because
// it requires Cognito PLUS pricing tier. The default ESSENTIALS tier
// does not support Threat Protection features.

// Add IAM permissions for Lambda to read from Secrets Manager
backend.generateSuggestion.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-west-2:*:secret:lexforge/openai-api-key*'],
  })
);
