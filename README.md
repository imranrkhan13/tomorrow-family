# Tomorrow: picture to fields

A two-step document-intake prototype powered by Interfaze. Live: https://tomorrow-family.vercel.app/ . Source: https://github.com/imranrkhan13/tomorrow-family .

1. Upload a fictional or authorized JPG, PNG or WebP picture, up to 3 MB.
2. See the extracted fields, source quotes, proposed category and urgency, and missing information. Review every result yourself. Nothing is routed or sent automatically.

The picture is saved on this device in `tomorrow-intake-v1` IndexedDB. A confirmation appears before the single structured Interfaze extraction request. The server caches the result by hashed input; lost responses trigger read-only lookup, not another provider call. The new one-pass category and urgency path has only mocked-provider tests, not a real provider intake result. Do not claim measured accuracy or Jev parity. No audio intake is enabled. The older mixed-document dashboard and the original family app remain in git history. Older browser data is not deleted, but the simple picture screen does not show previous text/PDF records.

To run: `npm ci && npm run verify && npm run dev`. A live API requires `INTERFAZE_API_KEY`, `FREE_CREDIT_CONFIRMED=true`, valid `TOKEN_CAP` and `CREDIT_CAP_USD`, Upstash Redis REST URL/token, and a long `HOUSEHOLD_ACCESS_CODE` in deployment. Do not put credentials in source control. The browser must supply that private code before a production request can succeed. Do not upload real sensitive documents to this prototype.
