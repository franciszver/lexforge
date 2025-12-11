# LexForge Resources & Tech Stack

This document outlines the specific technologies, libraries, and services chosen for LexForge. Decisions are based on the requirements defined in **[prd.md](./prd.md)** and the phased execution plan in **[approach.md](./approach.md)**.

## 1. Frontend & Client-Side

### **Framework:** React (via Vite)
*   **Decision:** Use the latest React version initialized with Vite.
*   **Reasoning:**
    *   **Performance:** Vite provides significantly faster hot-reload and build times compared to CRA or Webpack.
    *   **Ecosystem:** React has the widest library support for required features (rich text editors, drag-and-drop).
    *   **Alignment:** Supports the "Google Docs-style" single-page application experience required in the PRD.

### **Language:** TypeScript
*   **Decision:** Strict TypeScript configuration.
*   **Reasoning:**
    *   **Robustness:** Legal applications require strict data contracts (inputs/outputs). TypeScript ensures the data structure for "Letter Templates" is strictly adhered to across the app.
    *   **Maintenance:** Reduces runtime errors and improves code discoverability for future developers.

### **Styling:** Vanilla CSS + CSS Variables
*   **Decision:** No heavy UI frameworks (Bootstrap/MUI); pure CSS with variables.
*   **Reasoning:**
    *   **Aesthetics:** Fulfills the "Premium Design" requirement. Custom CSS allows for exact control over typography, spacing, and glassmorphism effects without fighting framework defaults.
    *   **Performance:** Lightweight bundle size.

### **Editor Engine:** TipTap (ProseMirror wrapper)
*   **Decision:** Headless rich-text editor framework.
*   **Reasoning:**
    *   **Requirement Match:** The PRD explicitly calls for a "Google Docs-style editor" with a "suggestion panel."
    *   **Extensibility:** TipTap is headless, meaning we can build the custom "Suggestion Cards" and "Text Highlighting" interactions directly into the editor view, which is difficult with rigid component-based editors like Quill or Draft.js.

### **Export:** `html-to-docx`
*   **Decision:** Client-side library to convert HTML content to `.docx`.
*   **Reasoning:**
    *   **P0 Requirement:** "Export to Word format" is a P0 requirement.
    *   **Reliability:** Generates compatible Word files preserving basic formatting without needing a dedicated backend conversion service.

---

## 2. Backend & Cloud Infrastructure (AWS)

### **Platform:** AWS Amplify (Gen 2)
*   **Decision:** Serverless hosting and backend scaffolding.
*   **Reasoning:**
    *   **Architecture:** The PRD mandates a "Serverless-first design." Amplify Gen 2 provides code-first application infrastructure, allowing us to define auth and data models in TypeScript.
    *   **Speed:** Handles CI/CD pipelines (connected to GitHub) out of the box.

### **Authentication:** Amazon Cognito (via Amplify Auth)
*   **Decision:** Managed user directory.
*   **Reasoning:**
    *   **Security:** Meets the "End-to-end encryption" and "password-protected" Admin Console requirements without building custom auth logic.
    *   **Scalability:** Supports millions of users if the app scales, addressing the "Growth" non-functional requirement.

### **Database:** Amazon DynamoDB
*   **Decision:** NoSQL Key-Value database.
*   **Reasoning:**
    *   **Data Model:** The "Draft" schema is variable (different letter types have different metadata). A schema-less NoSQL database fits this modular template design better than a rigid SQL schema.
    *   **Performance:** Single-digit millisecond latency for loading drafts.

### **Compute:** AWS Lambda
*   **Decision:** Serverless functions.
*   **Reasoning:**
    *   **Cost & Scale:** We only pay when a user requests an AI suggestion. This fits the "MVP does not require scale" but "supports future growth" requirement.

---

## 3. Artificial Intelligence & RAG

### **Text Generation (LLM):** OpenAI API / OpenRouter
*   **Decision:** Use advanced models (e.g., GPT-4o or similar) via standard APIs.
*   **Reasoning:**
    *   **Quality:** Legal drafting requires high adherence to "tone" and "precision" (PRD Goals). Larger models currently outperform smaller open-weights models for this nuanced instruction following.

### **Search & Retrieval:** Jina API / Brave Search
*   **Decision:** Ephemeral search APIs.
*   **Reasoning:**
    *   **Freshness:** The PRD requires the RAG corpus to be "fresh per intake session." Instead of maintaining a stale vector database of all US law (expensive/impossible), we scan live URLs for specific statutes/cases relevant to the current session.

---

## 4. Development Tools

*   **Package Manager:** `npm` (Standard stability)
*   **State Management:** `Redux Toolkit` (Chosen for reliable handling of complex "Draft" + "Suggestion" synchronous state).
*   **Icons:** `Lucide React` (Clean, modern SVG icons that fit the "Premium" aesthetic).
