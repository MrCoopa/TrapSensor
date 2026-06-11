import React, { useState } from 'react';
import { X, Camera } from 'lucide-react';
import API_BASE from '../apiConfig';
import QRScanner from './QRScanner';

const AddCatchModal = ({ isOpen, onClose, onAdd, revierweltEnabled }) => {
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        imei: '',
        deviceId: '',
        type: 'NB-IOT',
        revierweltWebhookUrl: '',
        claimingPin: ''
    });
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleScan = (code) => {
        if (formData.type === 'LORAWAN') {
            setFormData({ ...formData, deviceId: code });
        } else {
            setFormData({ ...formData, imei: code });
        }
        setIsScannerOpen(false);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE}/api/catches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                const newCatch = await response.json();
                onAdd(newCatch);
                setFormData({ name: '', location: '', imei: '', deviceId: '', type: 'NB-IOT', revierweltWebhookUrl: '', claimingPin: '' });
                onClose();

            } else {
                const data = await response.json();
                setError(data.error || 'Fehler beim Speichern');
            }
        } catch (error) {
            console.error('Fehler:', error);
            setError(`Verbindung zum Server fehlgeschlagen: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div
                className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full p-8 relative"
                style={{
                    paddingBottom: 'calc(32px + var(--safe-area-bottom-offset, 0px))'
                }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Neuen CatchSensor hinzufügen</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-bold">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Device Type Selector */}
                    <div className="flex bg-gray-50 p-1 rounded-2xl mb-6">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'NB-IOT' })}
                            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${formData.type === 'NB-IOT' ? 'bg-[#1b3a2e] text-white shadow-md' : 'text-gray-400'}`}
                        >
                            NB-IOT
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'LORAWAN' })}
                            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${formData.type === 'LORAWAN' ? 'bg-[#1b3a2e] text-white shadow-md' : 'text-gray-400'}`}
                        >
                            LORAWAN
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Name / Alias</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#1b3a2e]/20 outline-none transition-all"
                            placeholder="z.B. Wiesenkante Süd"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Standort (optional)</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#1b3a2e]/20 outline-none transition-all"
                            placeholder="z.B. Obere Dickung / Bachlauf"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                            {formData.type === 'LORAWAN' ? 'Device ID' : 'IMEI'}
                        </label>
                        <div className="relative">
                            <input
                                required
                                type="text"
                                value={formData.type === 'LORAWAN' ? formData.deviceId : formData.imei}
                                onChange={(e) => setFormData({ ...formData, [formData.type === 'LORAWAN' ? 'deviceId' : 'imei']: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#1b3a2e]/20 outline-none"
                                placeholder={formData.type === 'LORAWAN' ? 'z.B. eui-70b3d5...' : '15-stellige IMEI'}
                            />
                            <button
                                type="button"
                                onClick={() => setIsScannerOpen(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                            >
                                <Camera size={20} />
                            </button>
                        </div>
                    </div>

                    {formData.type === 'NB-IOT' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Claiming PIN (vom Aufkleber)</label>
                            <input
                                required
                                type="text"
                                value={formData.claimingPin}
                                onChange={(e) => setFormData({ ...formData, claimingPin: e.target.value.toUpperCase() })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#1b3a2e]/20 outline-none"
                                placeholder="z.B. A7X9"
                            />
                        </div>
                    )}

                    {revierweltEnabled && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 font-mono text-[10px] text-green-700">Revierwelt Webhook (optional)</label>
                            <input
                                type="text"
                                value={formData.revierweltWebhookUrl}
                                onChange={(e) => setFormData({ ...formData, revierweltWebhookUrl: e.target.value })}
                                className="w-full bg-green-50/30 border border-green-100/50 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-green-600/20 outline-none transition-all text-sm"
                                placeholder="https://revierwelt.de/webhook/..."
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic px-1">Wird bei jedem Fang automatisch aufgerufen.</p>
                        </div>
                    )}


                    {isScannerOpen && (
                        <QRScanner
                            onScan={handleScan}
                            onClose={() => setIsScannerOpen(false)}
                        />
                    )}

                    <div className="flex gap-3 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200"
                        >
                            Abbrechen
                        </button>
                        <button
                            disabled={loading}
                            type="submit"
                            className={`flex-1 px-6 py-4 bg-[#1b3a2e] text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Speichern...' : 'Speichern'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCatchModal;
