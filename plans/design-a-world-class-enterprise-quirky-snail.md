# Plan: AXXESS by Triaxis — AI-Enabled Institutional Intelligence Platform

## Context

Build a world-class enterprise SaaS web application for AXXESS by Triaxis. The platform is an AI-enabled Human-in-the-Loop Institutional Intelligence Platform serving governments, Fortune 500 enterprises, healthcare orgs, and NGOs. The design should feel like a premium AI operating system — comparable to Palantir, Linear, Stripe Dashboard, and Microsoft Fabric — built for execution and decision support, not content generation.

---

## Aesthetic Stance

**Stance:** Archival-precision enterprise — confident, structured, minimal. Think MoMA catalog meets intelligence platform. No friendly rounded pastel SaaS. Authoritative, executive, cold-precision layout.

**Typography:**
- Display/UI: `Plus Jakarta Sans` (600–800 weight) — geometric, premium, confident
- Body: `Plus Jakarta Sans` (400–500 weight)
- Mono/Data labels: `JetBrains Mono` — tabular data, status codes, audit trails

**Palette (from brief):**
- Background: `#FFFFFF`
- Foreground: `#0F1117`
- Primary (Crimson): `#8B1E2D`
- Primary foreground: `#FFFFFF`
- Gold accent: `#C9A227`
- Steel grey: `#5F6B73`
- Card: `#FAFAFA`
- Muted: `#F2F3F5`
- Border: `rgba(0,0,0,0.08)`
- Sidebar background: `#0F1117` (deep near-black for authority)
- Sidebar foreground: `#E8E9EC`

**Ground treatment:** White main canvas with a near-black sidebar — a split-canvas approach that signals authority and premium positioning. Cards use subtle `box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)`.

---

## Implementation Plan

### 1. `src/styles/fonts.css`
Import Google Fonts:
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
```

### 2. `src/styles/theme.css`
Update `:root` tokens (preserve all existing token names and `@theme inline` block):
- `--background: #ffffff`
- `--foreground: #0F1117`
- `--card: #fafafa`
- `--card-foreground: #0F1117`
- `--primary: #8B1E2D` (crimson)
- `--primary-foreground: #ffffff`
- `--secondary: #F2F3F5`
- `--secondary-foreground: #0F1117`
- `--muted: #F2F3F5`
- `--muted-foreground: #5F6B73`
- `--accent: #C9A227` (gold)
- `--accent-foreground: #0F1117`
- `--border: rgba(0,0,0,0.08)`
- `--ring: #8B1E2D`
- `--radius: 0.625rem`
- Sidebar tokens: `--sidebar: #0F1117`, `--sidebar-foreground: #E8E9EC`, `--sidebar-border: rgba(255,255,255,0.06)`
- Chart tokens: use crimson, gold, steel grey, and complementary tones

Add font-family to `@layer base > body`: `font-family: 'Plus Jakarta Sans', sans-serif`

### 3. `src/app/App.tsx` — Full Implementation

**Architecture:** Single-file React component with `useState` for active nav section. No router needed — section switching via state.

#### Layout Structure
```
<div class="flex h-screen overflow-hidden">
  <Sidebar />           /* fixed left, dark near-black, 240px */
  <main>
    <TopBar />          /* sticky top, white, breadcrumb + user + notifications */
    <ContentArea />     /* scrollable, renders active section */
  </main>
</div>
```

#### Sidebar
- AXXESS logo + "by Triaxis" wordmark at top (crimson geometric mark)
- 12 navigation items with lucide icons, grouped:
  - **Overview:** Executive Dashboard
  - **Operations:** AI Workspace, Projects & Programs, Tasks & Workflow
  - **Intelligence:** Institutional Knowledge, Documents & File Intelligence, Meetings & Decisions
  - **Relationships:** Stakeholders & CRM
  - **Governance:** Approvals & Governance, Analytics & Reports
  - **System:** Integrations, Settings
- Active item: crimson left border + crimson text + subtle crimson bg tint
- User avatar + org name at bottom

#### Top Bar
- Section title (breadcrumb)
- Global search input (Cmd+K style)
- Notification bell with badge count
- AI status indicator ("AI Ready" with pulsing green dot)
- User avatar dropdown

#### Sections to implement (fully rendered, not placeholder):

**1. Executive Dashboard** (default active)
- Hero row: 4 KPI cards — Active Projects (47), At-Risk Items (8), Pending Approvals (23), AI Actions Queued (156)
- KPI cards: large number, trend arrow, sparkline or delta %
- Row 2: Strategic Objectives progress bars (OKRs) + AI Recommendations panel
- Row 3: Project Health grid (mini status cards for 6 projects) + Risks Heatmap
- Row 4: Upcoming approvals table + Calendar widget + Team Workload bar chart (recharts)
- Row 5: Stakeholder activity feed + Document activity feed
- All with realistic data (government/enterprise context)

**2. AI Workspace**
- Split panel: left = conversation thread, right = context panel
- Conversation: messages between user and AXXESS AI with tool-use indicators
- "Human-in-the-Loop" review banner before AI executes actions
- Suggested actions chips at bottom
- Context panel: linked documents, projects, decisions
- AI capabilities tags: Document Reasoning, Multilingual, Workflow Gen, Meeting Summaries

**3. Projects & Programs**
- Header with view switcher: Kanban / Timeline / List
- Kanban view default: 4 columns (Planning, In Progress, Review, Complete)
- Project cards with: title, department tag, progress %, risk badge, owner avatar, due date
- 3-4 cards per column with realistic government/enterprise project names
- Sidebar mini-panel: project stats

**4. Tasks & Workflow**
- Grouped task list with priority badges
- Filters: By project, assignee, due date, status
- Each task: checkbox, title, assignee avatar, project tag, due date, AI-suggested indicator

**5. Stakeholders & CRM**
- Contact list table: avatar, name, org, role, influence score, last activity
- Right panel: relationship strength visualization (simple arc graph SVG)
- Engagement timeline at bottom

**6. Institutional Knowledge**
- Semantic search bar (prominent, centered when no query)
- Knowledge graph connections (SVG-based network nodes for people/docs/decisions)
- Recent searches + suggested queries

**7. Documents & File Intelligence**
- File browser with folder structure
- Document cards: filename, type icon, AI summary snippet, tags, last modified
- Batch actions toolbar

**8. Meetings & Decisions**
- Calendar-style meeting list
- Decision log table: decision, date, owner, status, linked projects

**9. Approvals & Governance**
- Pending approvals queue with urgency levels
- Approval cards: request title, requester, type, due date, approve/reject buttons
- Audit trail section

**10. Analytics & Reports**
- OKR progress (recharts BarChart)
- Risk heatmap grid (CSS grid colored by severity)
- Productivity metrics (recharts LineChart)
- Export report button

**11. Integrations**
- Integration cards grid: Salesforce, Jira, SharePoint, MS Teams, Slack, SAP, etc.
- Status indicators (connected/disconnected)
- Last sync timestamp

**12. Settings**
- Tabbed: Profile, Organization, Security, Permissions, Notifications, AI Configuration
- Role-based permission matrix table
- Security indicators: MFA, SSO, Audit Log enabled

---

## Critical Implementation Notes

- All data is realistic and context-appropriate (government project names, enterprise org names, real-sounding users)
- recharts used for: Team Workload bar chart, Productivity line chart, OKR bar chart
- lucide-react icons throughout navigation and UI
- `motion/react` for sidebar hover states and section transition fade-in
- Scrollbar hiding: `overflow-y-auto [&::-webkit-scrollbar]:hidden`
- All 12 sections implemented — most are full-featured, none are empty placeholders
- Responsive: below 1024px, sidebar collapses to icon-only; below 768px, hamburger menu

---

## Files Modified

1. `src/styles/fonts.css` — Google Fonts imports
2. `src/styles/theme.css` — token values updated (structure preserved)
3. `src/app/App.tsx` — complete implementation (~1000 lines)

---

## Verification

1. Dev server starts without errors
2. All 12 nav items render distinct, content-rich sections
3. KPI cards, charts (recharts), and tables display realistic data
4. Sidebar navigation is active-state responsive
5. Top bar search and notifications are visible
6. Mobile/tablet breakpoints collapse layout gracefully
7. No TypeScript errors, no missing imports
