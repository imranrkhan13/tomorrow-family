# Tomorrow offline fixture preparation

Six fictional pages, made from fixed source strings with DejaVu Sans Oblique. Manifest fields were specified before image rendering, not read back by the model under test. Each image has a SHA-256 fingerprint. No reader or provider run has happened.

Covers separate strength/amount per dose, wrong-row leakage, missing units, procedure-only notes, similar-looking names, split source lines and unreadable name markers. These test parsing/evidence behavior and controlled image reading only. They are NOT authentic messy doctor handwriting, evidence of reading accuracy, or medical instructions.

Review expected fields against the images before any evaluation. Use the offline exact-field evaluator on saved responses, with no drug-name repair. Report wrong/missing/invented fields separately. Do not use the images to fine-tune and then claim held-out results on them.

No third-party prescription images are included. Font notices are in font-copyright.txt. Generator source and manifest are included for reproducibility. No production changes or model calls.

Offline runner (no HTTP or provider transport):
node --import tsx scripts/evaluate-reading.ts tests/fixtures/reading-images/manifest.json path/to/saved-outputs.json report.json

Saved output format is an array of {"id":"clear","fields":[{"name":"dose_1","value":"15 mg"}]}. Missing case ids are UNRUN, not empty or successful results. Explicit empty fields mean that run returned nothing. The runner checks image fingerprints and rejects unknown/duplicate case ids. Do not pass truth fields as reader outputs and call the result model accuracy.
