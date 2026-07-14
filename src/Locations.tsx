import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetLocationsQuery, useAddLocationMutation } from './locationApi';
import { LocationType } from './types';
import { contactsApi, ContactType } from '@clarion-app/contacts-frontend';

export const Locations: React.FC = () => {
    const navigate = useNavigate();
    const { data: locations, error, isLoading } = useGetLocationsQuery();
    const { data: contacts } = contactsApi.useGetContactsQuery(null);
    const [addLocation] = useAddLocationMutation();

    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [description, setDescription] = useState('');
    const [visitedAt, setVisitedAt] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [isLocating, setIsLocating] = useState(false);
    const [geoError, setGeoError] = useState('');

    const toggleContact = (contactId: string, checked: boolean) => {
        setSelectedContactIds((prev) =>
            checked ? [...prev, contactId] : prev.filter((id) => id !== contactId)
        );
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported by this browser.');
            return;
        }
        setIsLocating(true);
        setGeoError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toString());
                setLongitude(position.coords.longitude.toString());
                if (!visitedAt) {
                    setVisitedAt(new Date().toISOString().slice(0, 16));
                }
                setIsLocating(false);
            },
            (err) => {
                setGeoError(err.message || 'Unable to retrieve your location.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleAddLocation = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await addLocation({
                latitude: Number(latitude),
                longitude: Number(longitude),
                description: description || undefined,
                visited_at: visitedAt || undefined,
                contacts: selectedContactIds,
            }).unwrap();
            setLatitude('');
            setLongitude('');
            setDescription('');
            setVisitedAt('');
            setSelectedContactIds([]);
        } catch (err) {
            console.error('Failed to add location: ', err);
        }
    };

    return (
        <div className="container">
            <h1 className="title">Life Log - Locations</h1>
            {isLoading && <div className="notification is-info">Loading...</div>}
            {error && <div className="notification is-danger">Error loading locations</div>}
            {locations && locations.length === 0 && <div className="notification is-warning">No locations found</div>}

            {locations && locations.length > 0 && (
                <div className="box">
                    <ul>
                        {locations.map((location: LocationType) => (
                            <li key={location.id} className="media">
                                <div className="media-content">
                                    <p
                                        className="title is-5"
                                        onClick={() => navigate('/clarion-app/life-log/locations/' + location.id)}
                                    >
                                        {location.description || `${location.latitude}, ${location.longitude}`}
                                    </p>
                                    <p className="subtitle is-6">{location.visited_at || `${location.latitude}, ${location.longitude}`}</p>
                                    {location.contacts && location.contacts.length > 0 && (
                                        <div className="tags">
                                            {location.contacts.map((contact: ContactType) => (
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
                <h2 className="title is-4">Add New Location</h2>
                <form onSubmit={handleAddLocation}>
                    <div className="field">
                        <div className="control">
                            <button
                                type="button"
                                className={`button is-info ${isLocating ? 'is-loading' : ''}`}
                                onClick={handleUseCurrentLocation}
                                disabled={isLocating}
                            >
                                Use My Location
                            </button>
                        </div>
                        {geoError && <p className="help is-danger">{geoError}</p>}
                    </div>

                    <div className="field">
                        <label className="label">Latitude</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                step="any"
                                min="-90"
                                max="90"
                                placeholder="Latitude"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Longitude</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                step="any"
                                min="-180"
                                max="180"
                                placeholder="Longitude"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Description</label>
                        <div className="control">
                            <input
                                className="input"
                                type="text"
                                placeholder="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Visited At</label>
                        <div className="control">
                            <input
                                className="input"
                                type="datetime-local"
                                value={visitedAt}
                                onChange={(e) => setVisitedAt(e.target.value)}
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
                            <button type="submit" className="button is-link">Add Location</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Locations;
