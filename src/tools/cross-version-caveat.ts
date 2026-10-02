/**
 * Caveat appended to every tool whose response reports quality for more than one
 * definition version side by side (lineage, evolution, effectiveness compare,
 * diff impact, translation analytics).
 *
 * Why: each version's runs happen in their own period, on their own artifacts, and
 * their findings are triaged under whatever process held at the time. A difference
 * between versions in these figures therefore cannot be attributed to the edit, and a
 * model asked "did my edit help?" will otherwise read the figures as the answer.
 * Source: definition-version-dispositions spec v0.7.0, §4.1 (amendment AC).
 *
 * Exported so the registration test can assert every listed tool carries it.
 */
export const CROSS_VERSION_CAVEAT =
  'Cross-version figures here are observational: each version ran in its own period, on its own artifacts, ' +
  'and its findings were triaged under the process of that time. Differences between versions are not evidence ' +
  'that an edit made the definition better or worse; do not rank versions or recommend one from these figures alone.';

/** Tools whose descriptions must carry CROSS_VERSION_CAVEAT. */
export const CROSS_VERSION_TOOLS = [
  'get_lineage',
  'get_evolution',
  'compare_effectiveness',
  'get_diff_impact',
  'get_translation_analytics',
] as const;
