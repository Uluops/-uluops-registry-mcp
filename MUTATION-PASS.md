# Mutation pass — P0m-1 (cross-version caveats)

Definition-version-dispositions spec v0.10.0 §11.20: every §11 control a phase owns is run against the defect it names, and must fail. The merged diff cannot show a reverted mutation, so each failing run below is a pushed branch holding the mutated tree; check one out and run `npx vitest run src/__tests__/cross-version-caveat.test.ts` to reproduce. Every branch is one commit on top of `main` at `ea391a4` and must never be merged.

Baseline (unmutated `main` `ea391a4`, 2026-10-03): 12 passed (12).

| Control | Defect it names | Failing run (branch @ sha) | Test that fails |
|---|---|---|---|
| Tool sets pinned independently of the arrays under test | a tool silently dropped from `POOLED_VERSIONS_TOOLS` (`get_health` removed) | `mutation/p0m/tool-list-drops-get-health` @ `bfa4311` | the tool lists match the pinned sets |
| Description carries the caveat | `get_lineage` description loses `CROSS_VERSION_CAVEAT` | `mutation/p0m/description-drops-caveat-get-lineage` @ `70f27e4` | get_lineage carries the cross-version caveat in description and response |
| Response carries the caveat | `get_lineage` handler loses its `responseNote` | `mutation/p0m/response-drops-note-get-lineage` @ `90328af` | get_lineage carries the cross-version caveat in description and response |
| Cross-version sentence pinned word for word | one word changed in the constant ("observational" → "informational") | `mutation/p0m/cross-caveat-one-word` @ `187e531` | pins the shared sentence word for word |
| Pooled-versions sentence pinned word for word | one word changed in the constant ("show" → "prove") | `mutation/p0m/pooled-caveat-one-word` @ `1fa04da` | pins the pooled-versions sentence word for word (A35, amendment AS) |

Each mutation failed exactly one test (1 failed, 11 passed); the commit body on each branch carries the vitest summary.

**Mutated at the constant, not its quotation.** The one-word controls edit `src/tools/cross-version-caveat.ts`'s exported string. An earlier control (2026-10-02) edited the docblock's quotation of the old wording and passed vacuously; these do not repeat that.

**Not run as a control.** "Tools outside both sets carry neither caveat" guards the other direction (a caveat leaking onto an unrelated tool). The §11 ownership table does not list it for P0m, so it has no branch here; its own floor assertion (`others.length > 10`) keeps it from passing on an empty set.
