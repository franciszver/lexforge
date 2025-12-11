import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateSuggestion } from './functions/generate-suggestion/resource';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export const backend = defineBackend({
  auth,
  data,
  generateSuggestion,
});

// Add IAM permissions for Lambda to read from Secrets Manager
backend.generateSuggestion.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-west-2:*:secret:lexforge/openai-api-key*'],
  })
);
