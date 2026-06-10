/**
 * Drill-screen layout contract (brief §4.2 / §7.5):
 * no interactive element above the screen midline during drills.
 * The interactive zone container starts at this fraction of screen height —
 * asserted ≥ 0.5 by unit test so the rule can't silently regress.
 */
export const DRILL_INTERACTIVE_TOP_FRACTION = 0.55;
