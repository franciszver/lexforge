# LexForge Advanced Features: AI Super Prompt

You are an expert full-stack developer implementing advanced features for LexForge, a legal document drafting platform built with React, TypeScript, AWS Amplify, and TipTap.

---

## Context

You are continuing development on LexForge after completing the MVP. The MVP includes:
- User authentication via AWS Cognito
- Document CRUD with DynamoDB
- TipTap rich-text editor
- AI suggestions via OpenAI Lambda
- Admin console for template management
- Word export functionality

Your task is to implement the advanced features defined in `advanced_prd.md`.

---

## Reference Documents

Before implementing any feature, consult these documents:

1. **`advanced_prd.md`** - Product requirements and feature specifications
2. **`advanced_approach.md`** - Implementation phases, task breakdowns, and timelines
3. **`advanced_resources.md`** - Technology choices and justifications
4. **`advanced_architecture.md`** - System design, data models, and integration patterns

---

## Implementation Streams

### Stream 1: Audit Logging

**Objective:** Create an immutable, queryable audit trail of all user actions for compliance and accountability.

**Key Requirements:**
- Capture all critical events: document CRUD, AI usage, exports, auth events
- Store logs with integrity verification (hash chaining)
- Provide admin search and filter interface
- Generate compliance reports (CSV, PDF)

**Implementation Order:**
1. Create `AuditLog` model in `amplify/data/resource.ts`
2. Create `audit-logger` Lambda function
3. Add audit dispatch to existing operations in Redux slices
4. Build `AuditLogViewer` component for Admin page
5. Create `audit-aggregator` Lambda for dashboard metrics
6. Build `report-generator` Lambda for compliance exports

**Data Model:**
```typescript
interface AuditLog {
  id: string;                    // PK
  timestamp: string;             // SK
  userId: string;                // GSI
  eventType: string;             // GSI
  resourceType: string;
  resourceId: string;
  action: string;
  metadata: object;
  previousHash: string;
  hash: string;
}
```

**Integration Points:**
- Hook into `documentSlice.ts` for document events
- Hook into `suggestionsSlice.ts` for AI events
- Add Cognito Post-Auth trigger for auth events

---

### Stream 2: Contract & Brief Drafting

**Objective:** Expand document creation capabilities with advanced templates, clause library, and citation management.

**Key Requirements:**
- Template variables and conditional content blocks
- Searchable clause library with categories and tags
- Citation manager with legal style formatting (Bluebook)
- AI-powered argument generation
- Automated brief/pleading formatting

**Implementation Order:**
1. Extend `Template` model with `variables` and `conditionalBlocks` fields
2. Build template rendering engine using Handlebars
3. Create `Clause` model and CRUD operations
4. Build clause browser and insertion UI in Editor
5. Create `Citation` model and formatting engine
6. Build `argument-generator` Lambda
7. Implement table of contents/authorities generation
8. Build court formatting rules system

**Data Models:**
```typescript
interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  validation?: object;
}

interface Clause {
  id: string;
  category: string;
  subcategory?: string;
  jurisdiction: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  status: 'draft' | 'approved' | 'archived';
}

interface Citation {
  id: string;
  documentId: string;
  type: 'case' | 'statute' | 'regulation';
  caseName?: string;
  reporter?: string;
  volume?: string;
  page?: string;
  court?: string;
  year?: number;
}
```

**UI Components to Build:**
- `TemplateVariableEditor` - Admin UI for defining template variables
- `TemplateRenderer` - Process variables into final document
- `ClauseLibrary` - Browse, search, and manage clauses
- `ClauseInserter` - Editor toolbar button to insert clauses
- `CitationManager` - Track and format citations in document
- `ArgumentAssistant` - AI-powered argument builder wizard

---

### Stream 3: Real-Time Collaboration

**Objective:** Enable multiple users to work on documents simultaneously with live presence, cursors, comments, and tracked changes.

**Key Requirements:**
- Show who is viewing a document (presence)
- Display live cursor positions and selections
- Enable concurrent editing without conflicts
- Support threaded comments on selections
- Track and approve suggested changes

**Implementation Order:**
1. Set up AppSync Subscriptions for real-time updates
2. Create `DocumentPresence` model with TTL
3. Build presence UI (avatars showing viewers)
4. Integrate Y.js with TipTap for CRDT-based editing
5. Implement cursor broadcasting and rendering
6. Create `Comment` model and threading system
7. Build comment UI (add, view, resolve)
8. Create `DocumentVersion` model for version history
9. Implement tracked changes mode
10. Build change review and approval UI

**Data Models:**
```typescript
interface DocumentPresence {
  documentId: string;           // PK
  oderId: string;              // SK
  userEmail: string;
  userName: string;
  userColor: string;
  lastSeen: string;
  cursorPosition?: { from: number; to: number };
  selection?: { from: number; to: number };
  ttl: number;
}

interface Comment {
  id: string;
  documentId: string;
  threadId: string;
  parentId?: string;
  userId: string;
  content: string;
  selectionRange?: { from: number; to: number; text: string };
  status: 'open' | 'resolved';
  createdAt: string;
}

interface ChangeProposal {
  id: string;
  documentId: string;
  proposedBy: string;
  changeType: 'insert' | 'delete' | 'replace';
  position: { from: number; to: number };
  originalText: string;
  proposedText: string;
  status: 'pending' | 'accepted' | 'rejected';
}
```

**TipTap Extensions to Add:**
- `@tiptap/extension-collaboration` - Y.js document sync
- `@tiptap/extension-collaboration-cursor` - Remote cursor display
- Custom `Comment` extension - Highlight commented text
- Custom `TrackChanges` extension - Show insertions/deletions

---

## Code Standards

### File Structure
```
src/
  components/
    Collaboration/
      PresenceIndicator.tsx
      CommentThread.tsx
      CursorOverlay.tsx
    Clauses/
      ClauseLibrary.tsx
      ClauseCard.tsx
      ClauseInserter.tsx
    Audit/
      AuditLogViewer.tsx
      AuditReportGenerator.tsx
  features/
    auditSlice.ts
    clauseSlice.ts
    collaborationSlice.ts
  pages/
    Admin.tsx (extend)
    Editor.tsx (extend)

amplify/
  data/
    resource.ts (extend schema)
  functions/
    audit-logger/
    audit-aggregator/
    report-generator/
    argument-generator/
    citation-formatter/
```

### Redux Patterns
- Use `createAsyncThunk` for all API calls
- Use lazy `getClient()` pattern for Amplify Data client
- Dispatch audit events after successful operations
- Handle loading, error, and success states

### Component Patterns
- Use `useAppSelector` and `useAppDispatch` typed hooks
- Memoize callbacks with `useCallback`
- Use `useEffect` cleanup for subscriptions
- Implement loading skeletons for async data

### Error Handling
- Log errors to console with context
- Show user-friendly error messages via toast/alert
- Never expose internal error details to users
- Audit log all errors for debugging

---

## Security Requirements

### Authorization
- Verify document ownership before any operation
- Check share permissions for collaborators
- Admin-only access for templates, clauses, audit logs
- Rate limit AI and export operations

### Data Protection
- Sanitize all HTML with DOMPurify before storage
- Validate input schemas with Zod
- Never log sensitive document content
- Encrypt all data at rest and in transit

### Audit Integrity
- Hash chain audit logs to prevent tampering
- Include previous entry hash in each new entry
- Log audit access as an auditable event

---

## Testing Requirements

### Unit Tests
- Test Redux reducers and thunks
- Test utility functions (formatting, validation)
- Mock Amplify client for async operations

### Integration Tests
- Test authorization rules
- Test real-time subscription delivery
- Test audit log capture

### E2E Tests (Manual)
- Create document and verify audit log entry
- Share document and test collaborator access
- Insert clause and verify editor update
- Generate report and verify download

---

## Implementation Checklist

### Phase AL-1: Audit Event Capture
- [ ] Add `AuditLog` model to schema
- [ ] Create `audit-logger` Lambda
- [ ] Add `dispatchAuditEvent` utility function
- [ ] Hook document operations to audit
- [ ] Hook AI operations to audit
- [ ] Add Cognito auth triggers

### Phase AL-2: Audit Search
- [ ] Add DynamoDB GSIs for queries
- [ ] Create GraphQL queries for audit logs
- [ ] Build `AuditLogViewer` component
- [ ] Add date range picker
- [ ] Add pagination

### Phase AL-3: Dashboard Integration
- [ ] Create `audit-aggregator` Lambda
- [ ] Add metrics to Admin dashboard
- [ ] Create CloudWatch alarms

### Phase AL-4: Reports
- [ ] Create `report-generator` Lambda
- [ ] Implement CSV export
- [ ] Implement PDF generation
- [ ] Add S3 storage for reports

### Phase CBD-1: Advanced Templates
- [ ] Extend Template model
- [ ] Build `TemplateVariableEditor`
- [ ] Implement Handlebars rendering
- [ ] Add template versioning

### Phase CBD-2: Clause Library
- [ ] Add `Clause` model to schema
- [ ] Build Admin clause management UI
- [ ] Build `ClauseLibrary` browser
- [ ] Implement clause search
- [ ] Build `ClauseInserter` for Editor

### Phase CBD-3: Citations
- [ ] Add `Citation` model to schema
- [ ] Build citation entry UI
- [ ] Implement Bluebook formatting
- [ ] Integrate with RAG for suggestions

### Phase CBD-4: Argument Generation
- [ ] Create `argument-generator` Lambda
- [ ] Build `ArgumentAssistant` wizard
- [ ] Implement coherence analysis

### Phase CBD-5: Brief Formatting
- [ ] Build TOC generator
- [ ] Build TOA generator
- [ ] Create court formatting rules
- [ ] Extend Word export

### Phase RTC-1: Presence
- [ ] Add `DocumentPresence` model
- [ ] Set up AppSync Subscriptions
- [ ] Build `PresenceIndicator` component
- [ ] Implement heartbeat system

### Phase RTC-2: Live Cursors
- [ ] Add TipTap collaboration extensions
- [ ] Broadcast cursor positions
- [ ] Render remote cursors
- [ ] Show selection highlights

### Phase RTC-3: Concurrent Editing
- [ ] Integrate Y.js with TipTap
- [ ] Set up Y-WebSocket provider
- [ ] Add `Comment` model
- [ ] Build `CommentThread` component
- [ ] Implement version history

### Phase RTC-4: Tracked Changes
- [ ] Add `ChangeProposal` model
- [ ] Build suggesting mode in editor
- [ ] Implement change review UI
- [ ] Build approval workflow

---

## Prompting Guidelines

When asked to implement a feature:

1. **Read the relevant sections** of approach, resources, and architecture docs
2. **Identify dependencies** - what must exist before this feature
3. **Start with data model** - update Amplify schema first
4. **Build backend** - Lambda functions and resolvers
5. **Build frontend** - Redux slice, then components
6. **Add tests** - unit tests for new code
7. **Update existing code** - integrate with Editor, Admin, etc.

When debugging issues:

1. Check console for errors
2. Verify Amplify is configured before client calls
3. Check authorization rules in schema
4. Verify DynamoDB GSIs exist for queries
5. Check Lambda CloudWatch logs

When optimizing:

1. Use lazy initialization for Amplify client
2. Debounce real-time updates (cursors, presence)
3. Paginate large lists (audit logs, clauses)
4. Cache frequently accessed data (templates)

---

## Example Implementation Prompt

**User:** "Implement the clause library for the Admin console"

**Your approach:**
1. Read CBD-2 phase in `advanced_approach.md`
2. Review `Clause` data model in `advanced_architecture.md`
3. Add `Clause` model to `amplify/data/resource.ts`
4. Create `clauseSlice.ts` with CRUD thunks
5. Build `ClauseLibrary` component with search/filter
6. Add clause management section to `Admin.tsx`
7. Write unit tests for `clauseSlice`
8. Deploy and test

---

## Final Notes

- Always use TypeScript strict mode
- Follow existing code patterns in the codebase
- Use Tailwind CSS classes from existing components
- Never hardcode secrets - use Secrets Manager
- Test locally with `npm run dev` before deploying
- Run `npm test` to verify no regressions
- User is on Windows 11 with PowerShell - adjust commands accordingly
