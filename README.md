<<<<<<< HEAD
# Email-Investigation-Dashboard
A Next.js-based Microsoft 365 investigation dashboard for analyzing user activity, sign-ins, audit events, and inbox rules to support security investigations and BEC detection.
=======
# BEC Investigation Dashboard

A local tool for investigating suspected Business Email Compromise (BEC) incidents across
Microsoft 365 tenants: add a tenant (one-time admin consent), pick a user, choose a lookback
window, and get a compromise report built from live Microsoft Graph sign-in and audit data —
plus an AI-written narrative summary (Claude Fable 5).

Runs entirely on your machine via `npm run dev`. There is no separate backend to deploy.

## 1. One-time setup: Azure AD app registration

This app authenticates to Microsoft Graph as itself (application permissions, client-credentials
flow) rather than as an interactive user — that's what lets it pull data for any tenant you add
without you having to sign in every time. You need to register it once, in your own tenant.

1. Go to the [Entra admin center](https://entra.microsoft.com) → **Identity** → **Applications** →
   **App registrations** → **New registration**.
2. Name it anything (e.g. "BEC Investigation Dashboard").
3. Under **Supported account types**, choose **Accounts in any organizational directory (Any
   Microsoft Entra ID tenant - Multitenant)**. This is required — it's what lets you add other
   tenants later without re-registering the app.
4. Under **Redirect URI**, select platform **Web** and enter:
   ```
   http://localhost:3000/api/tenants/consent-callback
   ```
5. Click **Register**. Copy the **Application (client) ID** from the Overview page.
6. Go to **Certificates & secrets** → **New client secret**. Copy the secret **value**
   immediately — it's only shown once.
7. Go to **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Application permissions**, and add all of:
   - `User.Read.All`
   - `AuditLog.Read.All`
   - `Directory.Read.All`
   - `IdentityRiskyUser.Read.All`
   - `Policy.Read.All`
   - `MailboxSettings.Read` — reads each user's live inbox rules
   - `AuditLogsQuery.Read.All` — the Purview unified audit log (inbox-rule creation
     events, mailbox deletions, SharePoint/OneDrive downloads and deletions)

   You do **not** need to grant admin consent here for your own tenant unless you also want to
   investigate it — the in-app "Add Tenant" flow handles consent per tenant, including this one.

> **Already set the app up before?** If you registered the app earlier with only the first five
> permissions, add `MailboxSettings.Read` and `AuditLogsQuery.Read.All` now, then use the
> **Re-consent** button next to each active tenant on the home page — Microsoft requires fresh
> admin consent whenever the permission set changes. No need to remove and re-add tenants.

## 2. Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
AZURE_CLIENT_ID=<Application (client) ID from step 1>
AZURE_CLIENT_SECRET=<client secret value from step 1>
AZURE_REDIRECT_URI=http://localhost:3000/api/tenants/consent-callback
ANTHROPIC_API_KEY=<your Anthropic API key>
```

Then:

```bash
npm run dev
```

Open http://localhost:3000.

## 3. Adding a tenant

Click **Add Tenant**, enter the tenant's verified domain (e.g. `contoso.com`) or its Azure AD
tenant ID, and continue. You'll be redirected to Microsoft to sign in as a **Global
Administrator of that tenant** and approve the requested permissions. On approval, Microsoft
redirects back to this app, which verifies the grant and marks the tenant **Active**.

This is a one-time step per tenant — after that, select it from the list any time.

## 4. Investigating a user

Open a tenant, pick a user, and choose a timeline. The report loads immediately with the
identity-plane evidence (sign-ins, directory audits, risky-user status) **and** the user's
current **inbox rules** — with red flags on rules that forward externally, delete messages,
move mail to obscure folders, or stop rule processing (the classic BEC persistence tricks).

For the mailbox/files data plane, click **Run audit** in the *Mailbox & Files Audit* section.
This queries the Microsoft Purview unified audit log for:

- **Inbox rule change events** — when rules were created/modified/removed, by whom, from which IP
  (this is where the "when was this rule created" answer comes from — the live rule object itself
  carries no creation timestamp)
- **Deleted mail items** — soft deletes, hard deletes, and moves to Deleted Items, with subjects
- **File downloads** — SharePoint / OneDrive `FileDownloaded` and sync events, with file path and IP
- **File deletions** — including recycle-bin stages
- **Mass-delete alerts** — a red banner when ≥ 20 deletions (mail or files) occur within one hour,
  a common evidence-destruction signature after account takeover

> ⏳ **Purview audit queries are asynchronous.** Microsoft processes them server-side and they
> typically take **several minutes**. The app kicks off the query, polls every 15 seconds, shows
> an elapsed timer, and renders the four panels when results are ready. This is expected — it is
> not stuck.

If you then click **Generate AI Report**, the loaded audit findings and flagged inbox rules are
included in what Fable 5 sees, so the narrative covers rules, deletions, and downloads too.

## How data flows

- **Tenant registry** (`data/tenants.json`, gitignored): which tenants you've added and their
  consent status. No secrets — just tenant IDs/domains.
- **Graph calls**: made server-side per request, authenticated with a client-credentials token
  scoped to the specific tenant being investigated (`@azure/msal-node`).
- **AI narrative**: the structured, already-heuristically-scored findings (never raw tokens or
  secrets) are sent to `claude-fable-5` server-side to produce the written summary section of
  the report. This is opt-in per report — click **Generate AI Report**.

## Known limitations

- The sidebar user list doesn't show a live risk badge per user (the original static-data
  prototype did) — that would require pulling every user's sign-in history just to render the
  list, which isn't practical against live Graph data. Risk scoring appears once you select a
  user and a timeline.
- "Off-baseline network" detection is derived per-user from the sign-in sample itself (most
  frequent location/IP-prefix in the selected window), not a hardcoded home network. With a very
  small sample (1–2 sign-ins) this heuristic is weak by nature — treat it as triage, not proof.
- `IdentityRiskyUser.Read.All` and Conditional Access policy data depend on the tenant actually
  having Entra ID P2 / relevant licensing — if unavailable, those sections degrade gracefully
  rather than failing the whole report.
- **Purview audit search** requires auditing to be enabled on the tenant. Microsoft Purview Audit
  (Standard) is on by default for M365 tenants and retains records for 180 days (Standard) or
  longer (Premium) — but a brand-new tenant or one where auditing was disabled will return no
  records. There is also an ingestion lag: an action can take **30–60+ minutes** to appear in the
  audit log, so a rule you just created won't show up in an immediate query.
- **Mass-delete threshold** is a fixed heuristic (≥ 20 deletions/hour). A legitimate mailbox
  cleanup can trip it; treat the banner as a prompt to investigate, not a verdict.
- Inbox-rule **suspicion flags** rely on the mailbox actually having rules readable via
  `MailboxSettings.Read`. A shared or unlicensed mailbox may return a permission/404 error, which
  the panel surfaces rather than failing the whole report.
>>>>>>> 4074c37 (Initail commit)
