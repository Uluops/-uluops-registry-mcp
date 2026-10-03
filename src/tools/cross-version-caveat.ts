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
 */
export const CROSS_VERSION_CAVEAT =
  'Cross-version figures here are observational. Some are not per-version at all: health, failure-domain and ' +
  'taxonomy figures, where present, pool every version of the definition and are re-stamped onto a version whenever ' +
  'it is recomputed, so a difference between versions there only reflects when each was recomputed. Pass rates and ' +
  'scores, where per-version, come from each version\'s own runs in its own period, on its own artifacts, and are the ' +
  'agent\'s own assessments of those artifacts, so an edit that changes how lenient it is moves them without changing ' +
  'quality. No difference between versions here is evidence that an edit made the definition better or worse; do not ' +
  'rank versions or recommend one on the basis of these figures, alone or combined with other figures.';

export const POOLED_VERSIONS_CAVEAT =
  'These figures pool every version of the definition run in the window, whichever version is requested: they ' +
  'describe the definition, not the requested version, and cannot show whether one version differs from another. ' +
  'Do not compare these figures across versions.';

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
