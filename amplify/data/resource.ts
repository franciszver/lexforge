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

  // ============================================
  // CLAUSE LIBRARY
  // ============================================

  Clause: a.model({
    // Core fields
    title: a.string().required(),
    content: a.string().required(),        // HTML content of the clause
    description: a.string(),               // Brief description for search results
    
    // Categorization
    category: a.string().required(),       // e.g., 'Indemnification', 'Confidentiality', 'Termination'
    subcategory: a.string(),               // e.g., 'Mutual', 'One-way'
    tags: a.json(),                        // Array of tags for flexible categorization
    
    // Legal context
    jurisdiction: a.string(),              // e.g., 'Federal', 'California', 'New York'
    documentTypes: a.json(),               // Array of compatible doc types: ['Contract', 'NDA', 'Agreement']
    
    // Usage tracking
    usageCount: a.integer().default(0),    // Track popularity
    lastUsedAt: a.datetime(),
    
    // Variations for different contexts
    variations: a.json(),                  // [{ jurisdiction: 'CA', content: '...', notes: '...' }]
    
    // Metadata
    author: a.string(),                    // Who created it
    isPublished: a.boolean().default(true),
    isFavorite: a.boolean().default(false),
    notes: a.string(),                     // Internal notes for admins
    
    // Placeholders within the clause
    placeholders: a.json(),                // Reuse placeholder definitions from template system
  })
    .secondaryIndexes((index) => [
      index('category').sortKeys(['title']).name('category-title-index'),
      index('jurisdiction').sortKeys(['category']).name('jurisdiction-category-index'),
    ])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.group('Admins').to(['create', 'update', 'delete']),
    ]),

  // User's favorite/bookmarked clauses
  UserClauseFavorite: a.model({
    clauseId: a.string().required(),
    notes: a.string(),                     // User's personal notes about the clause
  })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ============================================
  // CITATION MANAGER
  // ============================================

  Citation: a.model({
    // Core identification
    title: a.string().required(),          // Case name or statute title (e.g., "Brown v. Board of Education")
    citation: a.string().required(),       // Full citation string (e.g., "347 U.S. 483 (1954)")
    
    // Citation type
    type: a.string().required(),           // 'case', 'statute', 'regulation', 'constitution', 'secondary', 'treaty'
    
    // Detailed fields for cases
    court: a.string(),                     // e.g., "Supreme Court of the United States", "9th Cir."
    year: a.integer(),                     // Year of decision
    volume: a.string(),                    // Reporter volume
    reporter: a.string(),                  // Reporter name (e.g., "U.S.", "F.3d", "Cal.App.4th")
    page: a.string(),                      // Starting page
    pinpoint: a.string(),                  // Specific page reference
    
    // Detailed fields for statutes/regulations
    jurisdiction: a.string(),              // e.g., "Federal", "California", "New York"
    codeTitle: a.string(),                 // e.g., "42 U.S.C.", "Cal. Civ. Code"
    section: a.string(),                   // Section number
    subdivision: a.string(),               // Subsection
    
    // Additional metadata
    shortForm: a.string(),                 // Short citation form (e.g., "Brown, 347 U.S. at 495")
    parenthetical: a.string(),             // Explanatory parenthetical
    url: a.string(),                       // Link to online source
    
    // Categorization
    category: a.string(),                  // Legal category (e.g., "Constitutional Law", "Contract Law")
    tags: a.json(),                        // Array of tags for flexible categorization
    
    // Usage tracking
    usageCount: a.integer().default(0),
    lastUsedAt: a.datetime(),
    
    // Metadata
    notes: a.string(),                     // Internal notes
    isVerified: a.boolean().default(false), // Has citation been verified
    createdBy: a.string(),
  })
    .secondaryIndexes((index) => [
      index('type').sortKeys(['title']).name('type-title-index'),
      index('jurisdiction').sortKeys(['type']).name('jurisdiction-type-index'),
      index('category').sortKeys(['title']).name('category-title-index'),
    ])
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update']),
      allow.group('Admins').to(['delete']),
    ]),

  // User's saved/bookmarked citations
  UserCitationFavorite: a.model({
    citationId: a.string().required(),
    notes: a.string(),                     // User's personal notes about the citation
  })
    .authorization((allow) => [
      allow.owner(),
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
