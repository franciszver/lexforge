# LexForge Development Approach

This document outlines the step-by-step plan for building LexForge, prioritizing "P0: Must-have" features and ensuring a solid architectural foundation before scaling.

## Phase 1: Foundation & Architecture Setup
**Goal:** Initialize the project structure and deployment pipeline.
1.  **Repo Setup:** Initialize React project (Vite) with strict TypeScript.
2.  **Design System:** Set up the core CSS architecture (variables for typography, colors, spacing) ensuring a premium, modern aesthetic.
3.  **Routing:** Configure routing (e.g., React Router) for key views:
    - Login/Auth
    - Dashboard (Project list)
    - Intake Wizard
    - Editor Workspace
    - Admin Console
4.  **Backend Skeleton:** Initialize AWS Amplify project.
    - Setup Auth (Cognito).
    - Setup Database (DynamoDB) schemas for Users, Drafts, and Templates.

## Phase 2: The Core Experience (Intake -> Editor)
**Goal:** Enable a user to start a draft and see the editor.
1.  **Guided Intake Flow:** Build the multi-step form for Jurisdiction, Practice Area, Doc Type, etc.
    - *Technical:* Persist state to local context or Redux toolkit.
2.  **Editor UI Layout:** Build the main workspace akin to Google Docs.
    - **Main:** Rich-text editor area (TipTap or similar headless editor recommended for extensibility).
    - **Sidebar:** Right-hand collapsible suggestion panel.
3.  **Template Engine:** Implement the logic to generate the "Starting Draft" based on Intake inputs.
    - Create the static versions of Templates A, B, C, D from the PRD.

## Phase 3: The "Smart" Layer (RAG & Suggestions)
**Goal:** Connect the editor to the RAG pipeline.
1.  **Suggestion Panel UI:** Create the interactive cards for suggestions (Precision, Tone, Sources).
2.  **RAG Service Integration:**
    - Develop AWS Lambda functions to handle drafting requests.
    - Integrate OpenAI/OpenRouter + Search IPs (Jina/Brave).
3.  **Editor Interaction:**
    - Highlight text in editor -> Trigger suggestion context.
    - "Accept" suggestion -> Insert text into editor.

## Phase 4: Admin & Management
**Goal:** Empower admins to manage the system.
1.  **Admin Console:** Build the dashboard for template management.
    - File upload/Form for new templates.
    - Tagging system (Jurisdiction, Area).
2.  **User Management:** Basic list view of users (Cognito integration).

## Phase 5: Persistence & Polish
**Goal:** Make it a usable product.
1.  **Save/Load:** Connect the Editor to DynamoDB to save drafts.
    - Auto-save functionality.
2.  **Word Export:** Implement `html-to-docx` or similar converter for specific file export.
3.  **Security Audit:** Ensure RLS (Row Level Security) on DynamoDB so users only see their drafts.

## Phase 6: Refinement (P1 Features)
1.  **Feedback Loop:** "Thumbs up/down" on suggestions.
2.  **Activity Stats:** Visualization of usage data on Admin dashboard.
