/**
 * Resolve a source slug to a reader-facing label and tag treatment (FR-030, FR-031, FR-037).
 *
 * Manual sources (null, empty, 'manual') → "Entered manually" with manual styling.
 * Known provider slugs → mapped friendly name with imported styling.
 * Unknown non-manual slugs → humanised label with imported styling.
 *
 * Never blank, never the bare slug, never "Unknown".
 * The visual distinction is carried by the tag class, not by wording alone.
 */

const PROVIDER_LABELS: Record<string, string> = {
    'google-health': 'Google Health',
    fitbit: 'Fitbit',
    'apple-health': 'Apple Health',
    'garmin-connect': 'Garmin Connect',
    withings: 'Withings',
};

const MANUAL_LABEL = 'Entered manually';

function isManual(source: string | null): boolean {
    return source === null || source === '' || source === 'manual';
}

/** Return the human-readable label for a source value. */
export function sourceLabel(source: string | null): string {
    if (isManual(source)) return MANUAL_LABEL;

    // At this point source is a non-empty non-manual string
    const slug = source as string;

    // Known provider → friendly name
    if (slug in PROVIDER_LABELS) return PROVIDER_LABELS[slug];

    // Unknown provider → humanise the slug (replace hyphens, capitalise each word)
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Return the CSS class for the source tag (manual vs imported styling). */
export function sourceTagClass(source: string | null): string {
    return isManual(source) ? 'source-tag--manual' : 'source-tag--imported';
}

/** Helper: check if a source value is manual. */
export function isManualSource(source: string | null): boolean {
    return isManual(source);
}
