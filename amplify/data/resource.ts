import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { generateSuggestion } from '../functions/generate-suggestion/resource';
import { generateArgument } from '../functions/generate-argument/resource';
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

  // ============================================
  // REAL-TIME COLLABORATION
  // ============================================

  // Presence tracking for documents
  DocumentPresence: a.model({
    documentId: a.string().required(),
    documentOwnerId: a.string().required(), // Owner of the document
    
    // User info
    userId: a.string().required(),
    userEmail: a.string(),
    userName: a.string(),
    userColor: a.string(),             // Assigned color for cursor/avatar
    
    // Presence state
    status: a.string().required(),     // 'viewing' | 'editing' | 'idle' | 'disconnected'
    lastHeartbeat: a.datetime().required(),
    
    // Cursor/selection position (for live cursors in future phases)
    cursorPosition: a.json(),          // { line, column } or null
    selectionRange: a.json(),          // { start: { line, col }, end: { line, col } } or null
    
    // Session info
    sessionId: a.string(),
    joinedAt: a.datetime().required(),
  })
    .secondaryIndexes((index) => [
      index('documentId').sortKeys(['lastHeartbeat']).name('documentId-heartbeat-index'),
      index('userId').sortKeys(['documentId']).name('userId-document-index'),
    ])
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
    ]),

  // Document sync state for conflict detection
  DocumentSyncState: a.model({
    documentId: a.string().required(),
    
    // Version tracking
    version: a.integer().required(),
    lastModifiedBy: a.string(),
    lastModifiedAt: a.datetime().required(),
    
    // Content hash for quick conflict detection
    contentHash: a.string(),
    
    // Lock state for editing
    lockedBy: a.string(),              // userId who has edit lock, or null
    lockExpiresAt: a.datetime(),       // Auto-expire locks
  })
    .identifier(['documentId'])
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update']),
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

  // ============================================
  // RTC-3: COMMENTS & VERSION HISTORY
  // ============================================

  // Document comments with thread support
  Comment: a.model({
    documentId: a.string().required(),
    
    // Thread grouping (null for root comments)
    threadId: a.string(),              // ID of the root comment for replies
    parentCommentId: a.string(),       // Direct parent for nested replies
    
    // Author info
    authorId: a.string().required(),
    authorName: a.string(),
    authorEmail: a.string(),
    
    // Content
    content: a.string().required(),    // Comment text (markdown supported)
    
    // Position in document (for anchored comments)
    anchorPosition: a.json(),          // { from: number, to: number } - TipTap/ProseMirror positions
    anchorText: a.string(),            // The selected text when comment was created
    
    // Status
    status: a.string().required(),     // 'active' | 'resolved' | 'deleted'
    resolvedBy: a.string(),            // userId who resolved
    resolvedAt: a.datetime(),
    
    // Metadata
    commentCreatedAt: a.datetime(),    // Explicit timestamp for sorting (createdAt is auto-generated)
    editedAt: a.datetime(),            // Last edit timestamp
    replyCount: a.integer().default(0), // Cached count for performance
  })
    .secondaryIndexes((index) => [
      index('documentId').sortKeys(['commentCreatedAt']).name('documentId-createdAt-index'),
      index('threadId').sortKeys(['commentCreatedAt']).name('threadId-createdAt-index'),
    ])
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read']),
      allow.owner().to(['update', 'delete']),
    ]),

  // Document version history for snapshots and rollback
  DocumentVersion: a.model({
    documentId: a.string().required(),
    
    // Version info
    versionNumber: a.integer().required(),
    
    // Content snapshot
    content: a.string().required(),    // Full document HTML at this version
    contentHash: a.string(),           // SHA-256 hash for comparison
    
    // Metadata snapshot
    title: a.string(),
    metadata: a.json(),                // Document metadata at this version
    
    // Author info
    createdBy: a.string().required(),
    createdByName: a.string(),
    
    // Change info
    changeType: a.string().required(), // 'auto_save' | 'manual_save' | 'before_ai_edit' | 'rollback' | 'merge'
    changeDescription: a.string(),     // User-provided or auto-generated description
    
    // Diff info (for efficient comparison)
    previousVersionId: a.string(),     // Reference to previous version
    diffFromPrevious: a.json(),        // Optional: JSON diff for storage efficiency
    
    // Size tracking
    contentLength: a.integer(),        // Character count
    wordCount: a.integer(),
    
    // Explicit timestamp for sorting
    versionCreatedAt: a.datetime(),    // Explicit timestamp (createdAt is auto-generated)
  })
    .secondaryIndexes((index) => [
      index('documentId').sortKeys(['versionNumber']).name('documentId-version-index'),
      index('documentId').sortKeys(['versionCreatedAt']).name('documentId-createdAt-index'),
    ])
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read']), // Collaborators can view versions
    ]),

  // Y.js document state for CRDT-based editing (RTC-3)
  // This stores the Y.js binary state for persistence
  YjsDocumentState: a.model({
    documentId: a.string().required(),
    
    // Y.js state
    yjsState: a.string(),              // Base64 encoded Y.js state vector
    yjsUpdate: a.string(),             // Base64 encoded latest update
    
    // Metadata
    lastModifiedBy: a.string(),
    lastModifiedAt: a.datetime().required(),
    
    // Sync info
    stateVector: a.string(),           // Base64 encoded state vector for sync
    clientCount: a.integer().default(0), // Number of connected clients
  })
    .identifier(['documentId'])
    .authorization((allow) => [
      allow.authenticated().to(['create', 'read', 'update']),
    ]),

  // Custom Query to call Lambda for suggestions
  askAI: a.query()
    .arguments({
      text: a.string(),
      context: a.json(),
    })
    .returns(a.json())
    .handler(a.handler.function(generateSuggestion))
    .authorization((allow) => [allow.authenticated()]),

  // Custom Query to generate legal arguments
  generateArguments: a.query()
    .arguments({
      mode: a.string().required(),     // 'generate' | 'counter' | 'analyze' | 'strengthen'
      facts: a.json(),                 // Array of facts
      keyFacts: a.json(),              // Array of key facts
      legalPrinciples: a.json(),       // Array of legal principles
      jurisdiction: a.string(),
      documentType: a.string(),
      practiceArea: a.string(),
      desiredOutcome: a.string(),
      clientPosition: a.string(),
      opposingArguments: a.json(),     // Array of known opposing arguments
      constraints: a.json(),           // Array of constraints
      tone: a.string(),                // 'aggressive' | 'moderate' | 'conservative'
      existingArgument: a.string(),    // For counter/analyze modes
      existingOutline: a.json(),       // For analyze/strengthen modes
    })
    .returns(a.json())
    .handler(a.handler.function(generateArgument))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
