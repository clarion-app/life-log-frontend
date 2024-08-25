import React, { useState } from 'react';
import { useGetEntriesQuery, useAddEntryMutation } from './entryApi';
import { EntryType } from './types';

export const Entries: React.FC = () => {
    const { data: entries, error, isLoading, refetch } = useGetEntriesQuery();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10)); // Default to today
    const [addEntry] = useAddEntryMutation();

    const handleAddEntry = async () => {
        try {
            const newEntry: Partial<EntryType> = { title, content, entry_date: entryDate };
            await addEntry(newEntry);
            refetch();
        } catch (error) {
            console.error('Failed to add entry:', error);
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading entries</div>;

    return (
        <div>
            <h2>Entries</h2>
            <ul>
                {entries?.map((entry) => (
                    <li key={entry.id}>
                        <strong>{entry.title}</strong> - {entry.entry_date}
                        <p>{entry.content}</p>
                    </li>
                ))}
            </ul>

            <h2>Add New Entry</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAddEntry(); }}>
                <div>
                    <label>Title:</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div>
                    <label>Content:</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
                <div>
                    <label>Date:</label>
                    <input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                    />
                </div>
                <div>
                    <button type="submit">Add Entry</button>
                </div>
            </form>
        </div>
    );
};