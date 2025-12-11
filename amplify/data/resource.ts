import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
