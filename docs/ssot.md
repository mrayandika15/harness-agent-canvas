# AgentCanvas: Single Source of Truth (SSOT)

**Document Version:** 1.0
**Project Name:** harness agent canvas (Working Title)
**Status:** Active Draft

---

## Part 1: Product Requirements Document (PRD)

### 1.1 Product Overview
**AgentCanvas** is a visual orchestration platform that allows users to design and configure custom AI agents via a node-based interface, and instantly interact with them through a premium chat UI. It lowers the barrier to building complex, multi-step agentic workflows (harness flows) while leveraging powerful local AI execution and persistent memory.

**Primary Objective:** Provide a highly visual "layer" for agent configuration, bypassing cloud latency by executing locally, and unifying the interaction entirely within a top-tier chat experience.

### 1.2 Target Audience
* **Developers & AI Engineers:** Looking to rapidly prototype, visualize, and debug local agentic workflows without writing boilerplate orchestration code.
* **Product Managers/Tinkerers:** Wanting to design AI personas logically and test them immediately.

### 1.3 Core Features (MVP Scope)

**1. Visual Agent Builder (Harness Flow) & Customization**
The canvas defines the *execution steps and persona* of the agent. The flow is always initiated by user interaction in the chat.
* **Agent Personality Configuration:** A dedicated "System/Persona" node at the start of the flow to inject custom system prompts (dictating tone, expertise, boundaries).
* **Action Nodes:** Sequential or conditional steps (e.g., scrape data -> run local script -> format output).
* **Step Customization:** Deep-dive editing into any node to tweak scripts, prompts, or MCP tool parameters.

**2. Local AI Execution (CLI Integration)**
The platform acts as a visual interface for local AI models, completely bypassing cloud dependencies for the heavy lifting.
* **CLI Bridge:** Communicates with local AI subscriptions (Codex / Claude) via CLI commands.
* **Local Processing:** Ensures maximum privacy and leverages host hardware capabilities for zero-latency iterative testing.

**3. Memory Management (`claude-mem`)**
Agents maintain context across long sessions and multiple interactions natively.
* **Persistent Context:** Direct integration with `claude-mem` to store and retrieve past conversation context, preferences, and task results.
* **Memory Nodes:** Visual drag-and-drop nodes ("Read Memory" / "Write Memory") to dictate exactly when an agent should interact with the context database.

**4. Premium Chat Interface (The Primary Trigger)**
The core user experience and the sole trigger for visual agent flows.
* **Modern Aesthetic:** Deep dark modes, smooth typography, and highly polished micro-animations.
* **Real-time Flow Feedback:** Inline indicators or a mini-map show the agent's background processing state (e.g., "Thinking...", "Scraping UI...", "Querying Memory...").
* **Rich Artifact Rendering:** Custom React components render inside chat bubbles for code (syntax-highlighted), UI mockups, or JSON data tables.

---

## Part 2: Technical Requirements Document (TRD)

### 2.1 High-Level Architecture Overview
AgentCanvas operates on a hybrid architecture. A premium, highly reactive Next.js web UI handles the presentation, while a local Express.js daemon runs on the host machine to execute native CLI commands, manage local databases (for memory), and broker real-time WebSocket connections to the frontend.

### 2.2 Frontend Architecture (Presentation Layer)
* **Core Framework:** **Next.js (React)** handles routing and component architecture.
* **Visual Canvas Engine:** **React Flow** manages node drag-and-drop operations, edge connections, and localized canvas state.
* **Styling:** **Tailwind CSS** for utility-first, rapid development of the premium dark-mode aesthetic.
* **Animations:** **Framer Motion** controls micro-interactions, smooth UI transitions, and dynamic chat bubble rendering.
* **State Management:** **Zustand** synchronizes global UI state between the chat interface and the React Flow canvas instantly.

### 2.3 Backend Architecture (Orchestrator & CLI Bridge)
* **Core Server:** **Express.js (Node.js)** functions as the local daemon handling heavy orchestration, MCP routing, and local file system access.
* **Process Management:** **Node.js `child_process` (`exec` / `spawn`)** directly triggers local Claude or Codex CLI commands and captures standard I/O.
* **Real-time Communication:** **Socket.io / WebSockets** maintains a persistent connection with the frontend to stream real-time execution states (node activation, terminal logs).
* **Protocol Standard:** **`@modelcontextprotocol/sdk`** implements the MCP client to dynamically discover and execute tools mapped within the visual nodes.

### 2.4 Database & Authentication
* **Primary Infrastructure:** **Supabase**
  * **Database:** PostgreSQL stores user profiles, chat session logs, and complex JSON schemas representing the saved React Flow layouts.
  * **Authentication:** Supabase Auth for secure user login and session management.
  * **Real-time:** Supabase real-time subscriptions sync canvas changes across browser tabs.

### 2.5 AI & Memory Infrastructure
* **Execution Engine:** **Local CLI Subscriptions** run natively on the host machine to ensure fast execution and deep access to the local development environment.
* **Context & Memory Manager:** **`claude-mem`** integrates into the local execution path, utilizing its underlying SQLite store for lightning-fast reads/writes before passing prompts to the final LLM command.

### 2.6 Development & Deployment Strategy
* **Runtime & Package Manager:** **Bun** ensures incredibly fast dependency installation and rapid execution of the local backend workers.
* **Frontend Hosting:** **Vercel** hosts the Next.js application, providing a globally accessible UI.
* **Backend Hosting:** **Local Machine** runs the Express.js orchestrator locally to guarantee unrestricted access to the host's terminal and `claude-mem` directories.
