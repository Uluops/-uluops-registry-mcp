# registry-uluops-mcp Ship Pipeline Results

**Target**: registry-uluops-mcp
**Timestamp**: 2026-02-16T17:38:50
**Pipeline**: ship

---

## Summary

| Agent | Score | Status |
|-------|-------|--------|
| Code Validator | 91/100 | PASS |
| Type Safety | 93/100 | SAFE |
| Test Architect | 86/100 | APPROVED |
| Code Auditor | 95/100 | SOUND |
| Public Interface | 90/100 | POLISHED |
| Security | 90/100 | SECURE |
| API Contract | 84/100 | CONSISTENT |
| Release Readiness | 78/100 | CONDITIONAL |

**Weighted Average**: 89.9/100
**All Gates Passed**: Yes (Release Readiness at 78 is CONDITIONAL but not blocking)

---

## Recommendations

### Critical (Fix Before Ship)

- [ ] **[api-contract]** `list_definitions` tool: `page`, `sort`, `order` fields silently dropped — normalizeKeys only converts underscore-delimited keys, but SDK expects `offset`, `sortBy`, `sortOrder` (`src/tools/list-definitions.ts`)
- [ ] **[api-contract]** `list_definitions` tool: `tags` field passes through as-is but SDK expects `tag` (singular) (`src/tools/list-definitions.ts`)
- [ ] **[api-contract]** `get_dependencies` tool: `depth` and `flat` fields silently dropped — single-word keys not converted, SDK expects `maxDepth` (`src/tools/get-dependencies.ts`)

### Suggested (Review Before Ship)

- [ ] **[api-contract]** `create_definition` tool: `description` and `tags` fields present in Zod schema but may not reach SDK correctly due to normalizeKeys pass-through (`src/tools/create-definition.ts`)
- [ ] **[api-contract]** `list_models` tool: `search` field is single-word, passes through normalizeKeys unchanged — verify SDK accepts `search` as-is (`src/tools/list-models.ts`)
- [ ] **[api-contract]** `retranslate_definition` tool: `force` field is single-word, passes through unchanged — verify SDK method signature accepts `force` in options object (`src/tools/retranslate-definition.ts`)
- [ ] **[security]** Resource handlers (definitions, models, providers) expose raw `error.message` in responses — potential information disclosure (CWE-209) (`src/resources/definitions.ts`, `src/resources/models.ts`, `src/resources/providers.ts`)
- [ ] **[code-auditor]** `preProcess` type guard in `tool-handler.ts` uses runtime property check that could break if SDK changes response shape (`src/utils/tool-handler.ts`)
- [ ] **[code-auditor]** Resource handlers lack per-call timeout — a slow API response could block the MCP server indefinitely (`src/resources/definitions.ts`)
- [ ] **[public-interface]** README states rate limits as "60 req/min read, 20 req/min write" but tool-registry.ts has varied values per tool (`README.md`)
- [ ] **[public-interface]** README missing documentation of `ULUOPS_REGISTRY_TIMEOUT` and `ULUOPS_REGISTRY_RETRIES` environment variables (`README.md`)
- [ ] **[public-interface]** `setup.sh` references `TOOL_POLICIES_PATH` env var but config loads from hardcoded tool-registry.ts (`setup.sh`)
- [ ] **[test-architect]** Most tool tests verify SDK call arguments but lack response-shape assertions — could miss response transformation bugs (`src/__tests__/tools.test.ts`)
- [ ] **[test-architect]** `normalizeKeys` tests missing depth boundary and mutation safety cases (`src/__tests__/tools.test.ts`)

### Backlog (Post-Ship)

- [ ] **[release-readiness]** Missing CHANGELOG.md — no release history documentation (`CHANGELOG.md`)
- [ ] **[release-readiness]** `mcp-secure-server` dependency is pre-release (^0.1.0) — may have breaking changes (`package.json`)
- [ ] **[release-readiness]** No `--version` CLI flag or version reporting mechanism (`src/index.ts`)
- [ ] **[release-readiness]** Missing `repository` field in package.json (`package.json`)
- [ ] **[type-safety]** 4 ESLint `@typescript-eslint/no-unsafe-*` rule overrides in tool files — acceptable for normalizeKeys boundary but worth documenting rationale (`eslint.config.js`)
- [ ] **[code-validator]** Consider extracting shared Zod schemas (DefinitionIdentifierSchema used in 15+ tools) into a dedicated constants file (`src/types/schemas.ts`)
