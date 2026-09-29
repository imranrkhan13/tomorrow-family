# Tomorrow: document to fields

A two-step document-intake prototype powered by Interfaze. Live: https://tomorrow-family.vercel.app/ . Source: https://github.com/imranrkhan13/tomorrow-family .

1. Upload a fictional or authorized JPG, PNG, WebP picture or PDF, up to 3 MB.
2. See the extracted fields in short pages on a phone; tap a field for its source quote, and expand missing information or the original. Proposed category and urgency still need human review. Nothing is routed or sent automatically.

The uploaded file is saved on this device in `tomorrow-intake-v1` IndexedDB. A confirmation appears before the single structured Interfaze extraction request. The server caches the result by hashed input; lost responses trigger read-only lookup, not another provider call. The picture path has one real fictional Interfaze smoke test; the PDF path has only mock-provider tests, not a real PDF intake result. Do not claim measured accuracy or Jev parity. Audio intake is not yet enabled: transcription needs a separate stage and permission to test it. The older mixed-document dashboard and the original family app remain in git history. Older browser data is not deleted, but the simple upload screen does not show previous text records.

To run: `npm ci && npm run verify && npm run dev`. A live API requires `INTERFAZE_API_KEY`, `FREE_CREDIT_CONFIRMED=true`, valid `TOKEN_CAP` and `CREDIT_CAP_USD`, Upstash Redis REST URL/token, and a long `HOUSEHOLD_ACCESS_CODE` in deployment. Do not put credentials in source control. Picture/PDF intake and read-only lookup are public without an access code; the older extraction endpoint stays code-protected. Public use shares the same capped free-credit budget, which may be exhausted or halted by other visitors. Rate limiting is per browser device, not a reliable identity boundary. Do not upload real sensitive documents to this prototype.
