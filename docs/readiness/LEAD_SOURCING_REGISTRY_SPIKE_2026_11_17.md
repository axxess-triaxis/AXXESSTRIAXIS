# Lead Sourcing Registry Spike (2026-11-17)

Read-only research spike. It decides which public regulator registries are worth a Phase 2 adapter in the
lead-sourcing tool (plan: `C:\Users\Sudipta Sarmah\.claude\plans\i-need-to-log-eager-donut.md`, outside the repo).

## Why this spike exists (evidence chain)

- **External signal:** the first pass (Apollo free company lists plus a site crawler) produced 7 usable leads
  from 118 sites. Founder-stated in the session brief; the run output is not in this repo, so this number is
  `Founder-stated, source artifact needed`.
- **Product decision:** test whether public regulator registries can supply named owners or managers as seeds
  for real estate brokerages and private clinics in India and the UAE (segments per
  `docs/readiness/LEAD_LIST_PLAN_2026_11_14.md`).
- **Shipped artifact:** this document only. No code, no adapter, no data.
- **Verification:** every finding below names the exact URL and the method (curl from this Windows machine, or
  the Claude desktop in-app browser pane). Anything not observed directly is marked **unverified**.

## Rules followed

- No login, no captcha bypass, no paid plan, no LinkedIn or Google scraping.
- No bulk download. At most 5 to 9 rows were inspected per source, and only to count which fields are filled.
- **No personal data is recorded here**: field names and fill counts only. One HRERA certificate PDF was
  fetched to check its format and deleted at once. Local probe files with page HTML were deleted after this
  doc was written.
- Terms quoted are short excerpts from each site's own terms or copyright page.
- This is not legal advice. Whether any reuse is lawful under India's DPDP Act 2023 or the UAE PDPL
  (Federal Decree-Law 45 of 2021) is a founder or counsel decision, not something this spike settles.

## Verdict summary

| # | Source | Reachable from this machine | Person name | Role | Phone | Email | Approx. volume | Bulk / API | Captcha or login | Terms on reuse | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1a | DLD Licensed Real Estate Brokers list | Yes | Yes | Broker (card holder) | Yes | Yes | 33,572 broker cards | Export button on the page; backing API needs the page's client key | None seen on the list | Personal, noncommercial use only | **Skip (terms)**: best data, but terms bar commercial use without a written agreement |
| 1b | Dubai Pulse / data.dubai (DLD real estate licenses dataset) | **No** | Not seen | Not seen | Not seen | Not seen | Not seen | Not seen | Not seen | Not seen | **Blocked (unreachable)** |
| 2a | MahaRERA Registered Agents search | Yes (page loads) | Unverified | Unverified | Unverified | Unverified | Unverified | No bulk list found | No captcha seen; form encrypts fields client side | Free reproduction without specific permission | **Unverified**: 0 results in 4 searches; fields not confirmed |
| 2b | K-RERA View All Agents | Yes | Yes | Agent (registration) | No | No | about 1,600 rows | Whole list on one public page | None | Reproduction "after taking proper permission" by email | **Usable as name seed only, after a permission email** |
| 2c | HRERA Registered Agents | Yes | Yes | Agent (registration) | No | No | about 4,000 rows | Whole list on one public page; per-agent scanned PDF certificate | None | Reproduction "after taking proper permission" by email | **Usable as name seed only, after a permission email** |
| 3a | DHA Sheryan Dubai Medical Registry | Yes (page loads) | Yes (from page script) | Category or speciality, license type | No (not in script) | No (not in script) | Unverified | No bulk list found | Results never rendered for me; page HTML mentions captcha; gating unverified | Not checked | **Unverified** |
| 3b | DoH Abu Dhabi facility finder | **Intermittent, then no** | Not seen | Not seen | Not seen | Not seen | Not seen | Not seen | Not seen | Not seen | **Blocked (unreachable)** |
| 4 | NMC Indian Medical Register | Yes | Yes | No (qualification only) | No | No | 45,770 entries for one registration year (2015) | Public search with paged table | None | Terms page does not address automated access | **Skip (no contact or clinic fields; high privacy risk)** |

Bottom line: **no registry gives a clean, terms-compliant source of named contacts with phone or email today.**
The only source with names plus phone plus email (DLD) is restricted by its terms. The two that can be reused
after an email request (K-RERA, HRERA) give names with no contact details and no firm name.

## Per-source detail

### 1a. Dubai Land Department: Licensed Real Estate Brokers list

- **URL:** https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/licensed-real-estate-brokers-list/
  (https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/ redirects here).
- **Reachability:** HTTP 200 in about 1.4 s via curl; renders in the in-app browser pane.
- **Fields observed:** the page's own Excel export maps these columns (read from the page source,
  `exportToExcel()`): `Name English`, `Name Arabic`, `Broker Number`, `Office Name English`,
  `Office Name Arabic`, `Email`, `Phone Number` (source keys `CardHolderNameEn`, `CardHolderNameAr`,
  `CardNumber`, `OfficeNameEn`, `OfficeNameAr`, `CardHolderEmail`, `CardHolderPhone`).
  In the browser pane, 9 of 9 rendered broker cards had a name, an office name, an email and a phone number
  (counted only; no values recorded).
- **Volume:** the page header showed "Total Records" 33,572 broker cards on 2026-11-17.
- **Filters on the page:** all brokers, mortgage, lease, sale, nationals, group A, offices, by project, by
  area. The "offices" view did not render within 6 s in my session, so **office-level fields and counts are
  unverified**.
- **Bulk / API:** the page has an "Export" button that requests up to 50,000 rows from
  `https://gateway.dubailand.gov.ae/brokers/` (configured as `apiConfig.brokerList` in the page). A direct curl
  call without the page's client key returned **HTTP 401**. I did not replay the page's embedded key from a
  script, and I did not use the export.
- **Captcha / login:** none on the list. The site has a global `captchaEnabled` feature flag, but no captcha
  element was present on this page. No login needed.
- **Terms:** https://dubailand.gov.ae/en/terms-conditions/ authorizes viewing and downloading
  "solely for your personal, noncommercial use", and forbids other use "unless otherwise expressly set
  forth in a written agreement". `robots.txt` returns 404.
- **Verdict: Skip (terms).** This is the best-fitting data of the whole spike (named brokers, office, phone,
  email, 33k records), but building an adapter would be commercial use the terms do not allow. A path forward
  needs a founder decision: ask DLD for written permission, or find the same data under an open-data licence
  (1b).

### 1b. Dubai Pulse / data.dubai: DLD real estate licenses dataset

- **URLs tried:** https://www.dubaipulse.gov.ae/ and
  https://www.dubaipulse.gov.ae/data/dld-registration/dld_real_estate_licenses-open: curl timed out at 20 s
  (exit 28), same as the earlier 2026-11-17 attempt. The in-app browser pane also failed to open
  dubaipulse.gov.ae.
- https://data.dubai (the newer Dubai data portal): HTTP 200 but the body is a WAF page, "The requested URL
  was rejected", for both curl and the browser pane.
- **Fields, volume, licence, API:** **not seen. All unverified.**
- **Verdict: Blocked (unreachable).** Recommended next step: the founder opens
  https://www.dubaipulse.gov.ae/data/dld-registration/dld_real_estate_licenses-open once in the in-app
  browser pane (or any browser on a UAE or other network) and notes (a) whether it loads, (b) the column list,
  (c) the licence shown on the dataset page. If the dataset carries an open-data licence that allows
  commercial reuse, it may be the lawful route to the same data as 1a. Do not mark it usable until the
  columns are seen.

### 2a. MahaRERA: Registered Agents search

- **URL:** https://maharera.maharashtra.gov.in/agents-search-result (301 to `www.`). The older portal
  https://maharera.mahaonline.gov.in timed out at 20 s.
- **Form fields:** `agent_name`, `agent_location`, `agent_state` (35 states), `agent_district` (loaded by
  `/div-district-data?state_code=27...`), POST to the same URL. The page loads `jquery-jcryption.js`, which
  encrypts form fields client side.
- **Result:** "No Records Found" for every attempt: location "Pune", state Maharashtra (district list did not
  load in time), and two name-only GET queries via curl. **Result columns, contact fields and volume are
  unverified.**
- **Captcha / login:** none seen. `robots.txt` returns 403.
- **Terms:** https://www.maharera.maharashtra.gov.in/copyright-policy: material "may be reproduced free of
  charge in any format or media without requiring specific permission", if reproduced accurately and not in a
  misleading context.
- **Verdict: Unverified.** Most permissive terms of the set, but I could not get a single result row. Next
  step: the founder runs one manual agent search for a Pune or Mumbai district in a browser and notes the
  columns shown. The client-side field encryption would also make an adapter brittle.

### 2b. K-RERA (Karnataka): View All Agents

- **URL:** https://rera.karnataka.gov.in/viewAllAgents. HTTP 200, about 6.8 MB, one page, no paging.
- **Columns:** `S.No`, `APPLICATION NO`, `REGISTRATION NO`, `AGENT NAME`, `STATUS`, `APPROVED DATE`,
  `EXPIRY DATE`, `DISTRICT`.
- **Volume:** about 1,620 table rows (raw `<tr>` count 1,623, so approximate).
- **Contact fields:** none. 0 ten-digit mobile numbers in the page; the 5 `@` characters were page chrome,
  not row data. A search form posts to `agentViewDetails`; I did not submit it, so **any extra detail fields
  are unverified**.
- **Captcha / login:** none. `robots.txt` 404.
- **Terms:** https://rera.karnataka.gov.in/copyrightpolicy: material "may be reproduced free of charge after
  taking proper permission by sending a mail to us".
- **Verdict: Usable as a name seed only, after a permission email.** It gives agent names and districts but no
  firm name, phone or email, so each row still needs the crawler or a manual step to become contactable.
  Agents may be individuals rather than brokerage owners.

### 2c. HRERA (Haryana): Registered Agents

- **URL:** https://haryanarera.gov.in/admincontrol/registered_agents/1. HTTP 200, about 3.2 MB, one page.
- **Columns:** `Serial No.`, `Registration Certificate No.`, `Agent Name`, `District`, `Category`,
  `Certificate Issuing Date`, `Certificate Expiry Date`, `View Certificate`, `View Extension/ Corrigendum`.
- **Volume:** about 4,000 table rows (raw `<tr>` count 3,997, approximate).
- **Contact fields:** none in the table. Each certificate is a PDF under
  `https://haryanarera.gov.in/relation_cert/agents/<panchkula|gurugram>/<year>/<n>/approved_certificate/<id>.pdf`.
  The one sample was a scanned image with no text layer (1 character extracted), so certificate contents
  (for example an address) would need OCR and are **unverified**. The sample was deleted.
- **Captcha / login:** none. `robots.txt` 404.
- **Terms:** https://haryanarera.gov.in/login/terms_of_use: material "may be reproduced after taking proper
  permission by sending a mail to us".
- **Verdict: Usable as a name seed only, after a permission email.** Same limits as K-RERA. The `Category`
  column may separate individual from firm agents; not checked.

### 3a. DHA Sheryan: Dubai Medical Registry

- **URL:** https://services.dha.gov.ae/sheryan/wps/portal/home/medical-directory. HTTP 200.
  `sheryan.dha.gov.ae` does not resolve (curl exit 6).
- **Fields (from the page script, not seen live):**
  `https://services.dha.gov.ae/sheryan/wps/PA_DHASearch/js/medicalDirectoryProfessionalSearch.js` renders
  `professionalName`, `userGivenName`, `categoryOrSpeciality`, `facilityName`, `licenseType`, `dhaUniqueId`,
  `mdImage`. Filters: license type, category, speciality, language, area, facility, nationality, gender.
  No phone or email field appears in the script.
- **Facilities tab:** exists; its fields were **not checked**.
- **Results:** the search call (`POST /sheryan/RestService/rest/retrieve/medicaldirectorysearchdetails`) never
  returned in the browser pane, so no result rows rendered. **Volume unverified.**
- **Captcha / login:** the page HTML contains "captcha" 16 times; whether it gates the search is
  **unverified**. A Login link exists, but the directory itself opens without login. `robots.txt` 200,
  contents not reviewed.
- **Terms:** not checked. **Unverified.**
- **Verdict: Unverified.** Could map clinic (facility) to named doctors, but has no contact fields and the
  results did not load here.

### 3b. DoH Abu Dhabi: facility list

- **URLs:** https://www.doh.gov.ae/en/ returned HTTP 200 on the first probe; guessed facility paths returned
  the site's 404 page. On later probes the host failed TLS (curl exit 35) and the in-app browser pane could not
  open it. https://www.shafafiya.org/ did not resolve.
- A web search points to a "Find a Healthcare Facility" tool on
  https://www.doh.gov.ae/en/resources/Lists-and-Tools; **not opened**, since the host was failing by then.
- **Fields, volume, captcha, terms:** **all unverified.**
- **Verdict: Blocked (unreachable).** Retry later, or the founder opens the Lists and Tools page once in a
  browser and notes whether the facility finder lists owners or managers (unlikely for a facility register).

### 4. NMC Indian Medical Register

- **URL:** https://nmc.org.in/information-desk/indian-medical-register. HTTP 200, no captcha, no login.
- **Search by:** name, year of registration, registration number, state medical council, advanced search.
- **Table columns:** `Sl No`, `Year of Info`, `Registration No`, `State Medical Council`, `Name`,
  `Father Name`, `Action`.
- **Detail record keys** (from the `viewDoctor` button data, 5 rows checked): `id`, `name`, `father_name`,
  `dob`, `registration_no`, `registration_date`, `uprn_no`, `state_medical_council`, `state_code`,
  `year_of_info`, `permanent_address`, `qualification`, `qualification_year`, `university`,
  `additional_qualifications`, `removed_status`. Filled in 5 of 5: name, father name, DOB, permanent
  address, qualification, university. `uprn_no` and `removed_status` were empty.
- **Volume:** "Showing 1 to 25 of 45,770 entries" for registration year 2015 alone. The site says the register
  covers state council registrations up to 2021 and is moving to the National Medical Register.
- **No** phone, email, clinic name or practice address.
- **Terms:** https://nmc.org.in/page/terms-of-use is generic boilerplate; it does not address automated access.
  `robots.txt`: `User-agent: *`, empty `Disallow`.
- **Verdict: Skip.** It identifies doctors, not clinic owners. It exposes sensitive personal fields (DOB,
  father's name, home address) that must not enter a sales database, and it has no contact path. A state dental
  council was not checked; the NMC result suggests a council register would have the same shape, but that is
  **unverified**.

## Recommendation for Phase 2 (for the founder to decide)

1. **Do not build any registry adapter yet.** None of the reachable sources has contactable data under terms
   that allow commercial reuse.
2. **Highest-value decision: DLD data.** Either (a) the founder opens the Dubai Pulse dataset page (1b) and
   checks its licence, or (b) writes to DLD asking for written permission to use the broker list for B2B
   outreach. If either clears, a DLD adapter is the best Phase 2 candidate by a wide margin.
3. **Optional, low value: K-RERA and HRERA name seeds.** Only after a permission email to each authority, and
   only if the crawler can match an agent name to a firm website. Expect low match rates, since the lists have
   no firm name.
4. **Skip NMC** and drop state medical or dental councils for the clinic segment. For clinics, a facility
   register (DHA facilities tab, DoH finder) is the better shape, but both are unverified or unreachable.

## What this spike did not do

- Did not log in, solve or bypass any captcha, use any paid plan, or touch LinkedIn or Google results pages
  (a single web search was used to find the DoH and NMC page URLs).
- Did not use DLD's export or replay its client key.
- Did not check the DHA facilities tab, DHA terms, a state dental council, or MahaRERA result columns.
- Did not touch `scripts/lead-sourcing/` (owned by a parallel session).

## Exact method and state

- Machine: founder's Windows 11 laptop, India network, 2026-11-17.
- Tools: `curl` with a desktop browser User-Agent and 15 to 40 s timeouts; the Claude desktop in-app browser
  pane (page text plus small read-only scripts that counted fields); one web search.
- Branch: `docs/lead-sourcing-registry-spike` from `origin/main` at `089d8db3`. Docs only; no code or test
  changes, so the verification suite was not run.

## Decision ledger

```
Decision: No registry adapter for Phase 2 yet; DLD data is the only strong candidate and is blocked by terms.
Why: DLD has names, phone and email for 33,572 brokers but its terms allow only personal, noncommercial use;
     K-RERA and HRERA have names only and need permission; NMC has no contact fields and sensitive data.
What changed: this document only.
Architecture boundary: no code; scripts/lead-sourcing/ untouched.
Product boundary: lead sourcing stays on the crawler plus Apollo or Lusha free tiers until a source clears.
Verification: per-source URLs, HTTP codes and field lists above, observed on 2026-11-17.
Outcome: pending founder decision on DLD (licence check or permission request).
Follow-up: founder opens Dubai Pulse dataset page once; decide on DLD permission email; optional permission
           emails to K-RERA and HRERA.
```
