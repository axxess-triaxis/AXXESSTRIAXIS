// A-96 (2026-08-04): for the handful of providers with no safe simple-icons mark (BrandIcon.tsx's
// comment explains why -- Slack, Microsoft, DocuSign among others were removed from that dataset
// following real brand-owner takedown requests), the founder asked for something more polished
// than a plain two-letter monogram, but explicitly NOT a copy of the trademarked logo: "use
// likeness basically." These are small, original SVGs -- brand-recognizable color and category
// (Slack's four-color palette, Teams' people icon, DocuSign's signature pen) without tracing or
// reproducing any company's actual protected mark. Investor-demo tiles only; real-tenant surfaces
// never render these, same as every other demo-only asset in this codebase.
export function SlackLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Slack">
      <rect x="2" y="2" width="9" height="9" rx="2" fill="#36C5F0" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="#2EB67D" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="#ECB22E" />
      <rect x="13" y="13" width="9" height="9" rx="2" fill="#E01E5A" />
    </svg>
  );
}

export function TeamsLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Microsoft Teams">
      <circle cx="9" cy="8" r="4.5" fill="#5059C9" />
      <circle cx="16" cy="9" r="3.2" fill="#7B83EB" />
      <path d="M2 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5v1H2z" fill="#5059C9" />
      <path d="M13.5 20.5v-.6c0-2-.6-3.7-1.7-5 .8-.5 1.7-.8 2.7-.8 3 0 5.5 2 5.5 5.4v1z" fill="#7B83EB" />
    </svg>
  );
}

export function DocuSignLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="DocuSign">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#FFCC22" />
      <path d="M6 17c3-1 5-4 6-7.5" stroke="#0F1117" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M12 9.5c1.5 2 3.5 3 6 3.5" stroke="#0F1117" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function LinkedInLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="LinkedIn">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
      <circle cx="7.2" cy="8" r="1.6" fill="white" />
      <rect x="6" y="10.5" width="2.4" height="8" fill="white" />
      <path d="M11 10.5h2.3v1.2c.6-.9 1.6-1.5 2.9-1.5 2.4 0 3.3 1.6 3.3 4v4.3h-2.4v-3.9c0-1.1-.4-1.9-1.5-1.9-1 0-1.6.7-1.6 1.9v3.9H11z" fill="white" />
    </svg>
  );
}

export function TalkwalkerLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Talkwalker">
      <circle cx="12" cy="12" r="10" fill="#0E1E3C" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#37D6C4" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.4" fill="#37D6C4" />
    </svg>
  );
}

export function AmazonLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Amazon Seller">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#131921" />
      <path d="M6 15c3.5 2.6 8.5 2.6 12 0" stroke="#FF9900" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M16.5 15.2l1.6-.5-.2 1.7" stroke="#FF9900" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlipkartLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Flipkart">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#2874F0" />
      <path d="M7 7h7l-4.5 10H7z" fill="white" />
      <path d="M13 12.5h4" stroke="#FFE500" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function MxTechnologiesLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="MX Technologies">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#00847C" />
      <path d="M6 16V8l4 5 4-5v8" stroke="white" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 16V8l3 3.5" stroke="white" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FinicityLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Finicity">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#F47B20" />
      <path d="M6 15l3.5-5 3 3.5L17 8" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="8" r="1.4" fill="white" />
    </svg>
  );
}

export function AkoyaLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Akoya">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#5B3FE0" />
      <circle cx="9.5" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.6" />
      <circle cx="14.5" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.6" opacity="0.7" />
    </svg>
  );
}

export function Probe42LikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Probe42">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#1B2A4A" />
      <circle cx="10" cy="10" r="5" fill="none" stroke="#E5484D" strokeWidth="1.8" />
      <path d="M13.8 13.8L18 18" stroke="#E5484D" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function OtterLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Otter.ai">
      <circle cx="12" cy="12" r="10" fill="#1D2D35" />
      <path d="M7 15c0-3 2-5.5 5-5.5s5 2.5 5 5.5" stroke="#57D9C6" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="10.5" r="1.1" fill="#57D9C6" />
      <circle cx="15" cy="10.5" r="1.1" fill="#57D9C6" />
    </svg>
  );
}

export function FirefliesLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Fireflies.ai">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0B1E3D" />
      <circle cx="9" cy="13" r="2.2" fill="#FFC94D" />
      <circle cx="15" cy="9" r="1.4" fill="#FFC94D" opacity="0.85" />
      <circle cx="16" cy="15" r="1" fill="#FFC94D" opacity="0.6" />
    </svg>
  );
}

export function TranscribeLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Transcription service">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#232F3E" />
      <rect x="6" y="14" width="2" height="4" fill="#FF9900" />
      <rect x="9.5" y="10" width="2" height="8" fill="#FF9900" />
      <rect x="13" y="6" width="2" height="12" fill="#FF9900" />
      <rect x="16.5" y="11" width="2" height="7" fill="#FF9900" />
    </svg>
  );
}

export function KredXLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="KredX">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#EF3E36" />
      <path d="M7 6v12M7 12l6-6M7 12l6 6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CredlixLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Credlix">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#154C79" />
      <path d="M6 13.5l3.5-5 3 3.5 4.5-6" stroke="#4FC3E8" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BillmartLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Billmart">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#1A8A4A" />
      <rect x="6" y="6" width="9" height="12" rx="1" fill="none" stroke="white" strokeWidth="1.5" />
      <path d="M8.5 9.5h4M8.5 12h4M8.5 14.5h2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function M1xchangeLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="M1xchange">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0E3A5F" />
      <path d="M5 16V8l3.5 5 3.5-5v8" stroke="#F2B01E" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8l5 8M19 8l-5 8" stroke="#F2B01E" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BusyAccountingLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="BUSY Accounting">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#F5A623" />
      <rect x="6" y="12" width="2.5" height="6" fill="#0F1117" />
      <rect x="10.5" y="8" width="2.5" height="10" fill="#0F1117" />
      <rect x="15" y="5" width="2.5" height="13" fill="#0F1117" />
    </svg>
  );
}

export function HeyGenLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="HeyGen">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0F1117" />
      <path d="M8 7v10l9-5z" fill="#9B6BFF" />
    </svg>
  );
}

export function InVideoLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="InVideo">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#7B2FF7" />
      <path d="M8 8v8l8-4z" fill="white" />
    </svg>
  );
}

export function RunwayLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Runway">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0F1117" />
      <path d="M5 17L12 6l7 11" stroke="white" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 12h7" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SynthesiaLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Synthesia">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#1863FF" />
      <circle cx="12" cy="10" r="3.4" fill="white" />
      <path d="M6 18c0-3 2.7-5 6-5s6 2 6 5" fill="white" />
    </svg>
  );
}

export function CreatifyLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Creatify">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#FF5C7A" />
      <path d="M12 6l1.7 4.3L18 12l-4.3 1.7L12 18l-1.7-4.3L6 12l4.3-1.7z" fill="white" />
    </svg>
  );
}

export function AkoolLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="AKOOL">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0EA5A5" />
      <circle cx="9" cy="12" r="3.4" fill="none" stroke="white" strokeWidth="1.6" />
      <circle cx="15.5" cy="12" r="2" fill="white" />
    </svg>
  );
}

export function HapticLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Haptic">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#1E1B4B" />
      <circle cx="12" cy="12" r="2" fill="#818CF8" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#818CF8" strokeWidth="1.3" opacity="0.6" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="#818CF8" strokeWidth="1.1" opacity="0.35" />
    </svg>
  );
}

export function AgenticAiLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Agentic.ai">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#111827" />
      <rect x="7" y="7" width="10" height="10" rx="2.5" fill="none" stroke="#34D399" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.6" fill="#34D399" />
    </svg>
  );
}

export function HunarAiLikenessIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Hunar.ai">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#D9480F" />
      <path d="M7 17V9.5l5-3 5 3V17" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 17v-4h5v4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Keyed by this codebase's own ProductivityPlugin["brandId"] values so callers (IntegrationsSection,
// Settings quick-connect) can look up a likeness icon generically instead of a hardcoded ternary
// chain -- see brandIcons.ts for the equivalent real-logo registry.
export const likenessIcons: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  slack: SlackLikenessIcon,
  teams: TeamsLikenessIcon,
  docusign: DocuSignLikenessIcon,
  linkedin: LinkedInLikenessIcon,
  talkwalker: TalkwalkerLikenessIcon,
  amazon_seller: AmazonLikenessIcon,
  flipkart: FlipkartLikenessIcon,
  mx_technologies: MxTechnologiesLikenessIcon,
  finicity: FinicityLikenessIcon,
  akoya: AkoyaLikenessIcon,
  probe42: Probe42LikenessIcon,
  otter: OtterLikenessIcon,
  fireflies: FirefliesLikenessIcon,
  transcribe: TranscribeLikenessIcon,
  kredx: KredXLikenessIcon,
  credlix: CredlixLikenessIcon,
  billmart: BillmartLikenessIcon,
  m1xchange: M1xchangeLikenessIcon,
  busy_accounting: BusyAccountingLikenessIcon,
  heygen: HeyGenLikenessIcon,
  invideo: InVideoLikenessIcon,
  runway: RunwayLikenessIcon,
  synthesia: SynthesiaLikenessIcon,
  creatify: CreatifyLikenessIcon,
  akool: AkoolLikenessIcon,
  haptic: HapticLikenessIcon,
  agentic_ai: AgenticAiLikenessIcon,
  hunar_ai: HunarAiLikenessIcon,
};
