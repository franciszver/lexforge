# LexForge Architecture & User Experience Map

This document details the high-level system architecture and maps the user journey to technical processes.

## 1. High-Level Architecture

LexForge utilizes a **Serverless Event-Driven Architecture** on AWS.

```mermaid
graph TD
    User[User / Client] -->|HTTPS| CloudFront[AWS CloudFront]
    CloudFront -->|Serve| S3[Hosting Bucket (React App)]
    
    User -->|Auth| Cognito[Amazon Cognito]
    
    User -->|API Calls| AppSync[AWS Amplify API / AppSync]
    
    subgraph "Backend Services"
        AppSync -->|Read/Write| DynamoDB[(DynamoDB Tables)]
        AppSync -->|Invoke| Lambda[Drafting & RAG Lambda]
    end
    
    subgraph "AI & External"
        Lambda -->|Generate| OpenAI[OpenAI API]
        Lambda -->|Search| Jina[Jina/Brave Search API]
    end
```

### Core Data Models (DynamoDB)
*   **UserTable:** `UserId` (PK), Email, Preferences.
*   **DraftTable:** `DraftId` (PK), `UserId` (SK), Content (JSON), Metadata (Jurisdiction, Type), CreatedAt.
*   **TemplateTable:** `TemplateId` (PK), Category, BaseContent.

---

## 2. Significant System Pathways

### Pathway A: Authentication & Session Start
1.  **Trigger:** User lands on login page.
2.  **Action:** Enters credentials.
3.  **System:**
    *   Amplify Auth SDK contacts Cognito.
    *   Cognito validates and returns functionality tokens (JWT).
    *   Client stores session securely.
    *   **Outcome:** User redirected to Dashboard.

### Pathway B: Intake to Draft Generation
This is the critical "cold start" for a document.
1.  **Trigger:** User completes Intake Wizard (Jurisdiction, Goal, Opponent).
2.  **Transition:** User clicks "Create Draft".
3.  **System:**
    *   Client gathers form data.
    *   Client identifies correct `TemplateID` (e.g., "Demand_Letter_Tort").
    *   Client instantiates a new local Draft Object merging Template Text + Intake Variables.
    *   (Async) API call to `createDraft` saves initial state to DynamoDB.
4.  **Outcome:** User lands in Editor with a pre-filled skeleton document.

### Pathway C: The RAG Suggestion Loop (The "Smart" Layer)
This pathway runs continuously or on-demand while drafting.
1.  **Trigger:** User selects text paragraph OR clicks "Get Suggestions".
2.  **Action:** Client sends `CurrentParagraph` + `IntakeMetadata` to Backend.
3.  **System:**
    *   **Lambda Worker:**
        1.  Extracts key legal terms (e.g., "breach of contract", "California").
        2.  **Search:** Queries Jina/Brave for *current* statutes/case law.
        3.  **Synthesis:** Sends Search Results + Draft Text to LLM (OpenAI).
        4.  **Formatting:** LLM returns structured JSON (Suggestion, Confidence Score, Source verification).
    *   Server responds to Client.
4.  **UI Update:** Suggestion Panel renders a new "Insight Card".
5.  **User Action:** User clicks "Accept".
6.  **Resolution:** Editor updates content; "Insight Card" marked as resolved.

---

## 3. User Experience (UX) Map

This section correlates the User's Journey with the underlying System State.

| Phase | User Action / Touchpoint | System Process | Data State |
| :--- | :--- | :--- | :--- |
| **1. Onboarding** | Log in via secure portal. | Auth verification (Cognito). | `Session: Active` |
| **2. Selection** | View Dashboard; Click "New Letter". | Fetch existing drafts list. | `GET /drafts` |
| **3. Intake** | Fill "Jurisdiction", "Practice Area", "Fact Pattern". | Local state collection. | `IntakeForm: { ...data }` |
| **4. Generation** | Click "Generate Draft". | **Template Engine:** Merges Form Data -> Skeleton Text. | `Draft: Created`, `DB: Persisted` |
| **5. Drafting** | User types in Editor (Google Docs style). | **Editor Engine:** TipTap captures keystrokes. | `LocalDraft: Dirty` |
| **6. Analysis** | User pauses or requests help. | **RAG Pipeline:** <br>1. Search External Law.<br>2. LLM Critique.<br>3. Return JSON. | `Suggestions: [Array]` |
| **7. Refinement** | User reviews "Tone Warning" card; clicks "Fix". | **Patch:** Text replacement in Editor. | `Draft: Updated` |
| **8. Export** | User clicks "Export to Word". | **Converter:** `html-to-docx` generates binary. | `File: downloaded` |

---

## 4. Key UX Principles Implemented
*   **Non-Blocking AI:** The RAG loop (Pathway C) must be asynchronous. The user can continue typing while the AI "thinks" in the sidebar.
*   **Transparency:** Every AI suggestion must cite a source (e.g., "According to Cal. Civil Code § 1798...").
*   **Control:** The user explicitly "Accepts" changes; the AI never overwrites text automatically.
