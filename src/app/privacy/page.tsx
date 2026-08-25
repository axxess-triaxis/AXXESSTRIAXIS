import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Triaxis Ventures",
  description:
    "Privacy Policy for Triaxis Ventures Private Limited and AXXESS TRIaxis websites, products, beta workspaces, demos, Lite surfaces, and mobile apps.",
  alternates: {
    canonical: "/privacy",
  },
};

const sections = [
  {
    title: "1. Who we are",
    body: [
      "Triaxis Ventures Private Limited is an India-based company building AXXESS TRIaxis, an AI-enabled operating layer for organizations. This Privacy Policy applies to www.triaxisventures.com, landing.triaxisventures.com, investor.triaxisventures.com, lite.triaxisventures.com, AXXESS TRIaxis beta workspaces, AXXESS Lite, mobile apps, waitlists, product demos, and related services we operate.",
      "In this policy, 'Triaxis', 'AXXESS', 'we', 'us', or 'our' means Triaxis Ventures Private Limited. 'You' means a visitor, waitlist user, beta user, pilot user, customer admin, invited workspace user, or other person interacting with our services.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "Account and identity information: name, email address, phone number where enabled, organization name, role, team membership, profile details, authentication status, and account settings.",
      "Workspace and product information: projects, tasks, meetings, reminders, approvals, documents, Knowledge Hub records, stakeholder/CRM records, audit events, feedback, AI review decisions, integration settings, and other content you or your organization choose to submit.",
      "Usage and device information: pages visited, feature interactions, session events, approximate location derived from technical signals, device/browser type, logs, performance data, errors, security events, and product analytics events.",
      "Integration information: if you connect external services such as Google Workspace, Zoom, Microsoft services, OpenRouter, OpenAI, Notion, Slack, HubSpot, or similar providers, we process the tokens, metadata, messages, documents, calendar records, or other data needed to provide the connected feature. We do not connect third-party accounts unless an authorized user starts that connection.",
      "Payment and commercial information: where payments are enabled, we may process plan, billing, invoice, payment status, tax, and subscription metadata. Card or bank details should be handled by payment providers, not stored directly by AXXESS.",
    ],
  },
  {
    title: "3. How we use information",
    body: [
      "We use information to provide and secure the service, authenticate users, create and manage tenant workspaces, operate AI/RAG/HITL workflows, process documents, run integrations, route approvals, maintain audit logs, respond to support requests, improve product quality, measure usage, prevent abuse, and communicate about pilots, waitlists, product updates, security, billing, and legal matters.",
      "We also use limited analytics and diagnostics to understand whether the product is working, where users get stuck, and which features need improvement. We do not use customer workspace content to make hidden employment, credit, healthcare, or government-benefit decisions.",
    ],
  },
  {
    title: "4. AI, RAG, and human-in-the-loop review",
    body: [
      "AXXESS includes AI-assisted features such as governed search, summaries, recommendations, routing, review queues, and agentic workflows. These features may process questions, documents, workspace records, citations, confidence signals, model-routing metadata, and human review decisions.",
      "AI outputs are designed to remain governed by tenant boundaries, citations, confidence indicators, audit logs, and human-in-the-loop controls. We may route AI requests through configured model or infrastructure providers when a workspace admin enables or authorizes those features.",
      "Customer data is not intended to be exposed across tenants. We design tenant boundaries, role checks, and audit trails to prevent one organization from seeing another organization's data.",
    ],
  },
  {
    title: "5. Cookies, analytics, and tracking",
    body: [
      "We use cookies, local storage, session storage, and similar technologies for authentication, security, demo mode, product preferences, waitlist widgets, analytics, and performance measurement.",
      "Our sites and apps may use services such as Vercel, PostHog, Mixpanel, LaunchList, and similar tooling to understand traffic, product usage, errors, and conversion. Session replay or autocapture features, where enabled, should be configured to reduce collection of sensitive text and form inputs.",
      "You can control cookies through your browser settings. Some authentication, security, or workspace features may not work correctly if required cookies are blocked.",
    ],
  },
  {
    title: "6. How we share information",
    body: [
      "We share information with service providers that help us host, secure, analyze, support, communicate, process payments, run AI/model routing, deliver email/SMS, and operate integrations. These providers should only process information for the service purpose we authorize.",
      "We may share information with your organization administrators where the data belongs to a workspace controlled by that organization. We may also disclose information if required by law, to protect rights and security, to investigate abuse, or as part of a business transaction such as financing, merger, acquisition, or restructuring.",
      "We do not sell personal information in the ordinary sense. We do not intentionally disclose one customer's workspace data to another customer.",
    ],
  },
  {
    title: "7. Retention",
    body: [
      "We keep information for as long as needed to provide the service, maintain security and auditability, comply with legal obligations, resolve disputes, enforce agreements, and support legitimate business operations.",
      "Some records, such as audit logs, approval histories, AI review histories, and security events, may be retained longer because they are part of the governance and accountability layer of the product. Workspace admins may request deletion or export according to their plan, agreement, and applicable law.",
    ],
  },
  {
    title: "8. Security",
    body: [
      "We use technical and organizational safeguards such as authentication, role-based access control, tenant scoping, audit logging, encrypted credential storage where applicable, provider-gated integrations, and restricted administrative paths.",
      "No system is perfectly secure. If you believe you have found a security issue, contact us through the official Triaxis Ventures website or the communication channel provided in your pilot/customer agreement.",
    ],
  },
  {
    title: "9. Your rights and choices",
    body: [
      "Depending on where you live and how you use AXXESS, you may have rights to access, correct, export, delete, restrict, or object to certain processing of your personal information. You may also have rights related to consent withdrawal and complaint/escalation with a regulator.",
      "If your account is part of an organization workspace, some requests may need to be handled through your organization's administrator because the organization controls the workspace data. We may need to verify your identity before acting on a request.",
    ],
  },
  {
    title: "10. International data transfers",
    body: [
      "We may process information through infrastructure, analytics, email, AI, payment, and integration providers located in India, the United States, the European Union, the United Kingdom, the UAE, or other jurisdictions. Where required, we aim to use appropriate contractual, technical, and organizational safeguards for such transfers.",
    ],
  },
  {
    title: "11. Children",
    body: [
      "AXXESS is intended for organizations and professional users. It is not directed to children. If you believe a child has provided personal information to us without appropriate authorization, contact us so we can review and take appropriate action.",
    ],
  },
  {
    title: "12. Changes to this policy",
    body: [
      "We may update this Privacy Policy as the product, integrations, legal requirements, and commercial model evolve. The latest version will be posted at www.triaxisventures.com/privacy with the effective date shown on this page. Material changes may be communicated through the product, website, email, or customer channels.",
    ],
  },
  {
    title: "13. Contact",
    body: [
      "For privacy requests, security concerns, partnership questions, enterprise deployment questions, or pilot/customer account matters, contact Triaxis Ventures through the official website or the communication channel provided in your pilot/customer agreement.",
      "If you are a workspace user, you may also contact your organization's workspace administrator for access, export, correction, or deletion requests related to organization-controlled data.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-16">
        <Link href="/" className="text-sm font-semibold text-[#7dff6a] hover:underline">
          Back to Triaxis Ventures
        </Link>

        <div className="mt-8 rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm md:p-8">
          <p className="inline-flex rounded-full border border-[#00c2ff]/35 bg-[#07111d]/85 px-4 py-1 text-sm font-medium text-[#7dff6a]">
            Privacy Policy
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#111827] md:text-6xl">
            Privacy Policy for Triaxis Ventures and AXXESS TRIaxis.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#4a5a6a] md:text-lg">
            Effective date: 22 August 2026. This policy explains what we collect, why we collect it,
            how we use it, and the choices available to users, pilot customers, and enterprise
            workspaces.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-16 md:px-10">
        {sections.map((section) => (
          <article key={section.title} className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#111827]">{section.title}</h2>
            <div className="mt-4 space-y-4">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-7 text-[#4a5a6a]">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        ))}

        <div className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
          <p className="text-sm leading-6 text-[#4a5a6a]">
            This policy is a public product and website notice. Enterprise customers may have
            additional terms, data-processing terms, security exhibits, retention commitments, or
            procurement documents that apply to their workspace.
          </p>
        </div>
      </section>
    </main>
  );
}
