import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import CatchCard from './CatchCard';
import AddCatchModal from './AddCatchModal';
import API_BASE from '../apiConfig';
import CatchDetailsModal from './CatchDetailsModal';
import { ArrowLeft } from 'lucide-react';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const Dashboard = ({ onLogout }) => {
    const [catches, setCatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedCatch, setSelectedCatch] = useState(null);
    const [revierweltEnabled, setRevierweltEnabled] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected', 'disconnected', 'connecting'

    const baseUrl = ''; // kept for socket.io if needed, or remove if socket io also proxies

    const fetchCatches = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/catches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                onLogout();
                return;
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                setCatches(data);
            }
        } catch (error) {
            console.error('Fehler beim Abrufen der Melder:', error);
            setConnectionStatus('disconnected');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRevierweltEnabled(data.revierweltEnabled || false);
            }
        } catch (error) {
            console.error('Fehler beim Abrufen des Benutzerprofils:', error);
        }
    };

    // Helper to get current user ID
    const getCurrentUserId = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id;
        } catch (e) {
            return null;
        }
    };

    const currentUserId = getCurrentUserId();

    useEffect(() => {
        fetchCatches();
        fetchUserProfile();

        const token = localStorage.getItem('token');
        if (!token) return;

        // Socket.io should also use API_BASE for native path
        const socket = io(API_BASE, {
            auth: {
                token: token
            },
            reconnectionAttempts: 5,
            timeout: 10000
        });

        socket.on('connect', () => {
            console.log('Socket: Connected to backend');
            setConnectionStatus('connected');
        });

        socket.on('disconnect', (reason) => {
            console.warn('Socket: Disconnected:', reason);
            setConnectionStatus('disconnected');
        });

        socket.on('reconnecting', () => {
            setConnectionStatus('connecting');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket Authentication Error:', err.message);
            setConnectionStatus('disconnected');
        });

        socket.on('catchSensorUpdate', (updatedCatch) => {
            console.log('Socket: Received update for detector:', updatedCatch.id);
            setCatches(prevCatches =>
                prevCatches.map(c => c.id === updatedCatch.id ? updatedCatch : c)
            );
        });

        const handleOpenModal = () => setIsAddModalOpen(true);
        window.addEventListener('open-add-catch-sensor', handleOpenModal);

        // ── Android Back Button Support ──────────────────────────────────────────
        const handleBackEvent = (ev) => {
            if (isAddModalOpen) {
                ev.preventDefault();
                setIsAddModalOpen(false);
            } else if (selectedCatch) {
                ev.preventDefault();
                setSelectedCatch(null);
            }
        };
        window.addEventListener('backbutton', handleBackEvent);

        // ── App State / Resume Listeners ─────────────────────────────────────────
        // Trigger a refresh whenever the app returns to focus or is resumed

        // 1. Web visibility change (works for PWA/Browser)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Dashboard: App visible, refetching...');
                fetchCatches();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 2. Capacitor App State (Native Android/iOS)
        let appStateListener = null;
        if (Capacitor.isNativePlatform()) {
            App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    console.log('Dashboard: App resumed (Native), refetching...');
                    fetchCatches();
                }
            }).then(l => appStateListener = l);

            // 3. Notification Action (clicked a push)
            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Dashboard: Notification clicked, refetching...');
                fetchCatches();
            });
        }

        return () => {
            console.log('Dashboard: Cleaning up socket & listeners');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('reconnecting');
            socket.off('connect_error');
            socket.off('catchSensorUpdate');
            socket.disconnect();
            window.removeEventListener('open-add-catch-sensor', handleOpenModal);
            window.removeEventListener('backbutton', handleBackEvent);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (appStateListener) appStateListener.remove();
            if (Capacitor.isNativePlatform()) {
                PushNotifications.removeAllListeners();
            }
        };
    }, []);

    const handleAddCatch = (newCatch) => {
        setCatches([...catches, newCatch]);
    };

    const handleAcknowledge = (catchId) => {
        setCatches(prev => prev.map(c =>
            c.id === catchId ? { ...c, alarmAcknowledgedAt: new Date().toISOString() } : c
        ));
    };

    const handleResync = (catchId, action) => {
        setCatches(prev => prev.map(c =>
            c.id === catchId 
                ? { ...c, resyncRequired: false, lastFCnt: action === 'reject' ? c.lastFCnt : -1 } 
                : c
        ));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header matching template */}
            <header className="bg-[#1b3a2e] text-white pt-12 pb-4 px-6 sticky top-0 z-30 shadow-md">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/icons/fox-logo.png"
                            alt="CatchSensor Logo"
                            className="w-20 h-20 rounded-3xl shadow-xl border border-white/20 object-contain bg-white/5"
                        />
                        <h1 className="text-2xl font-black tracking-tight">CatchSensor</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        {connectionStatus === 'connected' && (
                            <div className="bg-green-600/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Online
                            </div>
                        )}
                        {connectionStatus === 'disconnected' && (
                            <div className="bg-red-600/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
                                Offline
                            </div>
                        )}
                        {connectionStatus === 'connecting' && (
                            <div className="bg-amber-500/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
                                Verbinde...
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 mb-24">
                {catches.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200 shadow-sm">
                        <p className="text-gray-500 font-medium">Noch keine Melder. Klicken Sie auf "+ Neu".</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {catches.map((c) => (
                            <CatchCard
                                key={c.id}
                                catchSensor={c}
                                isShared={c.userId !== currentUserId}
                                onViewHistory={(t) => setSelectedCatch(t)}
                                onAcknowledge={handleAcknowledge}
                                onResync={handleResync}
                            />
                        ))}
                    </div>
                )}
            </main>

            <AddCatchModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddCatch}
                revierweltEnabled={revierweltEnabled}
            />

            <CatchDetailsModal
                isOpen={!!selectedCatch}
                catchSensor={selectedCatch}
                onClose={() => setSelectedCatch(null)}
            />
        </div>
    );
};

export default Dashboard;
