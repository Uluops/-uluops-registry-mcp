# Changelog

## [Unreleased]

## [0.8.0] - 2026-08-24

### Changed — MCP tool-sweep non-breaking batch (RG10, RG11, RG15)

- **`version` is optional on six read tools** (RG10): get_dependencies,
  get_dependents, is_forkable, list_forks, get_execution_stats, and
  get_fork_lineage default to the latest published version when version is
  omitted — read-only graph questions about "the current one" no longer force
  an extra version lookup. archive_definition, delete_definition, and
  retranslate_definition deliberately keep version required (terminal or
  content-mutating actions on a moving "latest" target).
- **diff_versions documents its formats honestly** (RG11): the description
  now says the default sections format collapses to ["agent"] for ADL
  (prefer fields), and documents the fields format's valueDiff
  diff-match-patch opcodes ([0]=unchanged, [-1]=removed, [1]=added).
- **fork_definition documents the version reset** (RG15): forks start at
  1.0.0 by design, and the default display_name derives from the new name.

## [0.7.0] - 2026-08-23

### Added — MCP tool-sweep error-module batch (RG5, T3)

- **Structured error envelope, at parity with the tracker MCP** (RG5): every
  error response now carries `error_type`, `tool` (threaded through all 44
  tools), the API's cause `code` when present, and a `suggestion`. The
  registry's messages were already the better-written half of the product —
  the guidance lived in prose ("Deprecate it first."); now it is also
  structured, so an agent working across both servers can branch on one
  contract. 404 remedies are resource-keyed and name the discovery tool
  (definition → `list_definitions`/`search_definitions`, model →
  `list_models`, alias → `list_aliases`, …) — the tracker's T7 pattern.
- **Cause-keyed 403s**: `INSUFFICIENT_SCOPE` (read key attempting a write —
  names the write-scope fix) and code-based role denials
  (`INSUFFICIENT_ROLE`/`ROLE_REQUIRED`, with the "Requires <role> role"
  message-match retained as fallback). The 402 branch gains a suggestion
  naming it a tier limit, not a permissions problem.
- **Protocol-layer validation errors are readable** (T3, via
  `mcp-secure-server` 0.0.20-security): a tools/call with missing/mistyped
  arguments returns `Invalid arguments for tool get_model — provider:
  Required; model_id: Required. Fix the named field(s) and retry` instead of
  the MCP SDK's raw Zod dump. Proven end-to-end over stdio.
- Zod-layer errors (`mapZodErrorToMcp`) carry `error_type`, `tool`, and a
  suggestion. 401 guidance names the key-management page.

## [0.6.0] - 2026-08-23

MCP tool-sweep batch 3 (mechanical tail). Pairs with registry API ≥0.55.0 and
`@uluops/registry-sdk` 0.51.0.

### Changed

- **`list_providers` is paginated** (RG9): `limit` (default 50, max 200) and
  `offset` params; the response `total` is the whole catalog. The unpaginated
  default had outgrown a single MCP response (~197 providers / 55KB).
  **Observable change: a bare call now returns the first page, not everything.**
- **`get_diff_impact` accepts `from`/`to`** (RG14), matching its sibling
  `diff_versions`; `from_version`/`to_version` still work. Same concept,
  adjacent tools, no more coin-flip.
- **`get_effectiveness` description conditions the `provenance.independent`
  claim** (RG12): the independent/selfReported split exists only once
  qualifying executions do — at zero executions those fields are absent and
  there is no headline figure to quote. The description said otherwise.

## [0.5.0] - 2026-08-22

MCP tool-sweep batch 2 (tracker project `mcp-tool-surface-sweep`). Pairs with
registry API ≥0.54.0 (RG16's `changed` flag; RG2's repointed aliases).

### Fixed

- **The `fields` projection no longer destroys responses silently** (RG1):
  - Unknown field names are REJECTED with the valid set listed, instead of
    silently dropped (the failure that returned 30 rows with no identity).
  - Single-object payloads (`{definition: {...}}` wrappers, mutation envelopes)
    are projected INTO rather than erased — a fork with `fields` now returns the
    projected fork instead of bare `{}` with no proof of the write.
  - A sibling collection whose schema matches none of the requested fields is
    dropped rather than emptied to N×`{}` (aliases beside models); requesting a
    container by its own name keeps it unprojected. Empty arrays keep their
    container shape.
- **`set_default_type` actually works** (RG4): every definition tool declared
  `type` schema-required, so the protocol layer rejected type-less calls with
  -32602 BEFORE the session default could inject — the tool reported success and
  gated nothing. `type` is now optional-with-session-default on definition tools
  (list-tool `type` FILTERS stay genuinely optional and unguarded), with an
  actionable error when neither an explicit type nor a default is present.
  Custom-parse tools (render_definition, update_and_publish) resolve the default
  explicitly; batch_publish items keep explicit required types by design.
- **`get_execution_stats.window` means days again** (RG3): documented in days,
  implemented in minutes — `window: 7` silently returned seven MINUTES reported
  as a weekly figure. The day-denominated contract stands; the tool converts to
  the API's minutes at the boundary and says so.

### Changed

- **`@uluops/registry-sdk` 0.4x → 0.50.0, `@uluops/sdk-core` 0.15.0 → 0.17.0** —
  the SDK bump carries the batch's new response fields (retranslate `changed`,
  version `status`, lineage `chain`/`depth`/`root`) through to tool responses;
  the sdk-core bump rides in the SAME change because registry-sdk nests 0.17
  and a 0.15 direct pin would leave two SdkApiError class identities in one
  process (the dual-identity instanceof hazard the ops-sdk rule documents).
- **Alias-float contract documented where authors meet it** (RG2 docs):
  `resolve_alias`/`list_aliases` now state that a bare alias tracks the current
  family model and is repointed each generation (qualified ids pin), and that
  the absence of a `fable` alias is deliberate.
- **`retranslate_definition` description surfaces `changed: boolean`** (RG16) —
  distinguishing a correct no-op from work that silently didn't happen.

## [0.4.0] - 2026-08-21

### Changed

- **`list_definitions` defaults to a compact per-item projection** (`type`, `name`, `version`,
  `status`, `visibility`, `description`), with `format: 'full'` restoring the complete ~30-field
  catalog item (RE-PROBE-02 N4). The public catalog passed 550 definitions, at which point an
  unprojected default page (50 items, 2-space pretty-printed) exceeded MCP client response
  limits — the default call failed for exactly the callers the tool exists for. Same shape as
  the `get_language` compact default (R1). Compact responses carry `format: 'compact'` as a
  marker. Consumers reading fields outside the compact set from default responses must now pass
  `format: 'full'` — that is the observable break, and it is deliberate.
- **`fields` filtering no longer leaks unrequested scalar-array fields** (RE-PROBE-02 N3).
  `filterResponseFields` treated every array-valued key as a list container and kept it
  unconditionally, so `get_definition(fields: [...])` returned `tags` regardless of the request.
  Scalar arrays are now leaf fields subject to the same membership test as any other key; arrays
  of objects (and empty arrays) keep container semantics. A consumer that relied on receiving
  `tags` without requesting it must add `tags` to its `fields` list.
- **`record_execution` denials now explain themselves** (RE-PROBE-02 R16). The tool is
  admin-only by design (executions are recorded by the runtime; the endpoint's role gate is the
  API's) but was returning the platform's bare `"Requires admin role"`. The tool stays in the
  toolset — the MCP server never learns the caller's role, so it cannot be conditionally hidden —
  and the 403 now states that executions are recorded automatically and user keys never need the
  tool. Generic role-gate 403s across all tools additionally carry `required_role` and a
  `suggestion` explaining that role-gated operations belong to the runtime/operators. The role
  detection is message-matched (`Requires <role> role`) because the SDK's `ForbiddenError`
  currently drops the API's structured `INSUFFICIENT_ROLE` code; switch to code-based branching
  when sdk-core retains 403 code/details.

- **`@uluops/registry-sdk` 0.48.0 → 0.49.0** (registry-api ADR-013 activation prerequisite).
  Definition reads now tolerate the drop-aware deep-analysis fields: `deep.errorReason`
  validates as shape rather than a closed enum that threw on unknown reasons (the vocabulary
  is server-owned and grows — `unrepresentable_findings` shipped 2026-08-18), and
  `deep.droppedFindings` survives parsing instead of being strip-mode deleted. Latent until
  the registry's deep worker activates; this bump must be live before it does.

### Removed

- **`min_subscription` from `update_definition`.** The registry stopped accepting it on
  2026-08-05 (NEX-01) — the field is inert metadata, frozen at `free` since the 2026-06-10
  pricing pivot. The API strips it silently rather than rejecting, so the tool would have kept
  reporting success while changing nothing.

  The `@uluops/registry-sdk` pin (`0.47.1`) still declares the field on `UpdateDefinitionBody`;
  it is removed in SDK `0.48.0`. Bumping the pin is a separate step and is not required for this
  change to be correct — the tool simply no longer sends it.

## [0.3.7] - 2026-07-27

### Security

- Runtime dependency tree cleared of all audit findings:
  - `@modelcontextprotocol/sdk` `1.29.0` → `1.30.0`
  - `hono` override `4.12.25` → `4.12.32` (the pinned override had itself
    entered the advisory range GHSA-xgm2/GHSA-hvrm/GHSA-w62v; 4.12.27+ is fixed)
  - `@hono/node-server` override → `2.0.12` (entire 1.x line is in the
    GHSA-frvp-7c67-39w9 range; only used by the protocol SDK's HTTP transports —
    this server is stdio-only — and the full suite passes under 2.x)
  - transitive `fast-uri` + `mcp-secure-server`'s `brace-expansion` refreshed
    via `npm audit fix`
- Remaining audit findings are dev-tooling-only with no runtime path: the
  brace-expansion DoS advisory (GHSA-mh99-v99m-4gvg) fanned across the
  eslint/typescript-eslint tree (fix requires the eslint@10 major), and a
  low-severity Windows-only esbuild dev-server advisory range-pinned by
  tsx/vite. Accepted, revisit on the next lint-stack upgrade.

### Changed

- Bump `@uluops/registry-sdk` `0.46.0` → `0.47.1`: `list_models`, `get_model`,
  and `resolve_alias` now pass through the model pricing block —
  `cost: { input, output, cacheRead?, cacheWrite?, sourceUpdatedAt? }`, USD per
  **million** tokens (models.dev convention). `null`/absent = unpriced; the
  registry never fabricates `{input: 0, output: 0}` (honest-absent polarity), so
  a rate of `0` never means "unknown". `sourceUpdatedAt` is models.dev per-model
  entry provenance, not a cost capture date — treat rates without it as
  provenance-unknown. Requires registry API `2026-07-26`+ (older APIs simply
  omit the block). No handler or ToolSpec change: handlers return the SDK model
  verbatim, and the block is ~100 bytes per model — negligible against the
  500 KB (list) / 50 KB (get) egress caps.

## [0.3.6] - 2026-07-22

### Changed

- Bump `@uluops/registry-sdk` `0.45.0` → `0.46.0`: `list_versions` now passes
  through per-version author identity — `createdByName` (creator username,
  `null` for deleted users) and `provenance` (the version's contributor
  record). Select them via the generic `fields` meta-parameter, e.g.
  `fields: ["version", "createdBy", "createdByName", "provenance"]`. Requires
  registry API `2026-07-22`+ (older APIs simply omit the fields). No handler
  or ToolSpec change: `fields` filtering is generic (tool-handler), and
  provenance contributor records are a few hundred bytes per version —
  negligible against the 500 KB egress cap even at the 200-version limit.

## [0.3.5] - 2026-07-18

### Changed

- Bump `@uluops/registry-sdk` `0.44.0` → `0.45.0`: `list_definitions` /
  `search_definitions` now pass through `analyzerStale` (`boolean | null`) on
  list items — verdict currency computed server-side (`null` = never scanned,
  `true` = verdict predates the registry's current analyzer and is demoted in
  search ordering, `false` = current). Informational only: deliberately NOT
  part of `isListVerdictTrustworthy` — consuming agents should surface it as
  a disclosure ("verdict may be outdated"), never as an un-trust signal. No
  handler or ToolSpec change (verbatim passthrough; one boolean per item is
  negligible against the 1 MB egress ceiling).

## [0.3.4] - 2026-07-17

### Changed

- Bump `mcp-secure-server` `0.0.17-security` → `0.0.19-security`:
  - Layer 1 limit rejections carry cap provenance (`STRING_LIMIT_EXCEEDED`
    names the offending field path; each rejection names the cap that fired).
  - `command.shellAccess` patterns require invocation context instead of bare
    mentions — directly relevant here: security-agent definitions
    (security-analyst, mcp-validator) legitimately reference attack patterns
    in `knowledge_base` examples, and prose mentions of `powershell`/`cmd.exe`/
    `/bin/sh` (including shebangs) no longer reject at the transport layer.
  - Layer 2 serialized-params cap is configurable (`maxParamBytes`, was
    hardcoded 50000 bytes).
- **Server config: `maxParamBytes: 500KB` and `suspiciousMessageSize: 500KB`**
  (`src/index.ts`) — aligned to the existing `maxMessageSize`/`maxStringLength`
  ceilings. Definition tools (`validate`/`create`/`update`) carry full YAML in
  a single field that can exceed 50KB; without these, the raised 0.0.17 string
  cap was moot because Layer 2's 50KB param cap and Layer 3's 50KB
  suspicious-message hard block (basic preset) fired first — the same
  stacked-ceiling failure observed on the tracker MCP (positional-sweep
  run #19, 2026-07-17).

## [0.3.3] - 2026-07-12

### Changed

- Bump `@uluops/registry-sdk` to `0.44.0` — `list_definitions`/`search_definitions`
  now pass through the list-grain risk scalars (`riskLevel`/`scanStatus`/`deepStatus`)
  the registry API emits since the risk-verdict list projection (2026-07-12). No
  handler or ToolSpec change (verbatim passthrough; three scalars are well within
  egress limits). Consuming agents can rank/warn during discovery without a
  per-definition `get` — gate `riskLevel` on the SDK's `isListVerdictTrustworthy`
  (absent/null triple = pending, never clean; `none` + `scanStatus:'failed'` is a
  sentinel).

## [0.3.2] - 2026-07-07

### Changed

- Bump `@uluops/registry-sdk` to `0.41.0` — `effectiveness.passRate` is nullable (D11:
  agents report `null`, quality for agents is participation-based and score-only; a
  run-level gate result cannot be attributed to one constituent). `get_effectiveness`
  description explains the agent semantics so models render the null honestly.

## [0.3.1] - 2026-07-07

### Changed

- Bump `@uluops/registry-sdk` to `0.40.1` — `QualitySegment.actorCount` (the voting
  population a segment's numbers rest on) passes through the schemas; "based on N users"
  copy must use it, never `voterCount` (which is honestly 0 under a blend-mode score).

## [0.3.0] - 2026-07-07

### Changed

- Bump `@uluops/registry-sdk` to `0.40.0` — the SDK's zod schemas now pass the additive
  `provenance` block through (older SDKs' default `.strip()` silently dropped it), so
  `get_effectiveness` responses carry `metrics.provenance` with the independent vs
  selfReported quality split, and the per-version analytics tools carry the name-scoped
  provenance block.
- `get_effectiveness` / `get_health` tool descriptions now explain the voter-weighted
  quality semantics: one actor one vote, `provenance.independent` as the headline figure,
  the provisional-until-3-actors confidence label, and health's actor-diversity gate.


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.18] - 2026-07-06

### Dependencies

- **sdk-core `0.14.0` → `0.15.0`, registry-sdk `0.38.0` → `0.39.0`** (the sdk-core
  0.15.0 coherent set). sdk-core 0.15.0 adds the streaming transport; this MCP does
  not consume it — pin-alignment only, collapsing the tree to a single
  `sdk-core@0.15.0`. No behavior change.

## [0.2.17] - 2026-07-02

### Dependencies

- **sdk-core `0.13.0` → `0.14.0`, registry-sdk `0.37.0` → `0.38.0`** (backfilled entry
  for the 0.14.0 cascade adoption; pin-alignment only).

## [0.2.16] - 2026-06-28

### Added

- **`uniqueExecutionCount` accepted as a `sortBy` value** on `list_definitions` (`SortFieldSchema` now `name | createdAt | updatedAt | executionCount | uniqueExecutionCount`). The registry exposes two execution counts — `executionCount` (total runs) and `uniqueExecutionCount` (distinct actors, gaming-resistant) — and the "popular" discovery rail ranks on the latter; this lets MCP callers sort by it.

### Changed

- **Bumped `@uluops/registry-sdk` `0.36.0` → `0.37.0`**, which adds `uniqueExecutionCount` to the definition shapes and to the SDK's `SORT_FIELDS`, so the new sort value passes the SDK's parameter handling.

## [0.2.15] - 2026-06-22

### Added

- **`renderProfile` parameter on `render_definition`** (`core` | `uluops-full`). Callers can now request the full UluOps render profile — failure taxonomy reference, failure-code guidance, tracker frontmatter, and JSON output block where the agent role supports them — instead of the `core` default. Threads through to `registryClient.render.get`, which forwards it as a query param to the registry. Verified end-to-end: an explorer rendered with `renderProfile: uluops-full` includes the `## Failure Taxonomy Reference` table; `core` omits it.

## [0.2.14] - 2026-06-17

### Fixed

- **Raised the per-string-parameter cap so realistic definition YAML passes through direct MCP fields.** `validate_definition` / `create_definition` / `update_definition` rejected full YAML in a single string field with `STRING_LIMIT_EXCEEDED` ("String parameter too long: N chars (max: 5000)") — the `mcp-secure-server` default per-string cap — even though the per-tool `maxArgsSize` already allowed 500 KB–1 MB. Bumped `mcp-secure-server` 0.0.16-security → 0.0.17-security (which exposes `maxStringLength` at server-create time) and set `maxStringLength: 500 * 1024` to align the per-string cap with the message ceiling. Proven: a 7842-char string parameter now passes structure validation where it previously failed. 354 tests green.

## [0.2.13] - 2026-06-17

### Added

- **`format` parameter on `get_language`** (`compact` default | `full`). `compact` returns a condensed schema digest — leaf fields collapse to one-line signature strings (`"req · string enum[a|b|c] · description"`), `$defs` stay flat with `→name` ref-pointers, `enum`s are complete, and `if`/`then`/`oneOf`/`allOf` conditional requirements (including `forbidden` fields) are preserved — sufficient to author a valid definition while ~50–75% smaller as emitted (ADL 87.6 KB → 41.8 KB). Dropped vs. full: patterns, length/range bounds, examples, `format`, `additionalProperties`. `format:'full'` returns the complete JSON Schema unchanged (default behavior preserved for that mode). Pure MCP-layer transform — no registry-api/SDK change. Live-verified end-to-end against a local registry (authored and validated a real ADL agent from the compact digest alone).

## [0.2.12] - 2026-06-16

### Changed

- **Bump `@uluops/registry-sdk` 0.33.0 → 0.35.0 and `@uluops/sdk-core` 0.11.1 → 0.13.0** (both exact). registry-sdk 0.34.0 added the real `ResponseValidationError` (response-schema failures now stay inside the `RegistryApiError` hierarchy) plus root exports for the safety/`riskProfile` types and `RetranslateResult`; 0.35.0 re-pinned `sdk-core` to 0.13.0. The direct `sdk-core` pin is moved in lockstep so the tree resolves a single `sdk-core` copy (consistent error-class `instanceof`). sdk-core 0.13.0 fixes pulled in: `retries: 0` makes one attempt and surfaces the real typed error; actionable 401 (server reason preserved + guidance); `isApiKey()` enforces minimum length. Pure passthrough — no tool-schema change. 348 tests green.

## [0.2.11] - 2026-06-16

### Changed

- **Bump `@uluops/registry-sdk` 0.32.0 → 0.33.0.** Surfaces the durable fork source-identity snapshot through the fork tools: `get_fork_lineage` (and the fork list/create paths) now return `sourceType` / `sourceName` / `sourceVersion` on the fork record plus `sourceAvailable` on lineage, so a fork's origin is readable even after the source is deleted (requires registry API ≥ V1 `2026-06-16`). Pure passthrough — no tool-schema change. Live-verified end-to-end against a local registry.

## [0.2.10] - 2026-06-11

### Security

- **Bump `mcp-secure-server` 0.0.15-security → 0.0.16-security.** Picks up the `executionWrappers` word-boundary fix: the `System Call` (`/system\s*\(/`) and `Exec Call` (`/exec\s*\(/`) content-layer patterns were unanchored, so benign prose like `filesystem (` matched the `system (` substring and was rejected as a CRITICAL command-injection attempt. The new `\b`-anchored patterns still catch real `system(`/`exec(` calls. Drop-in patch, no API change; build + dist unchanged.

## [0.2.9] - 2026-06-08

### Internal

- **Strengthen `prepublishOnly` script** to match the other public `@uluops/*` packages (ops-sdk, registry-sdk, ops-mcp 0.4.3, cli): `npm run lint && npm test && npm audit --audit-level=high --omit=dev && npm run build`. The prior `prepublishOnly` ran only `npm run build`, so `npm publish` skipped lint+test+audit and relied on the developer to remember to run them manually. Aligning the safety net with the rest of the public surface. No behavior change in the runtime package.

## [0.2.8] - 2026-06-08

### Dependencies

- **Bump `@uluops/registry-sdk` 0.30.2 → 0.31.1.** Wave-coordination bump for the live-tests T2 wave (R12 envelope rewrite + post-impl r2 hardening). Picks up:
  - **R12 envelope schemas** (0.31.0): `dependencies.get()` and `dependencies.getDependents()` now return real typed envelopes (`DependencyGraphResponse` with recursive `graph` + `flat` + `totalCount` + `maxDepth`; `DependentsResponse` with `Dependent[]` carrying `context`). Replaces the all-optional `dependencyGraphSchema` that silently parsed every real response as `{}`. The MCP layer passes SDK return types through opaquely, so no source changes here — but consumers of `get_dependents` / `get_dependencies` now receive the typed envelope shape via JSON-serialized tool responses.
  - **CWE-674 pre-parse depth guard** (0.31.1): `dependencies.get()` checks the envelope's `maxDepth` field before the recursive Zod parse runs, throwing `RangeError` when > `MAX_SAFE_GRAPH_DEPTH` (50, ~7× the live-verified production max of 7). A malicious or pathological 10k-deep payload would otherwise exhaust the V8 call stack via the recursive `z.lazy()` walk.
  - **CWE-20 defensive string ceilings** (0.31.1): `.max()` bounds on `name` (100), `version` (20), `context` (255) across `dependencyNodeSchema`, `flatDepSchema`, and `dependentSchema`. Oversized payloads convert from silent memory pressure into a loud `ZodError` at parse time.

Build + 348 tests pass on the new pin. No source changes in this package.

## [0.2.7] - 2026-06-07

### Fixed

- **Bumped `mcp-secure-server` 0.0.14-security → 0.0.15-security** (`package.json:67`) to pick up the `top`/`whoami` false-positive fix. The 0.0.14-security `command.systemInfo` regexes used `\b<cmd>\s*` — the `\s*` quantifier matches zero whitespace, so any identifier beginning with those letters tripped the COMMAND_INJECTION layer (`topPerformers`, `topology`, `topic`, `whoamiHandler`, etc.). Surfaced on 2026-06-07 when Codex called `get_ecosystem_overview({ fields: ["topPerformers"] })` and the request was rejected by layer 2 as `Top Process Monitor` before reaching the registry's subscription-tier check. Every other `fields` value reached the intended 403 — the field name was the sole trigger. The bidirectional `\b<cmd>\b` form in 0.0.15-security continues to block real shell invocations (`top`, `top -o cpu`, `top | head`, `top; ls`, `whoami`, `whoami | grep root`) but rejects identifier substrings cleanly. Verified via Verdaccio publish + install + live regex probe before npm promotion.

## [0.2.6] - 2026-06-07

### Fixed

- **Entry-point guard now resolves symlinks before comparing** (`src/index.ts:187-208`). The 0.2.5 guard compared `process.argv[1]` against `fileURLToPath(import.meta.url)` by literal string equality. That works under `node dist/index.js` but breaks silently under `npx -y @uluops/registry-mcp` — npx creates a `node_modules/.bin/<name>` symlink in a temp dir and execs that, so `argv[1]` is the symlink path while `import.meta.url` resolves to the symlink's target. The two strings never match, `isEntryPoint` returns false, `main()` never runs, and the process exits 0 with **no output on stdout or stderr** — not a "version mismatch" or a "couldn't find binary" — pure silence. Every Codex/Claude harness that pinned this package via `npx -y @uluops/registry-mcp@<v>` got a server that started, immediately exited, and produced no diagnostic the user could grep on. The new `resolvedEqualsModule()` helper calls `realpathSync` on both sides before comparing, normalizing the npx-symlink case while preserving the test-isolation property (vitest's runner is `argv[1]` during tests, not this file). Caught on 2026-06-07 after the 0.2.5 ship — the `definition-factory` fix made the package installable but didn't surface this second-layer bug because `node dist/index.js` (the diff probe used to verify 0.2.5) always matched argv[1] to the real path.

### Internal

- Added `realpathSync` import from `node:fs` to support the new guard. No new runtime dependencies — `realpathSync` ships with Node.

## [0.2.5] - 2026-06-07

### Fixed

- **Removed stale `@uluops/definition-factory` dependency** (`package.json:65`). The dep was listed at `0.36.0` but never imported by any source or compiled output — pure dead weight from an earlier prototype. Because `@uluops/definition-factory` is published as a **restricted** package on npm, every external `npx -y @uluops/registry-mcp` failed at install time with an unauthorized-package error before the binary ever started. `@uluops/ops-mcp` connected fine because it never had this dep; same `npx -y` launch shape, different resolution outcome. Surfaced on 2026-06-07 when WSL Codex couldn't connect to the registry MCP server while the tracker MCP server worked from the get. Local launches via `node dist/index.js` masked the bug because the dev's npm install can resolve org-restricted packages — only `npx -y` in an isolated tmp dir exhibits the failure. Build + dist + tests unchanged with the dep removed.

## [0.2.4] - 2026-06-07

Docs + packaging polish. Adds the standard 5-badge set to the README matching the rest of the public UluOps packages, and closes a packaging hygiene gap — the package declared `"license": "MIT"` but shipped without the LICENSE file. No behavioural change.

### Added

- LICENSE file (MIT, Copyright (c) 2026 UluOps) at the repo root. The package previously declared `"license": "MIT"` in `package.json` but the file was absent. Adding it makes the license terms reachable both from a GitHub-cloned consumer and from an unpacked npm tarball.
- LICENSE listed in the `files` array so it ships in the published tarball. Without this entry the LICENSE would have been added to the repo but excluded from the npm package — the same hygiene gap from a different angle.

### Changed

- README header gains the five shields.io badges (npm version, MIT license, node engine, TypeScript 5.7+, tests passing) immediately under the package name, matching the `@uluops/core` package presentation. The tagline was already present from the v0.2.3 ship; this completes the visual alignment with the rest of the public UluOps surface. Tests badge points to `src/__tests__/` (the actual test home in this repo).

## [0.2.3] - 2026-06-05

Polish release. Six tracker findings closed: documentation freshness,
filesystem availability + symlink hardening, src-tree naming alignment,
402 upgrade-URL prompt-injection guard, and 19 lint warnings removed
from the security-boundary module.

### Fixed

- **`readYamlFile` now wraps `realpathSync(WORKSPACE_DIR)` in a try/catch.** A typo'd `WORKSPACE_DIR` env var, an unmounted NFS path, or a fresh container where the dir hadn't been created yet previously threw an opaque `ENOENT` for the workspace root rather than the file the user actually asked about. The error message now names WORKSPACE_DIR explicitly and tells the user how to fix it.
- **`validateLogDir` now dereferences symlinks before the containment check (CWE-59).** A symlink at `LOG_DIR` could previously escape the cwd/`/tmp/` constraint because `resolve()` doesn't follow symlinks. Also dereferences the comparison anchors (cwd, `/tmp/`) so macOS's `/tmp` → `/private/tmp` symlink no longer breaks the legitimate `/tmp/...` case. Only active when `ENABLE_FILE_LOGGING=true`.
- **402 `upgradeUrl` now passes through a protocol/host guard before being embedded in MCP responses (CWE-601).** A compromised or malicious registry server could previously emit `javascript:`, `data:`, or off-domain URLs in the 402 response body, landing them in the consuming agent's context window as prompt-injection bait. The guard restricts the embedded URL to `https://` and host suffix `.uluops.ai` (or apex `uluops.ai`); anything else is dropped and the agent sees an upgrade message without a follow-able URL. Mirrors the SSRF defense in `config/index.ts`.

### Changed

- **`src/tools/check-forkable.ts` renamed to `src/tools/is-forkable.ts`.** The file registers `is_forkable` (renamed in v1.13.0 of the legacy package); the source filename was a legacy artifact. Internal-only rename — the tool name, schema, and behavior are unchanged.
- **19 `@typescript-eslint/strict-boolean-expressions` lint warnings cleared from `sdk-error-mapper.ts`.** The security-boundary module is now lint-clean. Every implicit truthiness check was converted to explicit `!== undefined` / `!== ''` / `=== true` form. No behavior change — but the file is now easier to reason about as code paths near credential redaction.
- **`isApiKey` detection in `src/index.ts` uses explicit `=== true`** for the optional-chained `startsWith('ulr_')`. Same intent as before; falls through to session-token auth when `apiKey` is undefined. Linter-friendly.
- **README test count updated to 348** (was stale at 329).



Hardening pass against the ship-pipeline findings. No new tools. No
breaking changes to existing tool contracts (the new `render_definition`
`overwrite` parameter defaults to `false` — agents that previously
silently overwrote files now receive a clear error response and need to
opt in).

### Fixed

- **`patchYamlVersion` now handles prerelease and build-metadata semver.**
  The regex `\d+\.\d+\.\d+` was extended to `\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?`. Previously, source YAML with `version: 1.0.0-rc.1` would leave the `-rc.1` suffix stranded after the replacement, producing malformed YAML that the API would reject. Closes the AF-006 audit trigger that was acknowledged at v0.2.0 ship time.
- **`update_and_publish` create-fallback now guards `created.version`.** A malformed SDK response with a missing `version` field would have been silently passed through to `publish()`, producing a `/versions/undefined` URL and a 404 for a draft that was just successfully created. The handler now throws a descriptive error if `created.version` is missing or empty.
- **`render_definition` no longer silently overwrites existing files.** New `overwrite: boolean` parameter (default `false`). When false (the default) and `output_path` resolves to an existing file, the tool returns a clear MCP error rather than destroying the prior content. Agents that need replacement semantics must explicitly pass `overwrite: true`.
- **`batch_publish` per-item errors now carry rich SDK context.** Previously each failed-item entry only carried `error` (message) and `status`. The per-item catch now routes through a new `extractErrorContext(error)` helper that surfaces 402 `upgrade_url` + `required_tier` + `current_tier`, 429 `retry_after`, and 409 `nextAvailable` exactly as single-call tools do via `mapSdkErrorToMcp`.
- **MCP server now auto-runs on the proper ESM entry-point check** instead of `NODE_ENV !== 'test'`. A stray `NODE_ENV=test` in the user's shell, CI, or `direnv` no longer silently disables `main()` — the harness would have started and hung waiting for stdio JSON-RPC that never arrived. Tests already import `main` directly and call it; no test changes needed.

### Changed

- **`isNumericSchema` swapped Zod `_def.innerType` access for Zod's public `unwrap()` / `removeDefault()` API.** Avoids coupling to Zod private internals that can rename across minor versions and would silently disable numeric coercion at the MCP boundary if Zod's `_def` shape ever changes.
- **`isPublishedStatusError` extracted to a shared `src/utils/error-guards.ts` module.** Previously this 3-line guard was duplicated verbatim across `update-definition.ts` and `update-and-publish.ts`. A future change to the underlying API error message now updates one location instead of two.
- **Added `prepublishOnly: npm run build` script.** Future `npm publish` runs no longer rely on the maintainer remembering to build first.

### Added

- **`extractErrorContext(error)` helper in `client/sdk-error-mapper.ts`** — returns the same structured fields (`status`, `required_tier`, `upgrade_url`, `retry_after`, `nextAvailable`) that `mapSdkErrorToMcp` produces, but without wrapping them in an MCP envelope. Used by `batch_publish`.

### Tests

348 tests pass (was 345, +3 regression coverage):
- New: `patches prerelease semver versions in yaml during create fallback`
- New: `refuses to overwrite an existing file when overwrite is not opted into`
- New: `writes to existing file when overwrite: true is passed`

## [0.2.1] - 2026-06-05

### Changed

- **Backend URL resolution deferred to the SDK.** Previously the MCP server
  shadowed `@uluops/registry-sdk`'s `DEFAULT_BASE_URL` with its own copy
  and effectively required `ULUOPS_REGISTRY_URL` (treating empty/undefined
  as "use the shadow constant"). The SDK already resolves the correct
  production URL (`https://api.uluops.ai/api/v1/registry`) by default and
  switches to localhost when `NODE_ENV=development`; the MCP now passes
  `baseUrl` through as `undefined` when the env var is unset/empty and lets
  the SDK own URL resolution. Public consumers no longer set anything but
  `ULUOPS_API_KEY`. README's configuration table reduced to consumer-
  relevant variables; `ULUOPS_REGISTRY_URL` removed from the public
  surface (still honored by the code when explicitly set).
- **SSRF defense and host allowlist now gate on `baseUrl !== undefined`.**
  When the operator does not set `ULUOPS_REGISTRY_URL` the SDK uses a
  trusted compile-time constant, so the URL-parse/allowlist/private-host
  checks are skipped — they only run when an operator explicitly provides
  a URL that needs validation. Identical behavior for any URL that was
  previously accepted; previously-rejected URLs are still rejected.
- **Pairs with `@uluops/setup@0.6.4`** which stopped stamping
  `ULUOPS_REGISTRY_URL` into `.mcp.json` files during onboarding, and with
  `@uluops/ops-mcp@0.2.1` which applied the same fix to the ops tracker.

### Internal

- `DEFAULT_BASE_URL` constant removed from `src/config/index.ts`.
- `ApiClientConfig.baseUrl` type widened to `string | undefined`.
- Startup log apiUrl line shows `(SDK default)` when baseUrl is unset.

## [0.2.0] - 2026-06-05

First release of the monorepo `@uluops/registry-mcp` package at parity
with the standalone `uluops-registry-mcp` 0.1.1 codebase, prepared for
first public npm publish under the scoped name.

### Added

- **`list_languages` and `get_language` tools** — language registry
  read tools surfaced through the MCP server.

### Changed

- **`@uluops/registry-sdk` bumped `^0.27.2` → `0.30.2`** (three minor
  versions). Pulls in 0.29.0 publish-warning surfacing, 0.30.x sdk-core
  security hardening cascade, and the schema-removal cleanup.
- **`@uluops/sdk-core` confirmed at `0.11.1`** with `redirect: 'error'`
  on all fetch sites, control-character stripping, and widened sensitive-
  key coverage (`x-api-key`, `set-cookie`, `proxy-authorization`).
- **All runtime and dev dependencies pinned to exact versions** per the
  2026-06-01 UluOps supply-chain hardening policy.
- **`vitest` and `@vitest/coverage-v8` bumped to `4.1.8`** — eliminates
  the moderate-severity esbuild advisory chained through vite. `npm audit`
  now reports 0 vulnerabilities.

### Not included

- **`sync_models` admin tool deliberately excluded.** Calls a private
  registry admin endpoint not exposed through the public SDK; reserved
  for internal use and intentionally never shipped in this public package.

### Historical lineage (legacy `uluops-registry-mcp` versions below)

## [1.14.0] - 2026-05-20

### Changed
- Custom credential redaction replaced with `sdk-core` `sanitizeString`

## [1.13.0] - 2026-05-18

### Changed
- `check_forkable` MCP tool renamed to `is_forkable`
- SDK method calls updated for `registry-sdk` v0.21.0 renames

## [1.12.0] - 2026-05-15

### Changed
- `forks.getLineage` renamed to `forks.getAncestry` after SDK rename

## [1.11.0] - 2026-05-07

### Added
- `nextAvailable` version surfaced in 409 conflict MCP response

### Fixed
- Definition write tool limits bumped to 1MB for large agent YAML files

## [1.10.0] - 2026-04-30

### Added
- `target` and `model` params on `render_definition` MCP tool

## [1.9.0] - 2026-04-28

### Added
- 402 `SubscriptionRequired` error handling with `source=mcp` tracking

## [1.8.0] - 2026-04-27

### Added
- `provenance` input on `create_definition` and `update_definition` tools
- `authorshipType` filter on `list_definitions` and `search_definitions` tools

## [1.7.0] - 2026-04-15

### Fixed
- `get_diff_impact` handler parameter access corrected

## [1.6.0] - 2026-04-12

### Added
- Pagination on `list_versions` tool
- `format` param on `diff_versions` tool (field-level, unified, summary)
- Session token authentication as alternative to API keys

## [1.5.0] - 2026-04-09

### Fixed
- `file_path` resolved before Zod parse in `update_and_publish`

## [1.4.0] - 2026-04-07

### Added
- `archive_definition` MCP tool
- `archived` status added to `DefinitionStatusSchema`
- `is_fork` filter on `list_definitions` and `search_definitions`
- 8 analytics tools: `get_effectiveness`, `compare_effectiveness`, `get_execution_stats`, `get_evolution`, `get_health`, `get_ecosystem_overview`, `get_translation_analytics`, `get_translator_version`

### Fixed
- `archive_definition` tool spec added to security registry
- `isFork` uses camelCase after `normalizeKeys` transformation

## [1.3.0] - 2026-03-29

### Added
- Org slug support via `ULUOPS_ORG_SLUG` env var

### Fixed
- Error handling overhauled for actionable agent-facing messages

## [1.2.0] - 2026-03-01

### Added
- Composite workflow tools: `update_and_publish`, `batch_publish`
- Summary mode as default for version diff
- `cognitive-lens` and `explorer` added to domain enum
- Production URL default so users only need API key

### Fixed
- String-typed numeric params coerced before Zod validation
- Symlink traversal prevented in file reads and writes (CWE-59)

## [1.1.0] - 2026-02-21

### Added
- `file_path` parameter on `create_definition`, `validate_definition`, `update_definition`, and `upgrade_definition` — read YAML from disk
- `output_path` on `render_definition` for direct file writing
- Session defaults, richer search, and response field selection
- Smart version-up on published or missing versions in `update_definition`
- Mutation tool responses trimmed of `yaml`/`runtimeMd` for conciseness
- `fields` meta-parameter exposed in MCP tool schemas

### Security
- Directory containment on `output_path` in `render_definition` (CWE-22)
- Directory containment on `file_path` in YAML tools (CWE-22)

### Fixed
- Redundant type assertions removed in `trimDefinitionResponse`
- Template expression safety for `fsError.code` in `readYamlFile`
- Double assertion pattern replaced with runtime type guard
- Dynamic imports replaced with static imports in `render_definition` catch block
- 70+ ship pipeline validation issues resolved across security, docs, type safety, and tests

## [1.0.0] - 2026-02-16

### Added
- Initial release of UluOps Registry MCP client
- 31 tools across 8 domains: definitions, models, versions, dependencies, forks, executions, translation, users
- 4 resources via `registry://` URI scheme
- `createToolHandler` factory with Zod validation, snake_case→camelCase normalization, and SDK error mapping
- Security hardening via `mcp-secure-server` with per-tool rate limits and payload size controls
- Error sanitization stripping sensitive data (API keys, tokens, stack traces) from MCP responses
- Test suite with 194 tests covering all tools, resources, and registry config

[Unreleased]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.9...HEAD
[0.2.9]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/Uluops/-uluops-registry-mcp/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Uluops/-uluops-registry-mcp/releases/tag/v0.2.0
[1.14.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Uluops/-uluops-registry-mcp/releases/tag/v1.0.0
