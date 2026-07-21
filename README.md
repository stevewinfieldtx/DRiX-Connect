# DRiX LinkedIn Research Copilot MVP

A runnable Chrome/Edge Manifest V3 extension plus a small Node backend for two workflows:

- **Research & Message** on LinkedIn company and person pages
- **Analyze Thread & Reply** on LinkedIn messaging pages

The backend uses TDE's existing `/intel/research/company` cache/research endpoint when configured, supplements it with the company's public website, and asks the configured model for a grounded fit analysis and message. If TDE is unavailable, direct website research keeps the workflow usable. DRiX-Brain remains unchanged because its repository contract keeps product prompts and UI in product apps.

## What is captured

Only after the user clicks a workflow, the extension captures the active LinkedIn page's currently rendered text, basic person/company fields, public external links, and—on messaging pages—the currently rendered messages. LinkedIn lazily renders long threads, so scroll through the relevant conversation before analyzing it.

The extension does not auto-send messages. The user reviews and copies the editable draft.

## 1. Run the backend

Requirements: Node.js 20 or newer and an OpenRouter API key.

```powershell
Copy-Item .env.example .env
npm install
npm test
npm start
```

Edit `.env` before starting:

- `OPENROUTER_API_KEY` is required.
- `TDE_BASE_URL` should point to TargetedDecomposition-v2. The included Railway URL is the current default from DRiX-Brain's configuration.
- `TDE_API_KEY` is required only when that TDE deployment requires authentication.
- `ALLOWED_ORIGINS=*` is convenient for an unpacked local extension. Restrict it for production.

Check [http://localhost:8410/healthz](http://localhost:8410/healthz). It should report `ok: true` and `llm_configured: true`.

## 2. Load the extension

Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this project's `extension` folder.

Edge:

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this project's `extension` folder.

Pin **DRiX LinkedIn Copilot**. Clicking its toolbar icon opens the side panel.

## 3. Configure PartnerCompany once

Open the side panel's **Settings** section and save:

- backend URL (`http://localhost:8410` locally)
- PartnerCompany name
- offerings/problems solved
- ideal customers
- differentiators
- proof points/case studies
- messaging rules

These values remain in browser synchronized storage. The OpenRouter key stays on the backend and is never stored in the extension.

## 4. Use it

On a LinkedIn company or person page, open DRiX and select **Research & Message**. The response includes fit, supporting evidence with confidence, the recommended angle, sources, and an editable draft.

In LinkedIn Messaging, open the relevant thread, scroll far enough to render the context you want analyzed, and select **Analyze Thread & Reply**. The response also includes a conversation summary, inferred intent, and unanswered points.

## API

`POST /api/copilot/analyze`

```json
{
  "mode": "research_message",
  "page": {
    "type": "company",
    "url": "https://www.linkedin.com/company/example/",
    "companyName": "Example",
    "companyWebsite": "https://example.com/",
    "visibleText": "Visible page content"
  },
  "thread": [],
  "partner": {
    "companyName": "PartnerCompany",
    "offerings": "What PartnerCompany sells",
    "idealCustomers": "Who benefits",
    "differentiators": "Why it wins",
    "proofPoints": "Approved proof",
    "tone": "Concise and consultative"
  }
}
```

Use `"mode": "thread_reply"` and include visible `thread` items shaped as `{ "sender", "text", "timestamp" }` for the reply workflow.

## Production notes

- Put the backend behind HTTPS before pointing a distributed extension at it.
- Restrict `ALLOWED_ORIGINS`, add backend authentication, and narrow `host_permissions` to the deployed API domain before Chrome Web Store distribution.
- Review LinkedIn's current terms and your organization's privacy policy before broad deployment. This MVP performs user-initiated capture only; LinkedIn DOM changes may require selector maintenance.
- Do not auto-send generated messages. Human review is deliberately part of the workflow.
# DRiX-Connect
