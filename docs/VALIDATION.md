# Validation — September 27, 2026

- Real Interfaze text extraction: passed on one original fictional school notice.
- Expected three tasks and explicit dates were returned; title source lines matched.
- 12,466 tokens, $0.021307 free-credit consumption, 20.13 seconds.
- Same notice exercised through browser upload/review: cache hit, zero new requests.
- Browser review: permission-slip deadline confirmed, appeared on Tomorrow correctly.
- Eleven offline tests: schema, evidence ambiguity, calendar injection, date rollover,
  input validation, cache reuse, budget rejection, quota failure, malformed output,
  and concurrent reservations.
- Real Interfaze image extraction: three expected tasks, each with a verified OCR box.
  14,790 tokens, $0.025051, 84.94 seconds. Total live test cost: $0.046358.
- PDF and user-recorded audio verification: not run.
- No accuracy or calibration claim from this tiny smoke test.

Original inputs contain no real school or child information. All model outputs in
fixtures are genuine Interfaze responses; mocked transport errors are explicitly
unit tests, not product predictions.

- Desktop and narrow-screen UI checked visually. Completion persisted after reload.
