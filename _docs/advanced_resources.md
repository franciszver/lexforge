# LexForge Advanced Features: Resource Report

This document provides a comprehensive report on the resources utilized in LexForge's advanced features, including the rationale for each technology choice.

---

## Executive Summary

The advanced features build upon the existing MVP infrastructure while introducing specialized services for audit logging, contract drafting, and real-time collaboration. Resource selections prioritize:
- **Serverless-first architecture** for cost efficiency and scalability
- **AWS-native services** for seamless integration with existing Amplify stack
- **Industry-standard libraries** for complex features like real-time editing

---

## 1. Database Resources

### 1.1 Amazon DynamoDB (Extended)

**Current Usage:** Core data storage for Drafts, Templates, UserProfiles

**Extended Usage:** AuditLog, Clause, Citation, Comment, DocumentPresence, DocumentVersion, ChangeProposal tables

**Why DynamoDB:**
- **Consistency with MVP:** Already in use, avoiding multi-database complexity
- **Serverless scaling:** Automatically handles traffic spikes during collaboration sessions
- **Cost model:** Pay-per-request pricing ideal for variable audit log volumes
- **TTL support:** Critical for auto-expiring presence data (5-minute heartbeats) without manual cleanup
- **Streams:** Enable real-time triggers for audit aggregation without polling

**Alternatives Considered:**
| Alternative | Why Not Chosen |
|-------------|----------------|
| PostgreSQL (RDS) | Higher operational overhead, fixed capacity costs |
| MongoDB Atlas | Additional vendor, not AWS-native |
| Redis | No persistence guarantees for legal documents |

---

### 1.2 Amazon OpenSearch Service (Optional)

**Proposed Usage:** Full-text search for Clause Library

**Why OpenSearch:**
- **Advanced search:** Fuzzy matching, relevance scoring, and faceted search for legal clauses
- **Legal terminology:** Better handling of legal jargon and citation formats than DynamoDB scans

**Why Optional:**
- **Cost:** Minimum ~$50/month even for small instances
- **MVP alternative:** DynamoDB GSI queries sufficient for <1000 clauses
- **Recommendation:** Defer until clause library exceeds 500 items

---

## 2. Compute Resources

### 2.1 AWS Lambda (Extended)

**Current Usage:** `generate-suggestion` function for AI suggestions

**New Functions:**

| Function | Purpose | Why Lambda |
|----------|---------|------------|
| `audit-logger` | Process and store audit events | Event-driven, scales with user activity |
| `audit-aggregator` | Compute daily/weekly metrics | Scheduled, runs only when needed |
| `report-generator` | Generate compliance reports | On-demand, may run for minutes |
| `argument-generator` | AI-powered legal argument drafting | Stateless, integrates with OpenAI |
| `citation-formatter` | Format citations to legal styles | CPU-bound, benefits from parallel execution |
| `template-renderer` | Process template variables | Fast execution, sub-second response |
| `presence-manager` | Handle WebSocket presence | Real-time, needs low latency |
| `version-snapshot` | Create document versions | Triggered by save events |

**Why Lambda:**
- **Cost efficiency:** Pay only for execution time, not idle servers
- **Scaling:** Handles 1 to 10,000 concurrent users without configuration
- **Integration:** Native AppSync resolver support
- **Cold start mitigation:** Provisioned concurrency available if latency becomes an issue

**Configuration Rationale:**
- **Memory:** 512MB-1024MB for AI functions (OpenAI API calls), 256MB for simple CRUD
- **Timeout:** 30 seconds for AI, 10 seconds for standard operations
- **Runtime:** Node.js 20 for consistency with frontend TypeScript

---

### 2.2 AWS AppSync (Extended)

**Current Usage:** GraphQL API for CRUD operations

**Extended Usage:** Real-time subscriptions for collaboration

**Why AppSync for Real-Time:**
- **Built-in subscriptions:** WebSocket management handled by AWS
- **Authentication:** Cognito integration already configured
- **Filtering:** Server-side subscription filters prevent unauthorized data leakage
- **Caching:** Optional caching layer for frequently accessed data

**Subscription Use Cases:**
| Subscription | Purpose |
|--------------|---------|
| `onPresenceUpdate` | Show who's viewing a document |
| `onCursorMove` | Display collaborator cursors |
| `onCommentAdded` | Real-time comment notifications |
| `onContentChange` | Sync document edits (basic mode) |

---

## 3. Storage Resources

### 3.1 Amazon S3

**Proposed Usage:** 
- Compliance report storage
- Document export cache
- Large attachment storage (future)

**Why S3:**
- **Durability:** 99.999999999% (11 nines) for legal document compliance
- **Lifecycle policies:** Automatic archival to Glacier after 90 days
- **Presigned URLs:** Secure, time-limited download links for reports
- **Cost:** ~$0.023/GB/month for standard storage

**Bucket Configuration:**
- Versioning enabled for audit trail
- Server-side encryption (SSE-S3)
- Block public access
- CORS configured for frontend downloads

---

### 3.2 AWS Secrets Manager

**Current Usage:** OpenAI API key, Brave Search API key

**Extended Usage:** Additional API keys for advanced features

| Secret | Purpose |
|--------|---------|
| `lexforge/openai-api-key` | AI generation (existing) |
| `lexforge/brave-api-key` | Legal research (existing) |
| `lexforge/courtlistener-api-key` | Case law lookups (new) |

**Why Secrets Manager:**
- **Rotation:** Automatic key rotation without code changes
- **Audit:** CloudTrail logging of secret access
- **IAM integration:** Fine-grained access control per Lambda function
- **Cost:** $0.40/secret/month - minimal for security benefit

---

## 4. Monitoring & Operations

### 4.1 Amazon CloudWatch

**Usage:** Metrics, logs, alarms, dashboards

**Why CloudWatch:**
- **Native integration:** All AWS services automatically send metrics
- **Log Insights:** Query audit logs without separate tooling
- **Alarms:** Automated alerting for security events
- **Dashboards:** Visualize collaboration metrics, AI usage

**Key Metrics to Track:**
| Metric | Purpose | Alarm Threshold |
|--------|---------|-----------------|
| Lambda errors | Reliability | >5% error rate |
| DynamoDB throttling | Capacity | Any throttling |
| AppSync latency | Performance | p99 > 2 seconds |
| Subscription connections | Scale | >80% of limit |

---

### 4.2 Amazon EventBridge

**Proposed Usage:** Event routing for audit logging

**Why EventBridge:**
- **Decoupling:** Audit events processed asynchronously
- **Fan-out:** Single event triggers multiple consumers (log, aggregate, alert)
- **Scheduling:** Cron-based triggers for aggregation jobs
- **Filtering:** Route events by type without code changes

---

## 5. Third-Party Dependencies

### 5.1 Y.js (Real-Time Collaboration)

**Purpose:** Conflict-free replicated data type (CRDT) for concurrent editing

**Why Y.js:**
- **TipTap integration:** Official `@tiptap/extension-collaboration` uses Y.js
- **Offline support:** Changes sync when reconnected
- **Proven:** Used by Notion, Figma, and other collaborative tools
- **Open source:** MIT license, no vendor lock-in

**Alternatives Considered:**
| Alternative | Why Not Chosen |
|-------------|----------------|
| ShareDB (OT) | More complex server requirements |
| Automerge | Less mature TipTap integration |
| Firebase Realtime | Vendor lock-in, not AWS-native |

---

### 5.2 PDFKit

**Purpose:** Generate PDF compliance reports

**Why PDFKit:**
- **Programmatic:** Full control over layout (required for legal formatting)
- **No external services:** Runs entirely in Lambda
- **Lightweight:** ~2MB, fast cold starts

**Alternatives Considered:**
| Alternative | Why Not Chosen |
|-------------|----------------|
| Puppeteer | 50MB+ package size, slow Lambda cold starts |
| WeasyPrint | Python-based, requires separate runtime |
| External API | Data leaves AWS, compliance concern |

---

### 5.3 Handlebars

**Purpose:** Template rendering engine for advanced templates

**Why Handlebars:**
- **Logic-less:** Prevents code injection in templates
- **Familiar syntax:** `{{variable}}` is intuitive for admins
- **Helpers:** Extensible for legal-specific formatting
- **Lightweight:** <100KB, no performance impact

---

### 5.4 DOMPurify

**Purpose:** HTML sanitization for user-generated content

**Why DOMPurify:**
- **Security:** Industry standard for XSS prevention
- **Configurable:** Allow specific tags for rich text while blocking scripts
- **Performance:** Fast enough for real-time sanitization
- **Maintained:** Active security updates

---

## 6. External APIs

### 6.1 OpenAI API (Extended)

**Current Usage:** Suggestion generation

**Extended Usage:** 
- Argument generation for briefs
- Clause relevance scoring
- Document coherence analysis

**Why OpenAI:**
- **Quality:** GPT-4 provides highest quality legal text generation
- **Reliability:** 99.9% uptime SLA
- **Cost predictability:** Token-based pricing scales with usage

**Model Selection:**
| Use Case | Model | Rationale |
|----------|-------|-----------|
| Suggestions | GPT-4o-mini | Fast, cost-effective |
| Arguments | GPT-4o | Higher quality for complex reasoning |
| Analysis | GPT-4o | Needs full document context |

---

### 6.2 CourtListener API (New)

**Purpose:** Free case law lookups for citation verification

**Why CourtListener:**
- **Free tier:** Sufficient for MVP usage
- **Coverage:** Comprehensive US case law database
- **API quality:** RESTful, well-documented

**Limitations:**
- Rate limited (100 requests/hour free)
- US jurisdiction only
- Consider Westlaw/LexisNexis integration for enterprise

---

## 7. Cost Summary

### Development Phase
| Resource | Monthly Cost | Notes |
|----------|--------------|-------|
| DynamoDB | $5-10 | On-demand, minimal dev traffic |
| Lambda | $1-5 | Free tier covers most dev usage |
| S3 | $1-2 | Report storage |
| Secrets Manager | $2 | 4-5 secrets |
| CloudWatch | $5-10 | Logs and alarms |
| OpenAI API | $20-50 | Development testing |
| **Total** | **$35-80/month** | |

### Production (Small Team: 10 users)
| Resource | Monthly Cost |
|----------|--------------|
| DynamoDB | $15-30 |
| Lambda | $5-15 |
| AppSync | $10-20 |
| S3 | $5-10 |
| CloudWatch | $10-20 |
| OpenAI API | $50-100 |
| **Total** | **$95-195/month** |

### Production (Enterprise: 100+ users)
| Resource | Monthly Cost |
|----------|--------------|
| DynamoDB | $100-300 |
| Lambda | $50-150 |
| AppSync | $100-200 |
| S3 | $20-50 |
| OpenSearch | $100-200 |
| CloudWatch | $50-100 |
| OpenAI API | $500-1500 |
| **Total** | **$920-2500/month** |

---

## 8. Resource Dependencies

```
                    +------------------+
                    |    Cognito       |
                    | (Authentication) |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
        +-----+----+  +------+-----+  +----+------+
        |  AppSync |  |   Lambda   |  |    S3     |
        |  (API)   |  | (Compute)  |  | (Storage) |
        +-----+----+  +------+-----+  +-----------+
              |              |
              v              v
        +-----+----+  +------+-----+
        | DynamoDB |  |  Secrets   |
        |  (Data)  |  |  Manager   |
        +----------+  +------+-----+
                             |
                             v
                      +------+-----+
                      | OpenAI API |
                      | Brave API  |
                      +------------+
```

All resources depend on Cognito for authentication. Lambda functions access DynamoDB and external APIs via Secrets Manager for credentials.
