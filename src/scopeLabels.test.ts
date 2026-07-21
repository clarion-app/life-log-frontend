import { describe, it, expect } from 'vitest';
import { scopeLabel } from './scopeLabels';

describe('scopeLabels', () => {
    describe('known type slugs map to reader-facing data phrases', () => {
        it('maps steps', () => {
            expect(scopeLabel('steps')).toBe('Steps');
        });

        it('maps heart_rate', () => {
            expect(scopeLabel('heart_rate')).toBe('Heart Rate');
        });

        it('maps calories_burned', () => {
            expect(scopeLabel('calories_burned')).toBe('Calories Burned');
        });

        it('maps weight', () => {
            expect(scopeLabel('weight')).toBe('Weight');
        });

        it('maps workout', () => {
            expect(scopeLabel('workout')).toBe('Workouts');
        });

        it('maps sleep', () => {
            expect(scopeLabel('sleep')).toBe('Sleep');
        });

        it('maps distance', () => {
            expect(scopeLabel('distance')).toBe('Distance');
        });

        it('maps active_minutes', () => {
            expect(scopeLabel('active_minutes')).toBe('Active Minutes');
        });
    });

    describe('unmapped slugs are humanised into phrases', () => {
        it('capitalises and replaces underscores for unknown slugs', () => {
            expect(scopeLabel('blood_glucose')).toBe('Blood Glucose');
        });

        it('handles single-word unknown slugs', () => {
            expect(scopeLabel('hydration')).toBe('Hydration');
        });

        it('handles camelCase slugs without crashing', () => {
            // CamelCase slugs are not split, but the result is still a readable phrase
            const label = scopeLabel('BloodPressure');
            expect(label).toBe('BloodPressure');
            expect(label).not.toContain('_');
        });
    });

    describe('FR-017b: no scope URLs or raw slugs exposed', () => {
        it('never returns a scope URL', () => {
            const label = scopeLabel('steps');
            expect(label).not.toContain('http');
            expect(label).not.toContain('/');
            expect(label).not.toContain('googlehealth');
        });

        it('never returns the raw slug verbatim for known types', () => {
            // Known types return proper labels, not the raw snake_case slug
            expect(scopeLabel('heart_rate')).not.toBe('heart_rate');
            expect(scopeLabel('calories_burned')).not.toBe('calories_burned');
        });
    });
});
