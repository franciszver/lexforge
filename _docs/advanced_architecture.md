# LexForge Advanced Features: Technical Architecture

This document provides detailed technical architecture for the advanced features, including system design, data models, and integration patterns.

---

## High-Level Architecture

```
+-----------------------------------------------------------------------------------+
|                                   CLIENT LAYER                                     |
+-----------------------------------------------------------------------------------+
|  React + Redux + TipTap                                                           |
|  +-------------+  +----------------+  +------------------+  +------------------+  |
|  | Auth Module |  | Document Editor|  | Collaboration    |  | Admin Console    |  |
|  | - Login     |  | - TipTap       |  | - Presence       |  | - Templates      |  |
|  | - Session   |  | - Y.js         |  | - Cursors        |  | - Clauses        |  |
|  +-------------+  | - Suggestions  |  | - Comments       |  | - Audit Logs     |  |
|                   +----------------+  +------------------+  | - Analytics      |  |
|                                                             +------------------+  |
+-----------------------------------------------------------------------------------+
                                        |
                                        | HTTPS / WebSocket
                                        v
+-----------------------------------------------------------------------------------+
|                                   API LAYER                                        |
+-----------------------------------------------------------------------------------+
|  AWS AppSync (GraphQL)                                                            |
|  +------------------+  +------------------+  +------------------+                  |
|  | Queries          |  | Mutations        |  | Subscriptions    |                  |
|  | - getDraft       |  | - createDraft    |  | - onPresenceUpdate                 |
|  | - listClauses    |  | - updateDraft    |  | - onCommentAdded                   |
|  | - searchAuditLog |  | - createComment  |  | - onContentChange                  |
|  | - getReport      |  | - logAuditEvent  |  | - onCursorMove                     |
|  +------------------+  +------------------+  +------------------+                  |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                                COMPUTE LAYER                                       |
+-----------------------------------------------------------------------------------+
|  AWS Lambda Functions                                                             |
|  +------------------+  +------------------+  +------------------+                  |
|  | AI Functions     |  | Audit Functions  |  | Collab Functions |                  |
|  | - generate-      |  | - audit-logger   |  | - presence-mgr   |                  |
|  |   suggestion     |  | - audit-         |  | - comment-       |                  |
|  | - argument-      |  |   aggregator     |  |   notifier       |                  |
|  |   generator      |  | - report-        |  | - version-       |                  |
|  | - citation-      |  |   generator      |  |   snapshot       |                  |
|  |   formatter      |  +------------------+  | - change-merger  |                  |
|  +------------------+                        +------------------+                  |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                                DATA LAYER                                          |
+-----------------------------------------------------------------------------------+
|  DynamoDB Tables                              S3 Buckets                          |
|  +------------------+  +------------------+  +------------------+                  |
|  | Core Tables      |  | Audit Tables     |  | Storage          |                  |
|  | - Draft          |  | - AuditLog       |  | - Reports        |                  |
|  | - Template       |  | - AuditAggregate |  | - Exports        |                  |
|  | - Clause         |  +------------------+  | - Attachments    |                  |
|  | - Citation       |                        +------------------+                  |
|  +------------------+  +------------------+                                        |
|                        | Collab Tables    |                                        |
|  +------------------+  | - DocumentPresence                                        |
|  | User Tables      |  | - Comment        |                                        |
|  | - UserProfile    |  | - DocumentVersion|                                        |
|  | - UserSettings   |  | - ChangeProposal |                                        |
|  +------------------+  +------------------+                                        |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                              EXTERNAL SERVICES                                     |
+-----------------------------------------------------------------------------------+
|  +------------------+  +------------------+  +------------------+                  |
|  | OpenAI API       |  | Brave Search     |  | CourtListener    |                  |
|  | - GPT-4          |  | - Legal research |  | - Case law       |                  |
|  | - Embeddings     |  +------------------+  +------------------+                  |
|  +------------------+                                                              |
+-----------------------------------------------------------------------------------+
```

---

## Stream 1: Audit Logging Architecture

### Event Flow

```
+-------------+     +-------------+     +-------------+     +-------------+
|   Client    | --> |   AppSync   | --> |   Lambda    | --> |  DynamoDB   |
| (dispatch)  |     |  (resolver) |     | (audit-log) |     | (AuditLog)  |
+-------------+     +-------------+     +-------------+     +-------------+
                                              |
                                              v
                                        +-------------+
                                        | CloudWatch  |
                                        |   Metrics   |
                                        +-------------+
```

### AuditLog Table Design

```typescript
interface AuditLog {
  id: string;                    // UUID, Partition Key
  timestamp: string;             // ISO 8601, Sort Key
  userId: string;                // GSI: userId-timestamp-index
  userEmail: string;             // For display
  eventType: AuditEventType;     // GSI: eventType-timestamp-index
  resourceType: ResourceType;    // 'draft', 'template', 'clause', etc.
  resourceId: string;            // GSI: resourceId-timestamp-index
  action: string;                // 'create', 'update', 'delete', 'view', etc.
  metadata: {
    before?: object;             // State before change (for updates)
    after?: object;              // State after change
    additionalInfo?: object;     // Extra context
  };
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  ttl?: number;                  // Optional TTL for auto-cleanup
}

type AuditEventType = 
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'DOCUMENT_CREATE'
  | 'DOCUMENT_UPDATE'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_EXPORT'
  | 'DOCUMENT_SHARE'
  | 'AI_SUGGESTION_GENERATED'
  | 'AI_SUGGESTION_ACCEPTED'
  | 'AI_SUGGESTION_REJECTED'
  | 'TEMPLATE_CREATE'
  | 'TEMPLATE_UPDATE'
  | 'CLAUSE_INSERT'
  | 'COMMENT_ADD'
  | 'COMMENT_RESOLVE';
```

### Aggregation Pipeline

```
+-------------+     +-------------+     +-------------+     +-------------+
|  DynamoDB   | --> | EventBridge | --> |   Lambda    | --> |  DynamoDB   |
| (AuditLog)  |     |  (schedule) |     | (aggregate) |     | (Aggregate) |
+-------------+     +-------------+     +-------------+     +-------------+
                    (hourly/daily)            |
                                              v
                                        +-------------+
                                        |    Admin    |
                                        |  Dashboard  |
                                        +-------------+
```

### Report Generation Flow

```
+-------------+     +-------------+     +-------------+     +-------------+
|    Admin    | --> |   AppSync   | --> |   Lambda    | --> |     S3      |
| (request)   |     |   (query)   |     | (report-gen)|     |  (reports)  |
+-------------+     +-------------+     +-------------+     +-------------+
                                              |
                                              v
                                        +-------------+
                                        |  Presigned  |
                                        |    URL      |
                                        +-------------+
```

---

## Stream 2: Contract & Brief Drafting Architecture

### Template Rendering Engine

```
+------------------+
|  Template Input  |
| - skeletonContent|
| - variables      |
| - conditionalBlocks
+--------+---------+
         |
         v
+------------------+
| Variable Parser  |
| - Extract {{vars}}
| - Validate schema|
+--------+---------+
         |
         v
+------------------+
| Condition Engine |
| - Evaluate {{#if}}
| - Process loops  |
+--------+---------+
         |
         v
+------------------+
| HTML Renderer    |
| - Substitute vals|
| - Clean output   |
+--------+---------+
         |
         v
+------------------+
|  Rendered Draft  |
+------------------+
```

### Template Variable Schema

```typescript
interface TemplateVariable {
  name: string;                  // Variable identifier
  label: string;                 // Display label
  type: 'text' | 'date' | 'number' | 'select' | 'multiselect' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];  // For select types
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;            // Regex
    min?: number;                // For numbers
    max?: number;
  };
  helpText?: string;
}

interface ConditionalBlock {
  id: string;
  condition: {
    variable: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
  };
  content: string;               // HTML content to include if condition is true
  elseContent?: string;          // Content if condition is false
}
```

### Clause Library Architecture

```
+------------------+     +------------------+     +------------------+
|    Admin UI      | --> |     AppSync      | --> |    DynamoDB      |
| - Create clause  |     |  - createClause  |     |   Clause Table   |
| - Tag clause     |     |  - updateClause  |     |                  |
| - Categorize     |     |  - deleteClause  |     +--------+---------+
+------------------+     +------------------+              |
                                                          |
+------------------+     +------------------+              |
|    Editor UI     | --> |     AppSync      | <-----------+
| - Browse clauses |     |  - listClauses   |
| - Search clauses |     |  - searchClauses |
| - Insert clause  |     +------------------+
+------------------+
         |
         v
+------------------+
|  TipTap Editor   |
| - Insert at cursor
+------------------+
```

### Clause Data Model

```typescript
interface Clause {
  id: string;                    // UUID, Partition Key
  category: string;              // GSI: category-index
  subcategory?: string;
  jurisdiction: string;          // GSI: jurisdiction-index
  title: string;
  description: string;
  content: string;               // HTML
  tags: string[];                // For search
  variables?: TemplateVariable[]; // Optional clause variables
  usageCount: number;            // Analytics
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'approved' | 'archived';
}

// Categories
const CLAUSE_CATEGORIES = [
  'Indemnification',
  'Limitation of Liability',
  'Confidentiality',
  'Termination',
  'Force Majeure',
  'Dispute Resolution',
  'Intellectual Property',
  'Representations & Warranties',
  'Payment Terms',
  'Governing Law',
];
```

### Citation Formatting Engine

```
+------------------+
|  Citation Input  |
| - Raw citation   |
| - Citation type  |
+--------+---------+
         |
         v
+------------------+
| Citation Parser  |
| - Extract parts  |
| - Normalize data |
+--------+---------+
         |
         v
+------------------+
| Style Formatter  |
| - Apply Bluebook |
| - Apply ALWD     |
+--------+---------+
         |
         v
+------------------+
| Formatted Output |
| - Full citation  |
| - Short form     |
| - Id. form       |
+------------------+
```

### Citation Data Model

```typescript
interface Citation {
  id: string;
  documentId: string;            // GSI: documentId-index
  type: 'case' | 'statute' | 'regulation' | 'book' | 'article' | 'website';
  // Case-specific
  caseName?: string;
  reporter?: string;
  volume?: string;
  page?: string;
  court?: string;
  year?: number;
  // Statute-specific
  title?: string;
  section?: string;
  code?: string;
  // Common
  url?: string;
  accessDate?: string;
  pinpoint?: string;             // Specific page/paragraph
  parenthetical?: string;        // Explanatory parenthetical
  createdAt: string;
}

interface FormattedCitation {
  full: string;                  // Full citation
  short: string;                 // Short form
  id: string;                    // Id. form
  supra: string;                 // Supra form
}
```

---

## Stream 3: Real-Time Collaboration Architecture

### Presence System

```
+-------------+                           +-------------+
|   User A    |                           |   User B    |
+------+------+                           +------+------+
       |                                         |
       v                                         v
+------+------+                           +------+------+
| Heartbeat   |                           | Heartbeat   |
| (5 sec)     |                           | (5 sec)     |
+------+------+                           +------+------+
       |                                         |
       +------------+                +-----------+
                    |                |
                    v                v
              +-----+----------------+-----+
              |        AppSync             |
              |   DocumentPresence Sub     |
              +-----+----------------+-----+
                    |                |
       +------------+                +-----------+
       |                                         |
       v                                         v
+------+------+                           +------+------+
|   User A    |                           |   User B    |
| sees B's    |                           | sees A's    |
| presence    |                           | presence    |
+-------------+                           +-------------+
```

### Presence Data Model

```typescript
interface DocumentPresence {
  documentId: string;            // Partition Key
  oderId: string;               // Sort Key
  userEmail: string;
  userName: string;
  userColor: string;             // For cursor/selection color
  lastSeen: string;              // ISO timestamp
  cursorPosition?: {
    from: number;
    to: number;
  };
  selection?: {
    from: number;
    to: number;
  };
  isTyping: boolean;
  ttl: number;                   // Auto-expire stale presence
}
```

### Y.js Integration Architecture

```
+------------------+                    +------------------+
|    Browser A     |                    |    Browser B     |
+--------+---------+                    +--------+---------+
         |                                       |
         v                                       v
+--------+---------+                    +--------+---------+
|  TipTap Editor   |                    |  TipTap Editor   |
|  + Y.js Doc      |                    |  + Y.js Doc      |
+--------+---------+                    +--------+---------+
         |                                       |
         v                                       v
+--------+---------+                    +--------+---------+
| Y-WebSocket      |                    | Y-WebSocket      |
| Provider         |                    | Provider         |
+--------+---------+                    +--------+---------+
         |                                       |
         +---------------+       +---------------+
                         |       |
                         v       v
                   +-----+-------+-----+
                   |   Y-WebSocket     |
                   |     Server        |
                   | (Lambda/Fargate)  |
                   +-----+-------------+
                         |
                         v
                   +-----+-------------+
                   |    DynamoDB       |
                   | (Document State)  |
                   +-------------------+
```

### Comment System Architecture

```typescript
interface Comment {
  id: string;                    // UUID, Partition Key
  documentId: string;            // GSI: documentId-index
  threadId: string;              // GSI: threadId-index (for replies)
  parentId?: string;             // Parent comment (for threading)
  userId: string;
  userEmail: string;
  userName: string;
  content: string;               // Markdown supported
  selectionRange?: {
    from: number;
    to: number;
    text: string;                // Selected text for reference
  };
  status: 'open' | 'resolved' | 'archived';
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  mentions?: string[];           // User IDs mentioned
}
```

### Version Control Architecture

```
+------------------+
|   User Saves     |
+--------+---------+
         |
         v
+--------+---------+
| Version Snapshot |
| Lambda           |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+---+---+ +---+--------+
| Draft | | Document   |
| Table | | Version    |
+-------+ | Table      |
          +------------+
```

### DocumentVersion Data Model

```typescript
interface DocumentVersion {
  documentId: string;            // Partition Key
  version: number;               // Sort Key
  content: string;               // Full document content
  title: string;
  metadata: object;
  createdBy: string;
  createdAt: string;
  changeDescription?: string;
  changeType: 'manual' | 'autosave' | 'merge' | 'restore';
  parentVersion?: number;        // For branching
}
```

### Tracked Changes Architecture

```typescript
interface ChangeProposal {
  id: string;                    // UUID, Partition Key
  documentId: string;            // GSI: documentId-status-index
  proposedBy: string;
  proposedByName: string;
  changeType: 'insert' | 'delete' | 'replace';
  position: {
    from: number;
    to: number;
  };
  originalText: string;
  proposedText: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
}
```

---

## Integration Points

### Audit Logging Integration

Every action that modifies data should dispatch an audit event:

```typescript
// Example: Document creation with audit logging
async function createDocumentWithAudit(data: CreateDocumentInput) {
  const document = await createDocument(data);
  
  await dispatchAuditEvent({
    eventType: 'DOCUMENT_CREATE',
    resourceType: 'draft',
    resourceId: document.id,
    action: 'create',
    metadata: {
      after: document,
    },
  });
  
  return document;
}
```

### AI Integration with Clauses

The AI suggestion engine should be aware of the clause library:

```typescript
// Enhanced AI context
interface AIContext {
  documentContent: string;
  jurisdiction: string;
  docType: string;
  // New: Include relevant clauses
  availableClauses: {
    id: string;
    title: string;
    category: string;
    relevanceScore: number;
  }[];
}
```

### Collaboration with Audit

Collaboration events feed into audit logging:

```typescript
// Comment added -> Audit log
onCommentAdded((comment) => {
  dispatchAuditEvent({
    eventType: 'COMMENT_ADD',
    resourceType: 'comment',
    resourceId: comment.id,
    action: 'create',
    metadata: {
      documentId: comment.documentId,
      threadId: comment.threadId,
    },
  });
});
```

---

## Security Considerations

### Data Access Patterns

| Data | Owner Access | Admin Access | Collaborator Access |
|------|--------------|--------------|---------------------|
| Draft | Full CRUD | Read | Read/Write (if shared) |
| AuditLog | Read own | Full Read | None |
| Comment | Full CRUD | Read | Read/Write |
| Clause | Read | Full CRUD | Read |
| Template | Read | Full CRUD | Read |
| Presence | Read | Read | Read (same doc) |

### AppSync Authorization

```graphql
type AuditLog @model
  @auth(rules: [
    { allow: owner, operations: [read] }
    { allow: groups, groups: ["Admins"], operations: [read] }
  ]) {
  id: ID!
  timestamp: AWSDateTime!
  userId: String!
  eventType: String!
  # ...
}

type Comment @model
  @auth(rules: [
    { allow: owner }
    { allow: groups, groups: ["Admins"], operations: [read, delete] }
    # Collaborators handled via custom resolver
  ]) {
  id: ID!
  documentId: String!
  # ...
}
```

### Encryption

| Data | At Rest | In Transit |
|------|---------|------------|
| AuditLog | DynamoDB encryption | HTTPS |
| Comments | DynamoDB encryption | HTTPS/WSS |
| Reports (S3) | SSE-S3 | HTTPS |
| Document Content | DynamoDB encryption | HTTPS/WSS |

