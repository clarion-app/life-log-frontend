import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetHealthMetricsQuery, useAddHealthMetricMutation } from './healthMetricApi';
import { HealthMetricType } from './types';

export const HealthMetrics: React.FC = () => {
    const navigate = useNavigate();
    const { data: metrics, error, isLoading } = useGetHealthMetricsQuery();
    const [addHealthMetric] = useAddHealthMetricMutation();

    const [type, setType] = useState('');
    const [value, setValue] = useState('');
    const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 16));

    const handleAddHealthMetric = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await addHealthMetric({ type, value: Number(value), recorded_at: recordedAt }).unwrap();
            setType('');
            setValue('');
            setRecordedAt(new Date().toISOString().slice(0, 16));
        } catch (err) {
            console.error('Failed to add health metric: ', err);
        }
    };

    return (
        <div className="container">
            <h1 className="title">Life Log - Health Metrics</h1>
            {isLoading && <div className="notification is-info">Loading...</div>}
            {error && <div className="notification is-danger">Error loading health metrics</div>}
            {metrics && metrics.length === 0 && <div className="notification is-warning">No health metrics found</div>}

            {metrics && metrics.length > 0 && (
                <div className="box">
                    <ul>
                        {metrics.map((metric: HealthMetricType) => (
                            <li key={metric.id} className="media">
                                <div className="media-content">
                                    <p
                                        className="title is-5"
                                        onClick={() => navigate('/clarion-app/life-log/health-metrics/' + metric.id)}
                                    >
                                        {metric.type}: {metric.value}
                                    </p>
                                    <p className="subtitle is-6">{metric.recorded_at}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="box">
                <h2 className="title is-4">Add New Health Metric</h2>
                <form onSubmit={handleAddHealthMetric}>
                    <div className="field">
                        <label className="label">Type</label>
                        <div className="control">
                            <input
                                className="input"
                                type="text"
                                placeholder="e.g. weight, blood_pressure, heart_rate"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Value</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                step="any"
                                placeholder="Value"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Recorded At</label>
                        <div className="control">
                            <input
                                className="input"
                                type="datetime-local"
                                value={recordedAt}
                                onChange={(e) => setRecordedAt(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="field is-grouped">
                        <div className="control">
                            <button type="submit" className="button is-link">Add Health Metric</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HealthMetrics;
