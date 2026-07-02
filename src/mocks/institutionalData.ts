// Sprint 1 keeps Figma's static data, but moves it behind a mock data layer so
// Supabase repositories can replace these exports without rewriting UI.
export const workloadData = [
  { name: "Strategy", value: 87, capacity: 100 },
  { name: "Digital", value: 72, capacity: 100 },
  { name: "Policy", value: 95, capacity: 100 },
  { name: "Finance", value: 61, capacity: 100 },
  { name: "Legal", value: 78, capacity: 100 },
  { name: "Ops", value: 53, capacity: 100 },
];

export const performanceData = [
  { month: "Jan", completed: 38, planned: 42 },
  { month: "Feb", completed: 45, planned: 48 },
  { month: "Mar", completed: 52, planned: 50 },
  { month: "Apr", completed: 48, planned: 55 },
  { month: "May", completed: 61, planned: 58 },
  { month: "Jun", completed: 67, planned: 65 },
  { month: "Jul", completed: 71, planned: 70 },
];

export const okrData = [
  { name: "Digital Transformation", progress: 74, target: 100 },
  { name: "Citizen Services", progress: 88, target: 100 },
  { name: "Revenue Optimization", progress: 52, target: 100 },
  { name: "Operational Efficiency", progress: 91, target: 100 },
  { name: "Risk Mitigation", progress: 63, target: 100 },
];

export const projects = [
  { id: 1, name: "National Digital ID Infrastructure", dept: "Digital Transformation", progress: 67, risk: "medium", owner: "RA", dueDate: "2025-03-15", status: "In Progress", budget: "$12.4M", spent: "$8.2M" },
  { id: 2, name: "Healthcare Data Interoperability", dept: "Health & Social", progress: 34, risk: "high", owner: "MK", dueDate: "2025-06-30", status: "At Risk", budget: "$5.8M", spent: "$2.1M" },
  { id: 3, name: "Public Infrastructure Modernization", dept: "Infrastructure", progress: 89, risk: "low", owner: "JT", dueDate: "2024-12-31", status: "Review", budget: "$28.7M", spent: "$25.4M" },
  { id: 4, name: "Climate Resilience Framework", dept: "Environment", progress: 21, risk: "medium", owner: "SL", dueDate: "2025-09-01", status: "Planning", budget: "$7.2M", spent: "$1.4M" },
  { id: 5, name: "Tax Modernization Program", dept: "Finance", progress: 55, risk: "low", owner: "BC", dueDate: "2025-04-15", status: "In Progress", budget: "$19.1M", spent: "$10.5M" },
  { id: 6, name: "Border Security AI Platform", dept: "National Security", progress: 42, risk: "high", owner: "DM", dueDate: "2025-08-20", status: "At Risk", budget: "$34.6M", spent: "$14.8M" },
  { id: 7, name: "Education Equity Initiative", dept: "Education", progress: 78, risk: "low", owner: "PH", dueDate: "2025-02-28", status: "In Progress", budget: "$9.3M", spent: "$7.2M" },
  { id: 8, name: "Supply Chain Resilience", dept: "Trade & Commerce", progress: 15, risk: "medium", owner: "NW", dueDate: "2025-10-01", status: "Planning", budget: "$15.0M", spent: "$2.3M" },
];

export const tasks = [
  { id: 1, title: "Review Q3 risk assessment for Digital ID project", project: "National Digital ID", priority: "high", assignee: "RA", due: "2024-11-12", status: "In Progress", aiSuggested: false },
  { id: 2, title: "Draft stakeholder briefing note for Minister's office", project: "Healthcare Data", priority: "urgent", assignee: "MK", due: "2024-11-10", status: "Pending", aiSuggested: true },
  { id: 3, title: "Validate vendor compliance documentation", project: "Border Security AI", priority: "high", assignee: "DM", due: "2024-11-15", status: "Pending", aiSuggested: false },
  { id: 4, title: "Prepare budget variance analysis — Q3 actuals", project: "Tax Modernization", priority: "medium", assignee: "BC", due: "2024-11-18", status: "In Progress", aiSuggested: true },
  { id: 5, title: "Conduct environmental impact review", project: "Climate Resilience", priority: "medium", assignee: "SL", due: "2024-11-20", status: "Pending", aiSuggested: false },
  { id: 6, title: "Schedule steering committee quarterly review", project: "Infrastructure", priority: "low", assignee: "JT", due: "2024-11-25", status: "Pending", aiSuggested: false },
  { id: 7, title: "Finalize procurement tender evaluation criteria", project: "Digital ID", priority: "high", assignee: "RA", due: "2024-11-13", status: "In Progress", aiSuggested: true },
  { id: 8, title: "Submit equity audit report to oversight committee", project: "Education Equity", priority: "urgent", assignee: "PH", due: "2024-11-11", status: "Pending", aiSuggested: false },
];

export const stakeholders = [
  { id: 1, name: "Minister Sarah Okonkwo", org: "Ministry of Digital Affairs", role: "Executive Sponsor", influence: 98, engagement: "High", lastContact: "2024-11-08", avatar: "SO" },
  { id: 2, name: "Director James Thornton", org: "Treasury Board Secretariat", role: "Fiscal Oversight", influence: 87, engagement: "Medium", lastContact: "2024-10-29", avatar: "JT" },
  { id: 3, name: "Deputy Minister Raj Anand", org: "Public Safety Canada", role: "Program Champion", influence: 92, engagement: "High", lastContact: "2024-11-05", avatar: "RA" },
  { id: 4, name: "Dr. Mei Chen", org: "Health Canada", role: "Technical Authority", influence: 74, engagement: "Medium", lastContact: "2024-10-22", avatar: "MC" },
  { id: 5, name: "Commissioner Paul Dubois", org: "Canada Revenue Agency", role: "Data Custodian", influence: 81, engagement: "Low", lastContact: "2024-10-15", avatar: "PD" },
  { id: 6, name: "Ambassador Lee Williams", org: "Global Affairs Canada", role: "International Liaison", influence: 68, engagement: "Medium", lastContact: "2024-11-01", avatar: "LW" },
];

export const documents = [
  { id: 1, name: "National Digital ID — Architecture Decision Record v2.3", type: "PDF", size: "4.2 MB", modified: "2024-11-08", tags: ["Architecture", "Approved"], aiSummary: "Defines the federated identity model, PKI infrastructure, and privacy-by-design principles for the national digital identity framework.", project: "Digital ID" },
  { id: 2, name: "Q3 2024 Portfolio Risk Register", type: "XLSX", size: "1.8 MB", modified: "2024-11-06", tags: ["Risk", "Finance"], aiSummary: "Documents 47 active risks across 12 programs; 8 elevated to critical status requiring Deputy Minister sign-off.", project: "Portfolio" },
  { id: 3, name: "Healthcare Interoperability — FHIR R4 Compliance Report", type: "PDF", size: "7.1 MB", modified: "2024-11-04", tags: ["Compliance", "Technical"], aiSummary: "Vendor assessment confirms 94% FHIR R4 compliance; 3 critical gaps identified in patient consent workflow requiring remediation.", project: "Healthcare" },
  { id: 4, name: "Border Security AI — Ethics Review Board Submission", type: "DOCX", size: "2.9 MB", modified: "2024-11-02", tags: ["AI Ethics", "Governance"], aiSummary: "Formal submission for algorithmic impact assessment; reviewers flagged 2 fairness concerns requiring mitigation strategy before deployment.", project: "Border Security" },
  { id: 5, name: "Climate Resilience — Intergovernmental MOU Draft v1.1", type: "DOCX", size: "890 KB", modified: "2024-10-30", tags: ["Legal", "MOU"], aiSummary: "Draft memorandum of understanding covering joint federal-provincial climate data sharing, funding allocation, and accountability structures.", project: "Climate" },
  { id: 6, name: "FY2024-25 Capital Expenditure Forecast", type: "XLSX", size: "3.4 MB", modified: "2024-10-28", tags: ["Finance", "Planning"], aiSummary: "Consolidated capital forecast showing $127.3M in approved spending, $23.1M in variance requests pending Treasury Board approval.", project: "Finance" },
];

export const meetings = [
  { id: 1, title: "Deputy Ministers Digital Portfolio Review", date: "2024-11-12", time: "09:00", duration: "90 min", attendees: 8, type: "Executive", status: "Upcoming", aiSummary: null },
  { id: 2, title: "Border Security AI — Ethics Board Q&A Session", date: "2024-11-11", time: "14:00", duration: "60 min", attendees: 12, type: "Governance", status: "Upcoming", aiSummary: null },
  { id: 3, title: "Healthcare Interoperability Steering Committee", date: "2024-11-08", time: "10:30", duration: "90 min", attendees: 15, type: "Steering", status: "Completed", aiSummary: "Committee approved Phase 2 vendor selection. Confirmed go-live target of Q2 2025. Outstanding: legal review of data residency clauses." },
  { id: 4, title: "Tax Modernization Sprint Review — Sprint 14", date: "2024-11-07", time: "15:00", duration: "45 min", attendees: 9, type: "Technical", status: "Completed", aiSummary: "Sprint velocity at 94% of target. Two blockers resolved. Risk: legacy COBOL migration window may conflict with year-end freeze." },
  { id: 5, title: "Supply Chain Resilience Kickoff Workshop", date: "2024-11-06", time: "09:00", duration: "180 min", attendees: 22, type: "Workshop", status: "Completed", aiSummary: "Stakeholders aligned on scope and success criteria. Four workstreams defined. Procurement strategy to be confirmed by Nov 20." },
];

export const approvals = [
  { id: 1, title: "Border Security AI Platform — Procurement Authority Request", type: "Procurement", requester: "D. Mitchell", amount: "$8.4M", urgency: "urgent", dueDate: "2024-11-12", status: "Pending", description: "Request to award Phase 2 development contract to Palantir Technologies Canada Ltd. Requires DM sign-off under Treasury Board Directive." },
  { id: 2, title: "Healthcare Data MOU — Legal Clearance", type: "Legal", requester: "M. Kim", amount: null, urgency: "high", dueDate: "2024-11-15", status: "Pending", description: "Legal Services has completed review. Minor redline changes requested to data residency clause 4.7(b). Requires ADM approval to proceed." },
  { id: 3, title: "Digital ID — Architecture Change Control #47", type: "Technical", requester: "R. Anand", amount: null, urgency: "medium", dueDate: "2024-11-20", status: "Under Review", description: "Request to modify PKI certificate rotation policy from 12 to 6 months. Security Operations has recommended approval pending CISO sign-off." },
  { id: 4, title: "Climate Resilience — Emergency Supplementary Funding", type: "Finance", requester: "S. Laurent", amount: "$2.1M", urgency: "high", dueDate: "2024-11-14", status: "Pending", description: "Unbudgeted requirement arising from federal-provincial cost-sharing agreement. Requires Treasury Board President approval." },
  { id: 5, title: "Education Equity — Third-Party Evaluation Contract", type: "Procurement", requester: "P. Hassan", amount: "$340K", urgency: "medium", dueDate: "2024-11-22", status: "Pending", description: "Renewal of independent evaluation services contract. Sole-source justification attached. Program ADM approval required." },
];

export const integrations = [
  { name: "Microsoft 365", category: "Productivity", status: "connected", lastSync: "2 min ago", icon: "M" },
  { name: "Salesforce", category: "CRM", status: "connected", lastSync: "15 min ago", icon: "S" },
  { name: "Jira", category: "Project Mgmt", status: "connected", lastSync: "8 min ago", icon: "J" },
  { name: "SharePoint", category: "Document Mgmt", status: "connected", lastSync: "5 min ago", icon: "SP" },
  { name: "SAP S/4HANA", category: "ERP / Finance", status: "connected", lastSync: "30 min ago", icon: "SA" },
  { name: "Power BI", category: "Analytics", status: "connected", lastSync: "1 hr ago", icon: "PB" },
  { name: "Slack", category: "Communication", status: "disconnected", lastSync: "—", icon: "SL" },
  { name: "ServiceNow", category: "ITSM", status: "connected", lastSync: "12 min ago", icon: "SN" },
  { name: "Workday", category: "HR / Payroll", status: "connected", lastSync: "2 hr ago", icon: "WD" },
  { name: "DocuSign", category: "eSignature", status: "disconnected", lastSync: "—", icon: "DS" },
  { name: "Zoom", category: "Video", status: "connected", lastSync: "45 min ago", icon: "ZM" },
  { name: "Tableau", category: "Analytics", status: "pending", lastSync: "—", icon: "TB" },
];

export const aiMessages = [
  { role: "user", content: "Summarize the current risk exposure across the Border Security AI and Healthcare Interoperability programs and recommend prioritized mitigation actions." },
  {
    role: "assistant",
    content: "Based on my analysis of 1,247 documents, 34 meeting transcripts, and risk registers updated through November 8, 2024, here is the consolidated risk briefing:\n\n**Border Security AI Platform**\nCurrent risk rating: **HIGH**. Primary drivers: (1) Ethics review board has flagged 2 unresolved fairness concerns in the facial recognition module — remediation timeline unknown; (2) Procurement is 14 days behind schedule, compressing testing windows; (3) RCMP integration dependency not yet confirmed.\n\n**Healthcare Data Interoperability**\nCurrent risk rating: **HIGH**. Primary drivers: (1) Three critical FHIR R4 compliance gaps identified in vendor audit require code remediation estimated at 6 weeks; (2) Provincial consent framework legislation not yet passed in 3 jurisdictions.\n\n**Recommended Prioritized Actions:**\n1. Schedule emergency session with Ethics Board Chair (Dr. Osei) — propose 2-week remediation sprint\n2. Escalate procurement delay to DM Mitchell for expedited approval authority\n3. Commission legal bridge strategy for interim healthcare data sharing pending provincial legislation",
    toolUsed: "Document Analysis · Risk Register · Meeting Summaries",
  },
  { role: "user", content: "Draft an executive briefing note for the Minister on the Border Security AI ethics concerns." },
  {
    role: "assistant",
    content: "I have drafted a briefing note based on the Ethics Review Board submission (Nov 2, 2024), relevant AI governance frameworks, and comparable international precedents. \n\n**⚠ Human-in-the-Loop Review Required**\n\nThis document will be sent to Minister Okonkwo's office. Please review the draft before I proceed.",
    toolUsed: "Document Drafting",
    requiresApproval: true,
    draftPreview: "BRIEFING NOTE — MINISTER OF DIGITAL AFFAIRS\nRe: Border Security AI Platform — Ethics Review Status\nDate: November 11, 2024 | Classification: Protected B\n\nPURPOSE: To inform the Minister of the current status of the Ethics Review Board assessment and recommended course of action...",
  },
];
