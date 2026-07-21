import { describe, it, expect } from 'vitest';
import { sourceLabel, sourceTagClass, isManualSource } from './sourceLabels';

describe('sourceLabels', () => {
    describe('manual sources resolve to "Entered manually" (FR-030, FR-037)', () => {
        it("'manual' resolves to Entered manually", () => {
            expect(sourceLabel('manual')).toBe('Entered manually');
        });

        it('null resolves to Entered manually', () => {
            expect(sourceLabel(null)).toBe('Entered manually');
        });

        it("empty string resolves to Entered manually", () => {
            expect(sourceLabel('')).toBe('Entered manually');
        });
    });

    describe('known provider slugs map to friendly names (FR-030)', () => {
        it('google-health → "Google Health"', () => {
            expect(sourceLabel('google-health')).toBe('Google Health');
        });

        it('fitbit → "Fitbit"', () => {
            expect(sourceLabel('fitbit')).toBe('Fitbit');
        });

        it('apple-health → "Apple Health"', () => {
            expect(sourceLabel('apple-health')).toBe('Apple Health');
        });

        it('garmin-connect → "Garmin Connect"', () => {
            expect(sourceLabel('garmin-connect')).toBe('Garmin Connect');
        });

        it('withings → "Withings"', () => {
            expect(sourceLabel('withings')).toBe('Withings');
        });
    });

    describe('unknown non-manual slugs are humanised (FR-037)', () => {
        it('fitbit-charge → "Fitbit Charge"', () => {
            expect(sourceLabel('fitbit-charge')).toBe('Fitbit Charge');
        });

        it('some-new-provider → "Some New Provider"', () => {
            expect(sourceLabel('some-new-provider')).toBe('Some New Provider');
        });

        it('singleword → "Singleword"', () => {
            expect(sourceLabel('singleword')).toBe('Singleword');
        });
    });

    describe('never blank, never bare slug, never "Unknown" (FR-037)', () => {
        it('never returns empty string', () => {
            expect(sourceLabel('manual')).not.toBe('');
            expect(sourceLabel('google-health')).not.toBe('');
            expect(sourceLabel('unknown-provider')).not.toBe('');
        });

        it('never returns the bare slug for known providers', () => {
            expect(sourceLabel('google-health')).not.toBe('google-health');
            expect(sourceLabel('fitbit')).not.toBe('fitbit');
        });

        it('never returns "Unknown"', () => {
            expect(sourceLabel('totally-made-up')).not.toBe('Unknown');
            expect(sourceLabel('')).not.toBe('Unknown');
            expect(sourceLabel(null)).not.toBe('Unknown');
        });
    });

    describe('distinction carried by style/class hook, not wording alone (FR-031)', () => {
        it('manual sources get manual tag class', () => {
            expect(sourceTagClass('manual')).toBe('source-tag--manual');
            expect(sourceTagClass(null)).toBe('source-tag--manual');
            expect(sourceTagClass('')).toBe('source-tag--manual');
        });

        it('imported sources get imported tag class', () => {
            expect(sourceTagClass('google-health')).toBe('source-tag--imported');
            expect(sourceTagClass('fitbit')).toBe('source-tag--imported');
            expect(sourceTagClass('unknown-provider')).toBe('source-tag--imported');
        });
    });

    describe('isManualSource helper', () => {
        it('returns true for manual variants', () => {
            expect(isManualSource('manual')).toBe(true);
            expect(isManualSource(null)).toBe(true);
            expect(isManualSource('')).toBe(true);
        });

        it('returns false for any provider slug', () => {
            expect(isManualSource('google-health')).toBe(false);
            expect(isManualSource('fitbit')).toBe(false);
            expect(isManualSource('unknown-provider')).toBe(false);
        });
    });
});
