import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetEntryQuery, useUpdateEntryMutation, useDeleteEntryMutation } from './entryApi';
import { useGetLocationsQuery } from './locationApi';
import { EntryType, LocationType } from './types';
import { contactsApi, ContactType } from '@clarion-app/contacts-frontend';

export const Entry: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: entry, error, isLoading } = useGetEntryQuery(id!);
    const { data: locations } = useGetLocationsQuery();
    const { data: contacts } = contactsApi.useGetContactsQuery(null);
    const [updateEntry] = useUpdateEntryMutation();
    const [deleteEntry] = useDeleteEntryMutation();
    const [editEntry, setEditEntry] = useState<EntryType | null>(null);
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

    const toggleContact = (contactId: string, checked: boolean) => {
        setSelectedContactIds((prev) =>
            checked ? [...prev, contactId] : prev.filter((cid) => cid !== contactId)
        );
    };

    const handleEdit = () => {
        if (entry) {
            setEditEntry(entry);
            setSelectedContactIds(entry.contacts?.map((contact) => contact.id!) ?? []);
        }
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (editEntry) {
            await updateEntry({ ...editEntry, contacts: selectedContactIds }).unwrap();
            setEditEntry(null);
        }
    };

    const handleDelete = async () => {
        if (entry) {
            await deleteEntry(entry.id!).unwrap();
            navigate('/clarion-app/life-log');
        }
    };

    if (isLoading) return <div className="notification is-info">Loading entry...</div>;
    if (error || !entry) return <div className="notification is-danger">Error: {error?.toString() || 'Not found'}</div>;

    return (
        <div className="container">
            <div className="box">
                {editEntry ? (
                    <form onSubmit={handleSave}>
                        <div className="field">
                            <label className="label">Title</label>
                            <div className="control">
                                <input
                                    type="text"
                                    className="input"
                                    value={editEntry.title}
                                    onChange={(e) => setEditEntry({ ...editEntry, title: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Content</label>
                            <div className="control">
                                <textarea
                                    className="textarea"
                                    value={editEntry.content}
                                    onChange={(e) => setEditEntry({ ...editEntry, content: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Date</label>
                            <div className="control">
                                <input
                                    type="date"
                                    className="input"
                                    value={editEntry.entry_date}
                                    onChange={(e) => setEditEntry({ ...editEntry, entry_date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Location</label>
                            <div className="control">
                                <div className="select">
                                    <select
                                        value={editEntry.location_id || ''}
                                        onChange={(e) =>
                                            setEditEntry({ ...editEntry, location_id: e.target.value || undefined })
                                        }
                                    >
                                        <option value="">No Location</option>
                                        {locations?.map((location: LocationType) => (
                                            <option key={location.id} value={location.id}>
                                                {location.description || `${location.latitude}, ${location.longitude}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                <button type="button" onClick={() => setEditEntry(null)} className="button is-light">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <>
                        <h2 className="title">{entry.title}</h2>
                        <p className="subtitle is-6">{entry.entry_date}</p>
                        <p>{entry.content}</p>

                        {entry.contacts && entry.contacts.length > 0 && (
                            <div className="tags">
                                {entry.contacts.map((contact: ContactType) => (
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

export default Entry;
