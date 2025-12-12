import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { generateSuggestion } from '../functions/generate-suggestion/resource';


const schema = a.schema({
  Draft: a.model({
    userId: a.string().required(), // Explicit reference or rely on owner
    title: a.string(),
    content: a.string(), // HTML string from TipTap
    metadata: a.json(), // { jurisdiction, docType, opponent }
    intakeData: a.json(), // { clientGoal, keyFacts }
    status: a.string(), // 'draft', 'review', 'final'
  })
    .authorization((allow) => [
      allow.owner(), // Only the creator can read/update
      allow.group('Admins').to(['read']), // Admins can read all drafts for analytics
    ]),

  Template: a.model({
    category: a.string().required(), // e.g. 'Demand Letter'
    name: a.string(),
    skeletonContent: a.string(), // Base HTML
    defaultMetadata: a.json(),
  })
    .authorization((allow) => [
      allow.authenticated().to(['read']), // All signed-in users can read templates
      allow.group('Admins').to(['create', 'update', 'delete']), // Only admins manage them
    ]),

  UserProfile: a.model({
    email: a.string(),
    preferences: a.json(),
  })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // Analytics events for tracking usage
  AnalyticsEvent: a.model({
    eventType: a.string().required(), // 'document_created', 'ai_suggestion', 'suggestion_accepted', 'export'
    userId: a.string().required(),
    documentId: a.string(),
    metadata: a.json(), // Additional event data
  })
    .authorization((allow) => [
      allow.owner().to(['create', 'read']), // Users can create and read their own events
      allow.group('Admins').to(['read']), // Admins can read all events for analytics
    ]),

  // Custom Query to call Lambda
  askAI: a.query()
    .arguments({
      text: a.string(),
      context: a.json(),
    })
    .returns(a.json())
    .handler(a.handler.function(generateSuggestion))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
