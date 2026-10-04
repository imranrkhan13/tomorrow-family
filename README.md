Prepared on top of main 273611db6cecf429b327473e5cb6effb6743bc04. Not published or deployed: free build cap still active.

- Revalidate cached checker agreements against original saved source lines, preserve raw scores, no provider requests.
- Revalidate browser-saved agreement on rendering, including old local results.
- Reject field-authored quotes when independent source lines are absent.
- Show Needs check explicitly beside high scores that fail exact quote/row support.
- Correct confidence help text to require both raw score and source support.

98 tests normal and compiled plus build pass. Visually checked phone Needs check beside unchanged 96.0% and no overflow. Production remains 3a61649. No provider calls, env changes, or new deployment attempts.
