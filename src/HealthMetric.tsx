import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetHealthMetricQuery, useUpdateHealthMetricMutation, useDeleteHealthMetricMutation } from './healthMetricApi';
import { HealthMetricType } from './types';
import { sourceLabel, sourceTagClass } from './sourceLabels';

export const HealthMetric: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: metric, error, isLoading } = useGetHealthMetricQuery(id!);
    const [updateHealthMetric] = useUpdateHealthMetricMutation();
    const [deleteHealthMetric] = useDeleteHealthMetricMutation();
    const [editMetric, setEditMetric] = useState<HealthMetricType | null>(null);

    const handleEdit = () => {
        if (metric) setEditMetric(metric);
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (editMetric) {
            await updateHealthMetric(editMetric).unwrap();
            setEditMetric(null);
        }
    };

    const handleDelete = async () => {
        if (metric) {
            await deleteHealthMetric(metric.id!).unwrap();
            navigate('/clarion-app/life-log/health-metrics');
        }
    };

    if (isLoading) return <div className="notification is-info">Loading health metric...</div>;
    if (error || !metric) return <div className="notification is-danger">Error: {error?.toString() || 'Not found'}</div>;

    return (
        <div className="container">
            <div className="box">
                {editMetric ? (
                    <form onSubmit={handleSave}>
                        <div className="field">
                            <label className="label">Type</label>
                            <div className="control">
                                <input
                                    type="text"
                                    className="input"
                                    value={editMetric.type}
                                    onChange={(e) => setEditMetric({ ...editMetric, type: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Value</label>
                            <div className="control">
                                <input
                                    type="number"
                                    step="any"
                                    className="input"
                                    value={editMetric.value}
                                    onChange={(e) => setEditMetric({ ...editMetric, value: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Recorded At</label>
                            <div className="control">
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={editMetric.recorded_at.slice(0, 16)}
                                    onChange={(e) => setEditMetric({ ...editMetric, recorded_at: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="field is-grouped">
                            <div className="control">
                                <button type="submit" className="button is-primary">Save</button>
                            </div>
                            <div className="control">
                                <button type="button" onClick={() => setEditMetric(null)} className="button is-light">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <>
                        <h2 className="title">{metric.type}</h2>
                        <p className="subtitle is-6">{metric.recorded_at}</p>
                        <p>Value: {metric.value}</p>
                        <div className="mt-2">
                            <span className={`tag is-light ${sourceTagClass(metric.source)}`}>
                                {sourceLabel(metric.source)}
                            </span>
                        </div>

                        <div className="buttons mt-4">
                            <button onClick={handleEdit} className="button is-warning">Edit</button>
                            <button onClick={handleDelete} className="button is-danger">Delete</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default HealthMetric;
