// Renders a real, publicly-available brand mark from simple-icons (MIT-licensed SVG path data;
// https://github.com/simple-icons/simple-icons) instead of a generic placeholder glyph, for
// integration tiles across Settings/Integrations. Not every provider has an entry in that
// dataset -- several (Slack, Microsoft, Salesforce, DocuSign, AWS, Twilio among them) have been
// removed from simple-icons following brand-owner takedown requests, so those tiles keep an
// honest generic icon instead (see src/components/ui/brandIcons.ts) rather than a hand-drawn
// approximation of a trademarked logo.
export type SimpleIconData = { path: string; hex: string; title: string };

export function BrandIcon({ icon, size = 18, className }: { icon: SimpleIconData; size?: number; className?: string }) {
  return (
    <svg
      role="img"
      aria-label={`${icon.title} logo`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={`#${icon.hex}`}
    >
      <path d={icon.path} />
    </svg>
  );
}
