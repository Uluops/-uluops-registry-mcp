# Mutation pass — P0m-3 (unversioned-figures caveat, CM)

Definition-version-dispositions spec v0.11.2 §4.1 (amendment CM), checklist P0m-3: "dropping a tool from the list, the description caveat or the response note fails; a one-word change in the new constant fails". Each failing run is a pushed branch holding the mutated tree, one commit on `feat/p0m-3-unversioned-caveat` at `7a36731`; the commit body carries the vitest summary. **Never merge a `mutation/p0m-3/*` branch.** Reproduce: `git checkout mutation/p0m-3/<slug>` and run `npx vitest run src/__tests__/cross-version-caveat.test.ts`.

Baseline (`7a36731`, 2026-10-08): 16 passed (16); `prepublishOnly` green.

| Control | Defect it names | Failing run (branch @ sha) | Test that fails |
|---|---|---|---|
| Tool set pinned independently of the array under test | `get_execution_stats` silently dropped from `UNVERSIONED_FIGURES_TOOLS` | `mutation/p0m-3/tool-list-drops-get-execution-stats` @ `6ab0238` | the tool lists match the pinned sets |
| Description carries the caveat | `get_ecosystem_overview` description loses `UNVERSIONED_FIGURES_CAVEAT` | `mutation/p0m-3/description-drops-caveat-get-ecosystem-overview` @ `5c84349` | get_ecosystem_overview carries the unversioned-figures caveat in description and response |
| Response carries the caveat | `get_execution_stats` handler loses its `responseNote` | `mutation/p0m-3/response-drops-note-get-execution-stats` @ `898bb7c` | get_execution_stats carries the unversioned-figures caveat in description and response |
| Sentence pinned word for word (the same literal is pinned in `@uluops/ops-mcp`) | one word changed in the constant ("compare" → "contrast") | `mutation/p0m-3/unversioned-caveat-one-word` @ `1d4193a` | pins the unversioned-figures sentence word for word |

Each mutation failed exactly one test (1 failed, 15 passed). The one-word control edits the exported string in `src/tools/cross-version-caveat.ts`, not a quotation of it. The first wording's sha256 was `1797c766…533f8e` (469 chars).

**Reworded before publish (`f09be0d`, review 2026-10-08).** The first sentence opened "Figures here that carry no definition version", exempting any figure with a version field: the CJ reading CL replaced (perverse-outcome P1, anxiety-reader F4). Alex chose provenance wording. New sha256, identical in both packages' built output: `1a674289ce2961c23009074bfd8577a9818aa81763f2234725dc965f24c4b3fc` (632 chars), recorded in spec §4.1 (BA). The list, description and response controls above are unaffected by wording; the one-word control is re-cut, and a guard gets its own:

| Control | Defect | Branch @ sha | Fails |
|---|---|---|---|
| Reworded sentence pinned word for word | one word changed ("compare" → "contrast") | `mutation/p0m-3/unversioned-caveat-one-word-v2` @ `5b96268` | the word-for-word pin (1 failed, 15 passed) |
| No presence-keyed exemption (CL) | a deliberate rewording back to "that carry no definition version", **constant and pin edited together**, which the pin alone cannot catch | `mutation/p0m-3/presence-keyed-exemption` @ `5eeb2b4` | the guard assertion `not.toMatch(/(that\|which) carry no (definition )?version/i)` |


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
