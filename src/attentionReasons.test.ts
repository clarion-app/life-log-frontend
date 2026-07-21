import { describe, it, expect } from 'vitest';
import {
    attentionReasonCopy,
    attentionReasonRemedy,
    ATTENTION_REASONS,
    reasonRoutesToWearableServices,
} from './attentionReasons';

describe('attentionReasons', () => {
    describe('all 11 wire values from the closed set exist', () => {
        const expectedReasons = [
            'credential_rotated',
            'credential_removed',
            'authorization_unrenewable',
            'sync_failures',
            'access_revoked',
            'access_expired',
            'credentials_rejected',
            'rate_limited',
            'service_unavailable',
            'invalid_request',
            'unknown',
        ];

        it('has exactly 11 known reasons', () => {
            expect(ATTENTION_REASONS).toHaveLength(11);
        });

        for (const reason of expectedReasons) {
            it(`includes ${reason}`, () => {
                expect(ATTENTION_REASONS).toContain(reason);
            });
        }
    });

    describe('pairwise distinct copy (FR-025)', () => {
        const copies: string[] = [];

        for (const reason of ATTENTION_REASONS) {
            it(`${reason} produces non-empty copy`, () => {
                const copy = attentionReasonCopy(reason);
                expect(copy).toBeTypeOf('string');
                expect(copy.length).toBeGreaterThan(0);
                copies.push(copy);
            });
        }

        it('all 11 copies are pairwise distinct', () => {
            const unique = new Set(copies);
            expect(unique.size).toBe(copies.length);
        });
    });

    describe('credential_rotated, credential_removed, credentials_rejected route to Wearable Services', () => {
        it('credential_rotated routes to Wearable Services', () => {
            expect(reasonRoutesToWearableServices('credential_rotated')).toBe(true);
        });

        it('credential_removed routes to Wearable Services', () => {
            expect(reasonRoutesToWearableServices('credential_removed')).toBe(true);
        });

        it('credentials_rejected routes to Wearable Services', () => {
            expect(reasonRoutesToWearableServices('credentials_rejected')).toBe(true);
        });

        it('authorization_unrenewable does NOT route to Wearable Services', () => {
            expect(reasonRoutesToWearableServices('authorization_unrenewable')).toBe(false);
        });

        it('sync_failures does NOT route to Wearable Services', () => {
            expect(reasonRoutesToWearableServices('sync_failures')).toBe(false);
        });

        it('access_revoked does NOT route to Wearable Services', () => {
            expect(reasonRoutesToWearableServices('access_revoked')).toBe(false);
        });

        it('rate_limited does NOT route to Wearable Services', () => {
            expect(reasonRoutesToWearableServices('rate_limited')).toBe(false);
        });
    });

    describe('unrecognised string uses "unknown" copy and never echoes raw value', () => {
        it('returns the same copy as "unknown" for a made-up reason', () => {
            const unknownCopy = attentionReasonCopy('unknown');
            const fakeCopy = attentionReasonCopy('totally_fake_reason_xyz');
            expect(fakeCopy).toBe(unknownCopy);
        });

        it('does not include the raw value in the copy', () => {
            const fakeReason = 'some_weird_internal_error_code';
            const copy = attentionReasonCopy(fakeReason);
            expect(copy).not.toContain(fakeReason);
        });

        it('does not include the raw value for another made-up reason', () => {
            const fakeReason = 'provider_timeout_bang';
            const copy = attentionReasonCopy(fakeReason);
            expect(copy).not.toContain(fakeReason);
        });
    });

    describe('none fall through to a generic message', () => {
        it('every known reason has specific copy that is not a generic fallback', () => {
            for (const reason of ATTENTION_REASONS) {
                const copy = attentionReasonCopy(reason);
                // Generic messages would be short and non-specific
                expect(copy.length).toBeGreaterThan(20);
                // Should not contain placeholder text
                expect(copy).not.toContain('TODO');
                expect(copy).not.toContain('please check');
            }
        });
    });

    describe('remedy classification', () => {
        it('credential_removed has "wearable_services_disabled_reconnect" remedy', () => {
            expect(attentionReasonRemedy('credential_removed')).toBe(
                'wearable_services_disabled_reconnect'
            );
        });

        it('credential_rotated has "wearable_services" remedy (primary) + reconnect secondary', () => {
            const remedy = attentionReasonRemedy('credential_rotated');
            expect(remedy).toBe('wearable_services');
        });

        it('credentials_rejected has "wearable_services" remedy', () => {
            expect(attentionReasonRemedy('credentials_rejected')).toBe('wearable_services');
        });

        it('authorization_unrenewable has "reconnect" remedy', () => {
            expect(attentionReasonRemedy('authorization_unrenewable')).toBe('reconnect');
        });

        it('sync_failures has "reconnect" remedy', () => {
            expect(attentionReasonRemedy('sync_failures')).toBe('reconnect');
        });

        it('access_revoked has "reconnect" remedy', () => {
            expect(attentionReasonRemedy('access_revoked')).toBe('reconnect');
        });

        it('access_expired has "reconnect" remedy', () => {
            expect(attentionReasonRemedy('access_expired')).toBe('reconnect');
        });

        it('rate_limited has "transient" remedy', () => {
            expect(attentionReasonRemedy('rate_limited')).toBe('transient');
        });

        it('service_unavailable has "transient" remedy', () => {
            expect(attentionReasonRemedy('service_unavailable')).toBe('transient');
        });

        it('invalid_request has "reconnect" remedy', () => {
            expect(attentionReasonRemedy('invalid_request')).toBe('reconnect');
        });

        it('unknown has "reconnect" remedy', () => {
            expect(attentionReasonRemedy('unknown')).toBe('reconnect');
        });
    });

    describe('FR-029: configuration-side reasons do not blame the user', () => {
        it('credential_rotated copy does not blame the user', () => {
            const copy = attentionReasonCopy('credential_rotated');
            expect(copy.toLowerCase()).not.toContain('your account');
            expect(copy.toLowerCase()).not.toContain('you revoked');
            expect(copy.toLowerCase()).not.toContain('you removed');
        });

        it('credential_removed copy does not blame the user', () => {
            const copy = attentionReasonCopy('credential_removed');
            expect(copy.toLowerCase()).not.toContain('your account');
            expect(copy.toLowerCase()).not.toContain('you revoked');
            expect(copy.toLowerCase()).not.toContain('you removed');
        });

        it('credentials_rejected copy does not blame the user', () => {
            const copy = attentionReasonCopy('credentials_rejected');
            expect(copy.toLowerCase()).not.toContain('your account');
            expect(copy.toLowerCase()).not.toContain('you revoked');
        });
    });

    describe('SC-003: no role wording in any reason copy', () => {
        const forbiddenWords = ['administrator', 'admin', 'owner', 'elevated', 'permission required'];

        for (const reason of ATTENTION_REASONS) {
            it(`${reason} contains no role wording`, () => {
                const copy = attentionReasonCopy(reason);
                const lower = copy.toLowerCase();
                for (const word of forbiddenWords) {
                    expect(lower).not.toContain(word);
                }
            });
        }
    });

    describe('transient reasons include "usually clears" copy', () => {
        it('rate_limited mentions that it usually clears on its own', () => {
            const copy = attentionReasonCopy('rate_limited');
            expect(copy.toLowerCase()).toMatch(/clears on its own|usually clears|temporary/i);
        });

        it('service_unavailable mentions that it usually clears on its own', () => {
            const copy = attentionReasonCopy('service_unavailable');
            expect(copy.toLowerCase()).toMatch(/clears on its own|usually clears|temporary/i);
        });
    });
});
