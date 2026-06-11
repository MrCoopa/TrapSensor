import React, { useState, useEffect, useRef, useCallback } from 'react';
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

    // Ref to hold the socket instance so timers can access the latest socket
    const socketRef = useRef(null);

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

    /**
     * Silently fetches a new JWT from the backend using the current (still valid) token.
     * On success: stores the new token, reconnects the socket with the fresh auth.
     * On failure: logs the user out (token truly expired or revoked).
     */
    const silentRefresh = useCallback(async () => {
        console.log('Dashboard: 🔄 Attempting silent token refresh...');
        const currentToken = localStorage.getItem('token');
        if (!currentToken) { onLogout(); return; }
        try {
            const res = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (!res.ok) {
                console.warn('Dashboard: Silent refresh failed — logging out.');
                onLogout();
                return;
            }
            const { token: newToken } = await res.json();
            localStorage.setItem('token', newToken);
            console.log('Dashboard: ✅ Token refreshed successfully. Reconnecting socket...');

            // Reconnect socket with new token
            if (socketRef.current) {
                socketRef.current.auth = { token: newToken };
                socketRef.current.disconnect();
                socketRef.current.connect();
            }
        } catch (err) {
            console.error('Dashboard: Silent refresh error:', err);
            // Network offline — don't logout, just retry when socket reconnects
        }
    }, [onLogout]);

    /**
     * Decodes the current JWT and checks if it needs to be refreshed.
     * Since the token is valid for 30 days, we refresh it if it expires in less than 7 days.
     * Returns true if refresh was triggered.
     */
    const checkAndRefreshToken = useCallback((token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (!payload.exp) return false;

            const msUntilExpiry = payload.exp * 1000 - Date.now();

            if (msUntilExpiry <= 0) {
                // Token already expired — can't refresh, must logout
                console.warn('Dashboard: JWT already expired — logging out.');
                onLogout();
                return true;
            }

            // If token expires in less than 7 days, refresh it.
            // 7 days = 7 * 24 * 60 * 60 * 1000 = 604,800,000 ms
            const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
            if (msUntilExpiry < REFRESH_THRESHOLD_MS) {
                silentRefresh();
                return true;
            }
        } catch (e) {
            console.error('Dashboard: Could not decode JWT for refresh check.', e);
        }
        return false;
    }, [onLogout, silentRefresh]);

    useEffect(() => {
        fetchCatches();
        fetchUserProfile();

        const token = localStorage.getItem('token');
        if (!token) return;

        // Check immediately on mount
        checkAndRefreshToken(token);

        // Periodically check every 6 hours (safe, well within 24.8 days limit)
        // 6 hours = 6 * 60 * 60 * 1000 = 21,600,000 ms
        const refreshTimer = setInterval(() => {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                checkAndRefreshToken(currentToken);
            }
        }, 6 * 60 * 60 * 1000);

        // Socket.io should also use API_BASE for native path
        const socket = io(API_BASE, {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            timeout: 10000
        });
        socketRef.current = socket;

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
            // Only force logout for auth errors when we know the token is expired
            // (silentRefresh handles this case via the scheduler above)
        });

        // Server signals that the session is no longer valid and refresh also failed
        socket.on('auth_expired', () => {
            console.warn('Dashboard: auth_expired event received — logging out.');
            onLogout();
        });

        socket.on('catchSensorUpdate', (updatedCatch) => {
            console.log('Socket: Received update for detector:', updatedCatch.id);
            setCatches(prevCatches =>
                prevCatches.map(c => c.id === updatedCatch.id ? {
                    ...updatedCatch,
                    lorawanCatchSensor: updatedCatch.lorawanCatchSensor || c.lorawanCatchSensor
                } : c)
            );
        });

        socket.on('catchSensorDelete', ({ id }) => {
            console.log('Socket: Received delete for detector:', id);
            setCatches(prevCatches => prevCatches.filter(c => c.id !== id));
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
            if (refreshTimer) clearInterval(refreshTimer);
            socketRef.current = null;
            socket.off('connect');
            socket.off('disconnect');
            socket.off('reconnecting');
            socket.off('connect_error');
            socket.off('auth_expired');
            socket.off('catchSensorUpdate');
            socket.off('catchSensorDelete');
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

            <main
                className={`flex-1 max-w-2xl w-full mx-auto px-4 py-6 transition-opacity duration-300 ${connectionStatus === 'disconnected' ? 'pointer-events-none opacity-60' : ''}`}
                style={{
                    marginBottom: 'calc(96px + var(--safe-area-bottom-offset, 0px))'
                }}
            >
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
