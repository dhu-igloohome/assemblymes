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

## 🚀 Active Milestones
- [x] **P0: Core Flow & Real-time** (End-to-end tracking, MRP, Andon loop)
- [x] **P1: Industrial UX** (Scanner, Poka-yoke, Auto-scheduling)
- [ ] **P2: Optimization & Integration** (Third-party systems, Advanced analytics)

## 🧠 Core Architecture & Constraints
- **Framework**: Next.js (App Router) + Prisma + PostgreSQL.
- **UI Logic**: Linear-inspired, dark-themed, high-contrast.
- **Real-time Logic**: Polling mechanism (5s) chosen for low-cost, high-reliability over WebSocket for now.
- **Automation Logic**: `sales-order-automation.ts` serves as the core transaction engine.

## 📅 Session Logs
### 2026-04-15
- **Work Completed**:
    - Connected Sales Orders to Production Progress.
    - Visualized "Global Flow Tracking" on Dashboard.
    - Automated "Smart Convert All" for Planning with capacity overload detection.
    - Enabled Andon "Respond" and "Resolve" lifecycle.
    - Installed Cursor Agent Skills (Superpowers, Gstack, etc.).
    - Performed Project Review (Gstack mode) and identified Mobile UI as the next critical gap.
    - Built "Mobile-First Minimalist Reporting" system (P1-4).
    - Implemented Audit Logging backend for core transactions (P2-1).
    - Launched "Quality Analytics Board" with hotspot and yield analysis (P1-5).
- **Context for Next**:
    - Implementing UI for Audit Log browsing (P2-2).
    - Exploring ERP/Finance system integration mockups (P2-3).
