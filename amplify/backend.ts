import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { generateSuggestion } from './functions/generate-suggestion/resource';

defineBackend({
  auth,
  data,
  generateSuggestion,
});
