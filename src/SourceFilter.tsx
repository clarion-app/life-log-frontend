import React from 'react';
import { sourceLabel } from './sourceLabels';

interface SourceFilterProps {
    availableSources: string[];
    activeSource: string | null;
    onSourceChange: (source: string | null) => void;
}

export const SourceFilter: React.FC<SourceFilterProps> = ({
    availableSources,
    activeSource,
    onSourceChange,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        // Empty string means "all sources"
        onSourceChange(value === '' ? null : value);
    };

    return (
        <div className="field">
            <label className="label" htmlFor="source-filter">Source</label>
            <div className="field-body">
                <div className="field is-narrow">
                    <div className="control has-icons-left">
                        <div className="select">
                            <select
                                id="source-filter"
                                value={activeSource ?? ''}
                                onChange={handleChange}
                            >
                                <option value="">All sources</option>
                                {availableSources.map((src) => (
                                    <option key={src} value={src}>
                                        {sourceLabel(src)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            {activeSource !== null && (
                <div className="tags are-medium mt-2">
                    <span className="tag is-info is-light" role="status">
                        {sourceLabel(activeSource)}
                        <button
                            type="button"
                            className="delete"
                            onClick={() => onSourceChange(null)}
                            title="Clear filter"
                            aria-label={`Clear ${sourceLabel(activeSource)} filter`}
                        />
                    </span>
                </div>
            )}
        </div>
    );
};

export default SourceFilter;
