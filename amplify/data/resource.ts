import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { generateSuggestion } from '../functions/generate-suggestion/resource';
import { auditLogger } from '../functions/audit-logger/resource';


const schema = a.schema({
  // ============================================
  // AUDIT LOGGING
  // ============================================
  
  AuditLog: a.model({
    // Core fields
    timestamp: a.datetime().required(),
    userId: a.string().required(),
    userEmail: a.string(),
    
    // Event classification
    eventType: a.string().required(), // AUTH_LOGIN, DOCUMENT_CREATE, AI_SUGGESTION_GENERATED, etc.
    action: a.string().required(),    // create, read, update, delete, export, etc.
    
    // Resource identification
    resourceType: a.string(),         // draft, template, clause, etc.
    resourceId: a.string(),
    
    // Context
    metadata: a.json(),               // Event-specific data (before/after states, etc.)
    
    // Client info
    ipAddress: a.string(),
    userAgent: a.string(),
    sessionId: a.string(),
    
    // Integrity (hash chaining)
    previousHash: a.string(),
    hash: a.string(),
  })
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['timestamp']).name('userId-timestamp-index'),
      index('eventType').sortKeys(['timestamp']).name('eventType-timestamp-index'),
      index('resourceId').sortKeys(['timestamp']).name('resourceId-timestamp-index'),
    ])
    .authorization((allow) => [
      allow.authenticated().to(['create']), // All users can create audit entries
      allow.owner().to(['read']),           // Users can read their own entries
      allow.group('Admins').to(['read']),   // Admins can read all entries
    ]),

  // Custom mutation to log audit events via Lambda (for hash chaining)
  logAuditEvent: a.mutation()
    .arguments({
      eventType: a.string().required(),
      action: a.string().required(),
      resourceType: a.string(),
      resourceId: a.string(),
      metadata: a.json(),
    })
    .returns(a.ref('AuditLog'))
    .handler(a.handler.function(auditLogger))
    .authorization((allow) => [allow.authenticated()]),

  // ============================================
  // CORE MODELS
  // ============================================

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
    skeletonContent: a.string(), // Base HTML with {{placeholder}} syntax
    defaultMetadata: a.json(),
    
    // Enhanced template fields
    placeholders: a.json(), // Array of placeholder definitions: [{ name, type, label, required, defaultValue, options }]
    sections: a.json(),     // Array of section definitions: [{ id, name, order, content, isRequired }]
    variables: a.json(),    // Default variable values and types: { variableName: { type, defaultValue, validation } }
    
    // Versioning
    version: a.integer().default(1),
    isPublished: a.boolean().default(false),
    publishedAt: a.datetime(),
    parentTemplateId: a.string(), // Reference to original template for version tracking
  })
    .authorization((allow) => [
      allow.authenticated().to(['read']), // All signed-in users can read templates
      allow.group('Admins').to(['create', 'update', 'delete']), // Only admins manage them
    ]),

  // Template versions for history tracking
  TemplateVersion: a.model({
    templateId: a.string().required(),
    version: a.integer().required(),
    name: a.string(),
    category: a.string(),
    skeletonContent: a.string(),
    placeholders: a.json(),
    sections: a.json(),
    variables: a.json(),
    createdBy: a.string(),
    changeNotes: a.string(),
  })
    .secondaryIndexes((index) => [
      index('templateId').sortKeys(['version']).name('templateId-version-index'),
    ])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('Admins').to(['create', 'update', 'delete']),
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
