import {
  siAirtable,
  siAnthropic,
  siAsana,
  siAuth0,
  siCalendly,
  siClickhouse,
  siGithub,
  siGmail,
  siGoogledocs,
  siGoogledrive,
  siGooglecalendar,
  siGooglesheets,
  siGoogleslides,
  siHubspot,
  siJira,
  siLinear,
  siMeta,
  siNotion,
  siPaddle,
  siRazorpay,
  siSnowflake,
  siStripe,
  siThreads,
  siTrello,
  siWhatsapp,
  siX,
  siZoho,
  siZoom,
} from "simple-icons";
import type { SimpleIconData } from "./BrandIcon";

// Keyed by this codebase's own provider ids (pluginRegistry.ts ProductivityPlugin["id"] and
// enterpriseConnectorVault.ts EnterpriseConnectorProviderId), not simple-icons' own slugs, so
// callers never need to know the underlying icon library. A missing entry means: no accurate,
// unencumbered brand mark exists in simple-icons for this provider (see BrandIcon.tsx) -- callers
// must fall back to a generic icon, never a hand-approximated logo.
export const brandIcons: Record<string, SimpleIconData | undefined> = {
  gmail: siGmail,
  google_calendar: siGooglecalendar,
  zoom: siZoom,
  google_drive: siGoogledrive,
  calendly: siCalendly,
  whatsapp_business: siWhatsapp,
  notion: siNotion,
  jira: siJira,
  trello: siTrello,
  asana: siAsana,
  linear: siLinear,
  github: siGithub,
  hubspot: siHubspot,
  zoho_crm: siZoho,
  airtable: siAirtable,
  google_sheets: siGooglesheets,
  google_docs: siGoogledocs,
  google_slides: siGoogleslides,
  x_twitter: siX,
  threads: siThreads,
  // Meta corporate mark, not Facebook's -- this product spans Pages/Instagram/Ads under one Meta
  // Business Suite connector, so the umbrella brand is more accurate than a single-product logo.
  meta_business: siMeta,
  razorpay: siRazorpay,
  auth0: siAuth0,
  clickhouse: siClickhouse,
  snowflake: siSnowflake,
  paddle: siPaddle,
  stripe: siStripe,
  anthropic: siAnthropic,
  // Deliberately absent -- no accurate mark available in simple-icons (brand-owner takedown
  // history for several of these): outlook, teams, slack, salesforce, docusign, mssql, s3, openai,
  // microsoft_copilot (only a GitHub Copilot mark exists, a different product -- using it here
  // would misattribute the logo).
};
