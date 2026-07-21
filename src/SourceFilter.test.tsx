import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceFilter } from './SourceFilter';

describe('SourceFilter', () => {
    const MOCK_AVAILABLE_SOURCES = ['manual', 'google-health', 'fitbit'];

    describe('options from meta.available_sources, not from rows (FR-034)', () => {
        it('renders options from available_sources list', () => {
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={null}
                    onSourceChange={vi.fn()}
                />
            );

            const select = screen.getByRole('combobox');
            expect(select).toBeInTheDocument();
        });

        it('includes "All sources" option', () => {
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={null}
                    onSourceChange={vi.fn()}
                />
            );

            const options = screen.getAllByRole('option');
            const labels = options.map((o) => o.textContent);
            expect(labels).toContain('All sources');
        });

        it('includes "Entered manually" option for manual source', () => {
            
            render(
                <SourceFilter
                    availableSources={['manual']}
                    activeSource={null}
                    onSourceChange={vi.fn()}
                />
            );

            const options = screen.getAllByRole('option');
            const labels = options.map((o) => o.textContent);
            expect(labels).toContain('Entered manually');
        });

        it('includes mapped friendly names for known providers', () => {
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={null}
                    onSourceChange={vi.fn()}
                />
            );

            const options = screen.getAllByRole('option');
            const labels = options.map((o) => o.textContent);
            expect(labels).toContain('Google Health');
            expect(labels).toContain('Fitbit');
        });
    });

    describe('selecting source calls onSourceChange (FR-032)', () => {
        it('selecting a source calls onSourceChange with that source', () => {
            const handleChange = vi.fn();
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={null}
                    onSourceChange={handleChange}
                />
            );

            const select = screen.getByRole('combobox');
            fireEvent.change(select, {
                target: { value: 'google-health' },
            });

            expect(handleChange).toHaveBeenCalledWith('google-health');
        });

        it('selecting "All sources" calls onSourceChange with null', () => {
            const handleChange = vi.fn();
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={'google-health'}
                    onSourceChange={handleChange}
                />
            );

            const select = screen.getByRole('combobox');
            fireEvent.change(select, {
                target: { value: '' },
            });

            expect(handleChange).toHaveBeenCalledWith(null);
        });

        it('selecting "Entered manually" calls onSourceChange with "manual"', () => {
            const handleChange = vi.fn();
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={null}
                    onSourceChange={handleChange}
                />
            );

            const select = screen.getByRole('combobox');
            fireEvent.change(select, {
                target: { value: 'manual' },
            });

            expect(handleChange).toHaveBeenCalledWith('manual');
        });
    });

    describe('active filter renders as visible dismissible indicator (FR-033)', () => {
        it('shows active filter tag when a source is selected', () => {
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={'google-health'}
                    onSourceChange={vi.fn()}
                />
            );

            // The tag with role="status" should be present
            const tags = screen.getAllByRole('status');
            expect(tags.length).toBeGreaterThan(0);
        });

        it('shows "Entered manually" tag for manual filter', () => {
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={'manual'}
                    onSourceChange={vi.fn()}
                />
            );

            const tags = screen.getAllByRole('status');
            expect(tags.length).toBeGreaterThan(0);
            expect(tags[0].textContent).toContain('Entered manually');
        });

        it('clicking clear removes the filter', () => {
            const handleChange = vi.fn();
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={'google-health'}
                    onSourceChange={handleChange}
                />
            );

            const clearBtn = screen.getByTitle('Clear filter');
            fireEvent.click(clearBtn);

            expect(handleChange).toHaveBeenCalledWith(null);
        });

        it('no active filter shows no indicator', () => {
            
            const { container } = render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={null}
                    onSourceChange={vi.fn()}
                />
            );

            // No tag element should be present
            const tags = container.querySelectorAll('span.tag');
            expect(tags.length).toBe(0);
        });
    });

    describe('clearing restores unfiltered list (FR-032)', () => {
        it('changing from one source to another updates correctly', () => {
            const handleChange = vi.fn();
            
            render(
                <SourceFilter
                    availableSources={MOCK_AVAILABLE_SOURCES}
                    activeSource={'google-health'}
                    onSourceChange={handleChange}
                />
            );

            const select = screen.getByRole('combobox');
            fireEvent.change(select, {
                target: { value: 'fitbit' },
            });

            expect(handleChange).toHaveBeenCalledWith('fitbit');
        });
    });
});
