import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateSuggestion } from './functions/generate-suggestion/resource';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { CfnUserPool } from 'aws-cdk-lib/aws-cognito';

export const backend = defineBackend({
  auth,
  data,
  generateSuggestion,
});

// Get the underlying Cognito User Pool CFN resource
const cfnUserPool = backend.auth.resources.cfnResources.cfnUserPool as CfnUserPool;

// Enable Advanced Security Features with AUDIT mode (lower cost than ENFORCED)
// This allows more lenient rate limiting and better monitoring
cfnUserPool.userPoolAddOns = {
  advancedSecurityMode: 'AUDIT',
};

// Add IAM permissions for Lambda to read from Secrets Manager
backend.generateSuggestion.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-west-2:*:secret:lexforge/openai-api-key*'],
  })
);
