import React, { useState, useEffect } from 'react';
import { X, Globe, Shield } from 'lucide-react';
import API_BASE from '../apiConfig';

const DebugModal = ({ isOpen, onClose }) => {
    const [tempApiUrl, setTempApiUrl] = useState(() => localStorage.getItem('api_custom_url') || API_BASE);
    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTempApiUrl(localStorage.getItem('api_custom_url') || API_BASE);
            setStatusMessage({ text: '', type: '' });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSaveApiUrl = () => {
        if (!tempApiUrl.trim()) {
            localStorage.removeItem('api_custom_url');
        } else {
            let cleanUrl = tempApiUrl.trim();
            if (cleanUrl.endsWith('/')) {
                cleanUrl = cleanUrl.slice(0, -1);
            }
            localStorage.setItem('api_custom_url', cleanUrl);
        }
        setStatusMessage({ text: 'Server-Adresse geändert! App wird neu geladen... 🔄', type: 'success' });
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const handleResetApiUrl = () => {
        localStorage.removeItem('api_custom_url');
        setStatusMessage({ text: 'Server-Adresse zurückgesetzt! App wird neu geladen... 🔄', type: 'success' });
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const testConnection = async () => {
        setTesting(true);
        setStatusMessage({ text: 'Teste Verbindung...', type: '' });
        try {
            let testUrl = tempApiUrl.trim();
            if (testUrl.endsWith('/')) {
                testUrl = testUrl.slice(0, -1);
            }
            const response = await fetch(`${testUrl || window.location.origin}/api/status`, {
                mode: 'cors'
            });
            if (response.ok) {
                setStatusMessage({ text: 'Verbindung zum Server erfolgreich! ✅', type: 'success' });
            } else {
                setStatusMessage({ text: `Server antwortet mit Fehler ${response.status}`, type: 'error' });
            }
        } catch (error) {
            setStatusMessage({ text: 'Server nicht erreichbar! ❌ Bitte URL prüfen.', type: 'error' });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]">
            <div 
                className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
                style={{
                    paddingBottom: 'calc(32px + var(--safe-area-bottom-offset, 0px))'
                }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Entwickleroptionen & Debug</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <X size={24} />
                    </button>
                </div>

                {statusMessage.text && (
                    <div className={`p-4 rounded-2xl mb-6 text-xs font-bold ${statusMessage.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : statusMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {statusMessage.text}
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-4">
                            <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600">
                                <Globe size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Server-Adresse (Backend)</p>
                                <p className="text-[10px] text-gray-400 font-medium break-all">
                                    Aktuell aktiv: {API_BASE || 'Relatives Root-Verzeichnis'}
                                </p>
                            </div>
                        </div>
                        <input
                            type="text"
                            value={tempApiUrl}
                            onChange={(e) => setTempApiUrl(e.target.value)}
                            placeholder="z.B. http://192.168.178.50:3000"
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={testConnection}
                            disabled={testing}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                        >
                            <Shield size={16} />
                            <span>{testing ? 'Testen...' : 'Verbindung testen'}</span>
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        {localStorage.getItem('api_custom_url') && (
                            <button
                                onClick={handleResetApiUrl}
                                className="flex-1 px-4 py-4 bg-red-50 text-red-600 font-bold text-sm rounded-2xl hover:bg-red-100 border border-red-100 transition-all active:scale-95 cursor-pointer"
                            >
                                Reset URL
                            </button>
                        )}
                        <button
                            onClick={handleSaveApiUrl}
                            className="flex-1 px-4 py-4 bg-black text-white font-bold text-sm rounded-2xl hover:bg-gray-800 transition-all active:scale-95 cursor-pointer"
                        >
                            Speichern
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebugModal;
