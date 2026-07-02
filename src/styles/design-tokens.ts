// Design tokens mirror the Figma theme CSS variables. Keep feature code pointed
// at tokens rather than ad hoc colors so future theming can happen centrally.
export const designTokens = {
  colors: {
    background: "#ffffff",
    foreground: "#0F1117",
    primary: "#8B1E2D",
    primaryHover: "#7a1a27",
    accent: "#C9A227",
    muted: "#F2F3F5",
    mutedForeground: "#5F6B73",
    success: "#1A6B4A",
    info: "#2C4A7C",
    danger: "#c0392b",
    sidebar: "#0F1117",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  },
  radii: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.625rem",
    xl: "0.875rem",
  },
  typography: {
    sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  },
  themes: {
    light: {
      background: "#ffffff",
      surface: "#fafafa",
      foreground: "#0F1117",
      mutedForeground: "#5F6B73",
    },
    dark: {
      background: "#0F1117",
      surface: "#181B22",
      foreground: "#E8E9EC",
      mutedForeground: "#8A939B",
    },
  },
} as const;
