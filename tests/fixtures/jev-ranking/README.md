# Jev ranking test plan
These are independently authored fictional text/field labels, not Jev-generated truth or predictions. All cases are UNRUN.

Tomorrow currently checks one extracted candidate per field with JevScope /verify. It has no candidate ranking step. The open JevScope endpoint already accepts options for a choice question; TypeSafe Choice reports per-option probabilities and separate confidence. A future experiment can compare current whole-text support versus field name + exact source row + a NONE_SUPPORTED option. Use option probability for candidate ranking, not overall choice confidence. Keep original source text, raw responses, model version, usage and source fingerprints.

Evaluate correct-vs-wrong ordering using src/ranking-benchmark.ts: top correctness, ties, pairwise wins/losses, unanswered coverage. Separately compare exact extraction wrong/missing/invented fields with the image fixtures. Never claim candidate ranking measures original handwriting accuracy.

Proposed bounded pilot: these four cases x two question formulations = eight Jev requests, once each, with no retries. Cost approval, final budget and exact provider contract must be checked before any execution. Current hold prohibits all requests. No automatic fill for medicine decisions. No training of Jev weights is prepared or possible from the inspected public source.
