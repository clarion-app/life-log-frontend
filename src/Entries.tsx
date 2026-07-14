import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetEntriesQuery, useAddEntryMutation } from './entryApi';
import { useGetLocationsQuery } from './locationApi';
import { EntryType, LocationType } from './types';
import { contactsApi, ContactType } from '@clarion-app/contacts-frontend';

export const Entries: React.FC = () => {
    const navigate = useNavigate();
    const { data: entries, error, isLoading } = useGetEntriesQuery();
    const { data: locations } = useGetLocationsQuery();
    const { data: contacts } = contactsApi.useGetContactsQuery(null);
    const [addEntry] = useAddEntryMutation();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
    const [locationId, setLocationId] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

    const toggleContact = (contactId: string, checked: boolean) => {
        setSelectedContactIds((prev) =>
            checked ? [...prev, contactId] : prev.filter((cid) => cid !== contactId)
        );
    };

    const handleAddEntry = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await addEntry({
                title,
                content,
                entry_date: entryDate,
                location_id: locationId || undefined,
                contacts: selectedContactIds,
            }).unwrap();
            setTitle('');
            setContent('');
            setEntryDate(new Date().toISOString().slice(0, 10));
            setLocationId('');
            setSelectedContactIds([]);
        } catch (err) {
            console.error('Failed to add entry: ', err);
        }
    };

    return (
        <div className="container">
            <h1 className="title">Life Log - Entries</h1>
            {isLoading && <div className="notification is-info">Loading...</div>}
            {error && <div className="notification is-danger">Error loading entries</div>}
            {entries && entries.length === 0 && <div className="notification is-warning">No entries found</div>}

            {entries && entries.length > 0 && (
                <div className="box">
                    <ul>
                        {entries.map((entry: EntryType) => (
                            <li key={entry.id} className="media">
                                <div className="media-content">
                                    <p
                                        className="title is-5"
                                        onClick={() => navigate('/clarion-app/life-log/' + entry.id)}
                                    >
                                        {entry.title}
                                    </p>
                                    <p className="subtitle is-6">{entry.entry_date}</p>
                                    {entry.contacts && entry.contacts.length > 0 && (
                                        <div className="tags">
                                            {entry.contacts.map((contact: ContactType) => (
                                                <span key={contact.id} className="tag is-info">{contact.name}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="box">
                <h2 className="title is-4">Add New Entry</h2>
                <form onSubmit={handleAddEntry}>
                    <div className="field">
                        <label className="label">Title</label>
                        <div className="control">
                            <input
                                className="input"
                                type="text"
                                placeholder="Entry title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Content</label>
                        <div className="control">
                            <textarea
                                className="textarea"
                                placeholder="What happened?"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Date</label>
                        <div className="control">
                            <input
                                className="input"
                                type="date"
                                value={entryDate}
                                onChange={(e) => setEntryDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Location</label>
                        <div className="control">
                            <div className="select">
                                <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
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
                            <button type="submit" className="button is-link">Add Entry</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Entries;
