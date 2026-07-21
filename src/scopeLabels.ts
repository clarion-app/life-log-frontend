/**
 * Map type slugs to reader-facing data phrases (FR-017b).
 *
 * No scope URL may appear here — the labels are purely presentational
 * and must never expose provider-specific identifiers.
 */

const LABELS: Record<string, string> = {
    steps: 'Steps',
    heart_rate: 'Heart Rate',
    calories_burned: 'Calories Burned',
    weight: 'Weight',
    workout: 'Workouts',
    sleep: 'Sleep',
    distance: 'Distance',
    active_minutes: 'Active Minutes',
};

/**
 * Return a reader-facing label for the given type slug.
 *
 * Known slugs map to curated labels. Unknown slugs are humanised
 * (underscores replaced, first character capitalised) so they still
 * read as a phrase — never as a raw identifier or scope URL.
 */
export function scopeLabel(slug: string): string {
    if (slug in LABELS) {
        return LABELS[slug];
    }

    // Humanise unknown slugs: replace underscores with spaces, capitalise each word
    return slug
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
