# Tomorrow: document intake

**Read it. Sort it. Show the proof.** A mixed-document intake prototype powered by Interfaze, not a Jev benchmark or a claim of Jev-equivalent performance.

Live app: https://tomorrow-family.vercel.app/
Source: https://github.com/imranrkhan13/tomorrow-family

The old family-notice UI is available in git history before the replacement (for example commit `c1cdafdaeeb7dcbf4c4780e0aab6087771212a78`). Existing family data stored in a browser's `tomorrow-family-v1` IndexedDB is not deleted or migrated into the new intake database. Back it up with the old version if needed. The current app uses a separate `tomorrow-intake-v1` store on the device.

## What it does

- A public sample replay shows two **genuine cached Interfaze extraction responses** (text and photo) for one **fictional school notice**. This replay did not classify category or urgency; the site says so. No provider call on replay.
- A live text, photo or PDF intake request uses one structured Interfaze call to propose category (`schedule`, `payment`, `support`, `other`), urgency (`routine`, `soon`, `urgent`, `unknown`), source-quoted fields, missing information and a summary. Each result goes into a human-review queue. No auto-routing, messages, payments or other downstream actions.
- The intake schema and service have been tested with a mocked provider response. At publication, no real provider intake response has been run; do not present the label pathway as validated by Interfaze until a real fictional sample is tested.
- Audio is **not enabled** for this intake endpoint. The prior family app transcribed audio and extracted in two calls; one-call audio classification is not demonstrated here.
- Original documents are kept in this device's IndexedDB. Server results are cached against a hashed input and a versioned intake key to prevent repeat charges. If the browser loses the result, the client uses a bounded, read-only lookup and never automatically retries extraction.

## Run and verify

```bash
npm ci
npm run verify
npm run dev
```

The live API needs `INTERFAZE_API_KEY`, `FREE_CREDIT_CONFIRMED=true`, valid `TOKEN_CAP` and `CREDIT_CAP_USD`, Upstash Redis REST URL/token and a long `HOUSEHOLD_ACCESS_CODE` in deployment. Do not put real credentials in source control. The budget and cache are shared with the older extraction service. All data in documents is untrusted; quoted evidence is checked against OCR/text metadata when present, and model-proposed category and urgency always require human review. Confidence is not accuracy.
