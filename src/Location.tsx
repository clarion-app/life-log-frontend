import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetLocationQuery, useUpdateLocationMutation, useDeleteLocationMutation } from './locationApi';
import { LocationType } from './types';
import { contactsApi, ContactType } from '@clarion-app/contacts-frontend';

export const Location: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: location, error, isLoading } = useGetLocationQuery(id!);
    const { data: contacts } = contactsApi.useGetContactsQuery(null);
    const [updateLocation] = useUpdateLocationMutation();
    const [deleteLocation] = useDeleteLocationMutation();
    const [editLocation, setEditLocation] = useState<LocationType | null>(null);
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

    const toggleContact = (contactId: string, checked: boolean) => {
        setSelectedContactIds((prev) =>
            checked ? [...prev, contactId] : prev.filter((cid) => cid !== contactId)
        );
    };

    const handleEdit = () => {
        if (location) {
            setEditLocation(location);
            setSelectedContactIds(location.contacts?.map((contact) => contact.id!) ?? []);
        }
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (editLocation) {
            await updateLocation({ ...editLocation, contacts: selectedContactIds }).unwrap();
            setEditLocation(null);
        }
    };

    const handleDelete = async () => {
        if (location) {
            await deleteLocation(location.id!).unwrap();
            navigate('/clarion-app/life-log/locations');
        }
    };

    if (isLoading) return <div className="notification is-info">Loading location...</div>;
    if (error || !location) return <div className="notification is-danger">Error: {error?.toString() || 'Not found'}</div>;

    return (
        <div className="container">
            <div className="box">
                {editLocation ? (
                    <form onSubmit={handleSave}>
                        <div className="field">
                            <label className="label">Latitude</label>
                            <div className="control">
                                <input
                                    type="number"
                                    step="any"
                                    min="-90"
                                    max="90"
                                    className="input"
                                    value={editLocation.latitude}
                                    onChange={(e) => setEditLocation({ ...editLocation, latitude: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Longitude</label>
                            <div className="control">
                                <input
                                    type="number"
                                    step="any"
                                    min="-180"
                                    max="180"
                                    className="input"
                                    value={editLocation.longitude}
                                    onChange={(e) => setEditLocation({ ...editLocation, longitude: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Description</label>
                            <div className="control">
                                <input
                                    type="text"
                                    className="input"
                                    value={editLocation.description || ''}
                                    onChange={(e) => setEditLocation({ ...editLocation, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Visited At</label>
                            <div className="control">
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={editLocation.visited_at ? editLocation.visited_at.slice(0, 16) : ''}
                                    onChange={(e) => setEditLocation({ ...editLocation, visited_at: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Contacts</label>
                            <div className="control">
                                {contacts?.map((contact: ContactType) => (
                                    <label key={contact.id} className="checkbox mr-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedContactIds.includes(contact.id!)}
                                            onChange={(e) => toggleContact(contact.id!, e.target.checked)}
                                        />
                                        {' '}{contact.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="field is-grouped">
                            <div className="control">
                                <button type="submit" className="button is-primary">Save</button>
                            </div>
                            <div className="control">
                                <button type="button" onClick={() => setEditLocation(null)} className="button is-light">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <>
                        <h2 className="title">{location.description || `${location.latitude}, ${location.longitude}`}</h2>
                        <p className="subtitle is-6">{location.visited_at}</p>
                        <p>Latitude: {location.latitude}</p>
                        <p>Longitude: {location.longitude}</p>

                        {location.contacts && location.contacts.length > 0 && (
                            <div className="tags">
                                {location.contacts.map((contact: ContactType) => (
                                    <span key={contact.id} className="tag is-info">{contact.name}</span>
                                ))}
                            </div>
                        )}

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

export default Location;
