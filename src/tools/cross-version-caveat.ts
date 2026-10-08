/**
 * Caveats for every tool whose figures span more than one definition version.
 *
 * Two shapes, one rule (definition-version-dispositions spec §4.1, amendments AC and AH):
 * a figure computed from more than one version's runs is not evidence about an edit,
 * whether the versions are reported side by side or pooled into one number.
 *
 * - CROSS_VERSION_CAVEAT: responses that report quality for several versions side by
 *   side (lineage, evolution, effectiveness compare, diff impact, translation analytics).
 * - POOLED_VERSIONS_CAVEAT: responses that take a `version` argument but compute over
 *   every version of the definition. getEffectiveness queries the tracker by name only
 *   (uluops-registry-api analytics-service.ts, "Aggregates all runs across all
 *   versions"), and getHealth derives from it.
 *
 * Why both the description and the response carry them: a model reads the description
 * when it chooses a tool and the response when it writes the answer; a caveat in the
 * description alone is gone by the time the payload's trend or ranking is quoted.
 *
 * Why the wording names "alone or combined": 0.11.1 said "from these figures alone",
 * which licensed a ranking as soon as any second source (such as a dispositions
 * record) was added (A31 review, run #65).
 *
 * Why it names the pooled figures: 0.11.2 said "each version ran in its own period, on its own artifacts" of
 * every figure. Health, failure-domain and taxonomy figures are computed over every version and persisted under
 * whichever version was requested (registry-api getEffectiveness → definition_metrics), so lineage, evolution and
 * compare show one pooled figure stamped per version; a difference there reflects recompute time, not the version
 * (A33 review, run #66). The sentence is identical in @uluops/registry-mcp and @uluops/ops-mcp; each package's test
 * pins it word for word.
 *
 * Why "may" and "possibly" (0.11.4 / 0.27.1): 0.11.3 / 0.26.2 said these figures "pool every version". The
 * issue-derived parts are not pooled: getEffectiveness filters issues to the definitionId of whichever run carries one
 * first (registry-api analytics-service.ts, tracker issue 7ed97aa5), and its runs carry no org filter. The fix for
 * 7ed97aa5 is not yet chosen, so the sentence is written to stay true both before and after it (A35 review, run #67,
 * amendment AS). Execution counts are named because AN put volumes into the class rule (they are the same pooled
 * count stamped per version row).
 */
export const CROSS_VERSION_CAVEAT =
  'Cross-version figures here are observational. Some may not be per-version at all: health, failure-domain, ' +
  'taxonomy and execution-count figures, where present, may be computed for the definition rather than the ' +
  'version they are shown under (pooling its runs across versions, and possibly across orgs, or taking ' +
  'issue-derived parts from a single version that need not be the one shown) and are stored against a version ' +
  'whenever it is recomputed, so a difference between versions there can reflect when and how each was recomputed ' +
  'rather than the versions. Pass rates and scores, where per-version, come from each version\'s own runs in its ' +
  'own period, on its own artifacts, and are the agent\'s own assessments of those artifacts, so an edit that ' +
  'changes how lenient it is moves them without changing quality. No difference between versions here is evidence ' +
  'that an edit made the definition better or worse; do not rank versions or recommend one on the basis of these ' +
  'figures, alone or combined with other figures.';

export const POOLED_VERSIONS_CAVEAT =
  'These figures are not specific to the requested version: run-based figures pool every version of the ' +
  'definition run in the window (possibly across orgs), and issue-derived figures (false-positive, declined and ' +
  'resolution rates, taxonomy, and the parts of health built from them) may come from a single version that need ' +
  'not be the one requested. They cannot show whether one version differs from another. Do not compare these ' +
  'figures across versions, and do not report them as the requested version\'s.';

/** Tools whose descriptions and responses must carry CROSS_VERSION_CAVEAT. */
export const CROSS_VERSION_TOOLS = [
  'get_lineage',
  'get_evolution',
  'compare_effectiveness',
  'get_diff_impact',
  'get_translation_analytics',
] as const;

/** Tools whose descriptions and responses must carry POOLED_VERSIONS_CAVEAT. */
export const POOLED_VERSIONS_TOOLS = ['get_effectiveness', 'get_health'] as const;

/**
 * Figures with no version identity (definition-version-dispositions spec v0.11.2 §4.1, amendment CM; P0m-3).
 *
 * AK (2026-10-02) left these uncaveated as "an overall picture of the definition". CM withdrew that: the exemption
 * made the defect state (no version on the wire) the one with no caveat, so restoring a version to a response would
 * have added a caveat and dropping one removed it (run #73, tracker bd7282be). The tools are the inventory's
 * no-identity rows (version-comparison-surfaces-inventory v0.1.0, a7221ebb): four in @uluops/ops-mcp
 * (get_agent_reliability, get_analytics, get_agent_matrix, get_agent_runs_analysis) and two in @uluops/registry-mcp
 * (get_execution_stats, get_ecosystem_overview).
 *
 * Why its own constant and not POOLED_VERSIONS_CAVEAT: that sentence (registry-mcp, get_effectiveness/get_health)
 * speaks of "the requested version", and these figures sit under no version. The checklist named ops-mcp's constant
 * POOLED_VERSIONS_CAVEAT; one name carrying two different sentences across the two packages would defeat the
 * word-for-word pins, so the name is new.
 *
 * Why "may" twice: the class holds two shapes. Some figures pool every version (agent reliability, execution counts,
 * the agent matrix across definitions); others are one version's rows serialized without the version (grouped agent
 * performance until bd7282be restores the field, unresolved runs-analysis items). "Even when the request named a
 * version" covers get_execution_stats, whose URL names a version and whose body counts every version and org. The
 * qualifier "that carry no definition version" leaves runs-analysis items with a resolved version outside it (CJ).
 *
 * The sentence is identical in @uluops/ops-mcp and @uluops/registry-mcp; each package's test pins it word for word,
 * and spec §4.1 records its sha256 (BA).
 */
export const UNVERSIONED_FIGURES_CAVEAT =
  'Figures here that carry no definition version are not evidence about any one version: each may pool every ' +
  'version of the agent or definition it describes (some also span several definitions or orgs), even when the ' +
  'request named a version, or may come from a single version the response does not name. Do not attribute such a ' +
  'figure to a version, compare it with a version\'s own figures, or read a change in it as evidence that an edit ' +
  'made a definition better or worse.';

/** Tools whose descriptions and responses must carry UNVERSIONED_FIGURES_CAVEAT. */
export const UNVERSIONED_FIGURES_TOOLS = [
  'get_execution_stats',
  'get_ecosystem_overview',
] as const;
