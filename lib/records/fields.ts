// Shared answer lists for capture follow-ups, the noted card and entry-detail editors.
// Plain NHS-style labels. Escape answers are stored as values but never counted as impacts.

export const BODY_ZONES = [
  'Lower tummy left',
  'Lower tummy centre',
  'Lower tummy right',
  'Lower back',
  'Deep inside',
  'Legs',
  'Bottom',
] as const;

/**
 * Since the body map (23 Nov 2026) she marks where it hurts on a picture, which saves names such as "Lower tummy"
 * or "Left hip" (components/zeeba/capture/BodyMap.tsx). These two stay as chips because a picture of the outside
 * of the body cannot show them. BODY_ZONES above is the older list: notes saved with it keep their words.
 */
export const OFF_MAP_ZONES = ['Deep inside', 'Bottom'] as const;

/** Display labels where the chip needs more words than the stored value (spec wording). */
export const BODY_ZONE_LABELS: Partial<Record<(typeof BODY_ZONES)[number], string>> = {
  Bottom: 'Bottom / when opening bowels',
};

export const WHEN_OPTIONS = ['Only around my period', 'At other times too', 'All the time'] as const;

/**
 * "Did it stop you doing anything?" (evidence pack, 18 Nov 2026). Counted as days on the report, never scored.
 * Notes saved before then may hold the older values in LEGACY_IMPACTS; they still show and count under their
 * own words ("got in the way of" is not "missed", so they are never relabelled as missed).
 */
export const IMPACT_OPTIONS = [
  'Missed work or study', 'Left work or study early', 'Cancelled plans', 'Broken sleep', 'Exercise', 'Sex', 'Nothing today',
] as const;
export const LEGACY_IMPACTS = ['Work or study', 'Sleep', 'Plans with people'] as const;

/** Treatments tried: what kind it was. Plain words; "the pill" etc. are her categories, not a clinical class. */
export const TREATMENT_CATEGORIES = [
  'Painkiller', 'The pill', 'Coil, implant or injection', 'Other hormonal', 'Physio', 'Diet change', 'Heat or TENS', 'Something else',
] as const;

/** Appointments: who she saw. */
export const SEEN_BY_OPTIONS = ['GP', 'Practice nurse', 'A&E or urgent care', 'Gynaecology', 'Other specialist', 'Other'] as const;

/** Appointments: what happened next, as she ticked it. Counts only on the report. */
export const OUTCOME_OPTIONS = [
  'Referral', 'Scan', 'Blood test', 'New prescription', 'Come back if it gets worse', 'Nothing offered', 'Something else',
] as const;

export const ESCAPE_ANSWERS = ['Not sure', 'It varies', 'Skip'] as const;

export const STARTER_CHIPS = ['Pain today', 'My period', 'Something new', 'Just a quick note'] as const;
