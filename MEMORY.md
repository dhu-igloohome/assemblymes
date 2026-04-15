# Project Memory: assemblymes

## 🏗️ Technical Decisions
| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-04-15 | **Industrial-Grade Transformation** | Evolve from prototype to factory-ready MES based on AI Expert feedback. | In Progress |
| 2026-04-15 | **Real-time Monitoring (5s Polling)** | Factory floor needs real-time feedback without manual refresh for Dashboard & Andon. | Implemented |
| 2026-04-15 | **Deep BOM-based MRP** | Simple inventory check was insufficient; production needs recursive component shortage analysis. | Implemented |
| 2026-04-15 | **Global Scanner Integration** | Factory workers use barcode scanners; global key listening allows keyboard-free operation. | Implemented |
| 2026-04-15 | **RBAC Implementation** | Security requirement to isolate Costing, Planning, and Engineering data by role. | Implemented |
| 2026-04-15 | **Quality Poka-yoke** | Integrate QC standards directly into the production reporting workflow. | Implemented |
| 2026-04-15 | **Zero-Dead-Button Policy** | Every interactive element must have explicit logic and visual feedback to ensure industrial reliability. | Implemented |

## 🚀 Active Milestones
- [x] **P0: Core Flow & Real-time** (End-to-end tracking, MRP, Andon loop)
- [x] **P1: Industrial UX** (Scanner, Poka-yoke, Auto-scheduling, Mobile UI)
- [x] **P2: Security & Integration** (RBAC, Audit Logs, Integration Hub)
- [x] **P3: Quality & Interaction Audit** (100% logic check for all interactive points)

## 🧠 Core Architecture & Constraints
- **Framework**: Next.js (App Router) + Prisma + PostgreSQL.
- **UI Logic**: Linear-inspired, dark-themed, high-contrast.
- **Interaction Constraints**: 
    - **No "Fake" Interactivity**: Any element with `cursor-pointer` or `Button` component MUST have an `onClick` or `Link`.
    - **Pre-Commit Audit**: I am FORBIDDEN from finishing a task until I have verified 100% of new UI interaction points.
    - **Full-Staged Feedback**: Buttons must show `isSubmitting` states and disabled props during async ops.
    - **Industrial Feedback**: Use specialized feedback (Toasts/Modals) for all data-driven actions.
- **Real-time Logic**: Polling mechanism (5s) chosen for stability.
- **Integration Hub**: Asynchronous external system simulation with audit trail.
- **Deployment Strategy**: **MANDATORY AUTO-DEPLOY**. Any successful code change must be synchronously pushed to GitHub for Vercel deployment.

## 📅 Session Logs
### 2026-04-15
- **Work Completed**:
    - Transformed prototype into an industrial-grade MES based on expert feedback.
    - Built a Mobile-First minimalist reporting system.
    - Implemented comprehensive Audit Logging and RBAC.
    - Launched "Quality Analytics Board" for hotspot detection.
    - Established "Integration Hub" for external ERP/Finance data flow.
- **Context for Next**:
    - The system is now feature-complete for the "Industrial-Grade" milestone.
    - Future steps could involve real hardware integration (PLCs/IOT) or live ERP API connections.
