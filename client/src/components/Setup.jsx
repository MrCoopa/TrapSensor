import React, { useState, useEffect } from 'react';
import { User, Shield, Info, Trash2, LogOut, ChevronRight, Settings, X, Edit2, Globe, Clock, Plus } from 'lucide-react';
import EditCatchModal from './EditCatchModal';
import AddCatchModal from './AddCatchModal';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import API_BASE from '../apiConfig';

const Setup = ({ onLogout }) => {
    const [catches, setCatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
    const [selectedCatch, setSelectedCatch] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [catchToEdit, setCatchToEdit] = useState(null);
    const [shareEmail, setShareEmail] = useState('');
    const [catchShares, setCatchShares] = useState([]);
    const [loadingShares, setLoadingShares] = useState(false);
    const [pushoverAppKey, setPushoverAppKey] = useState('');
    const [pushoverUserKey, setPushoverUserKey] = useState('');
    const [batteryThreshold, setBatteryThreshold] = useState(15);
    const [batteryAlertInterval, setBatteryAlertInterval] = useState(8);
    const [offlineAlertInterval, setOfflineAlertInterval] = useState(8);
    const [catchAlertInterval, setCatchAlertInterval] = useState(3);
    const [showPushover, setShowPushover] = useState(false);
    const [pushoverEnabled, setPushoverEnabled] = useState(false);
    const [revierweltEnabled, setRevierweltEnabled] = useState(false);
    const [dailyStatusEnabled, setDailyStatusEnabled] = useState(false);
    const [dailyStatusTime, setDailyStatusTime] = useState('08:00');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [showRevierwelt, setShowRevierwelt] = useState(false);
    const [showIntegrations, setShowIntegrations] = useState(false);
    const [notifPermission, setNotifPermission] = useState('default');
    const [showDebug, setShowDebug] = useState(false);
    const [tempApiUrl, setTempApiUrl] = useState(() => localStorage.getItem('api_custom_url') || API_BASE);


    const [isSavingProfile, setIsSavingProfile] = useState(false);

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
        setStatusMessage({ text: 'Teste Verbindung...', type: '' });
        try {
            const response = await fetch(`${API_BASE}/api/status`);
            if (response.ok) {
                setStatusMessage({ text: 'Verbindung zum Server erfolgreich! ✅', type: 'success' });
            } else {
                setStatusMessage({ text: `Server antwortet mit Fehler ${response.status}`, type: 'error' });
            }
        } catch (error) {
            setStatusMessage({ text: 'Server nicht erreichbar! ❌ Prüfen Sie die IP-Adresse.', type: 'error' });
        }
    };

    const handleRemoteTestPush = async () => {
        setStatusMessage({ text: 'Sende Test-Push über Server...', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/notifications/test`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                // If count is 0, it's a "success" 200 but nothing sent
                if (data.count === 0) {
                    setStatusMessage({ text: data.message || 'Keine Abos gefunden.', type: 'error' });
                } else {
                    setStatusMessage({ text: data.message || 'Test-Push erfolgreich gesendet! 🚀', type: 'success' });
                }
            } else {
                setStatusMessage({ text: `Status ${res.status}: ${data.message || 'Fehler'}`, type: 'error' });
            }
        } catch (error) {
            console.error('Remote test push error:', error);
            setStatusMessage({ text: 'Verbindungsfehler.', type: 'error' });
        }
    };



    // Simplified notification logic (automations happen in App.jsx)

    useEffect(() => {
        // Check current permission status on every mount
        if (Capacitor.isNativePlatform()) {
            PushNotifications.checkPermissions().then(result => {
                setNotifPermission(result.receive);
            }).catch(() => { });
        }
    }, []);

    const handleRequestPermission = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const result = await PushNotifications.requestPermissions();
                setNotifPermission(result.receive);
                if (result.receive === 'granted') {
                    PushNotifications.register();
                    setStatusMessage({ text: 'Native Push-Berechtigung erteilt! 🚀', type: 'success' });
                } else {
                    setStatusMessage({ text: 'Native Push-Berechtigung abgelehnt.', type: 'error' });
                }
            } catch (e) {
                console.error('Permission request failed', e);
                setStatusMessage({ text: 'Fehler bei Berechtigungsanfrage: ' + e.message, type: 'error' });
            }
            return;
        }
        setStatusMessage({ text: 'Bitte nutzen Sie die App für Benachrichtigungen.', type: 'error' });
    };

    const handleClearPushSubscriptions = async () => {
        if (!confirm('Möchten Sie wirklich alle Benachrichtigungs-Abos für dieses Konto löschen?')) return;
        setStatusMessage({ text: 'Lösche Abos...', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/notifications/clear-all`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setStatusMessage({ text: 'Alle Push-Abos wurden gelöscht. ✅', type: 'success' });
            } else {
                setStatusMessage({ text: 'Fehler beim Löschen der Abos.', type: 'error' });
            }
        } catch (error) {
            console.error('Clear push error:', error);
            setStatusMessage({ text: 'Verbindungsfehler.', type: 'error' });
        }
    };


    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Parallel fetch for user profile and catches list
            const [userRes, catchesRes] = await Promise.all([
                fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/catches`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (userRes.status === 401 || catchesRes.status === 401) {
                onLogout();
                return;
            }

            if (userRes.ok) {
                const userData = await userRes.json();
                setCurrentUser(userData);
                setPushoverAppKey(userData.pushoverAppKey || '');
                setPushoverUserKey(userData.pushoverUserKey || '');
                setBatteryThreshold(userData.batteryThreshold || 20);
                setBatteryAlertInterval(userData.batteryAlertInterval || 24);
                setOfflineAlertInterval(userData.offlineAlertInterval || 24);
                setCatchAlertInterval(userData.catchAlertInterval || 1);
                setPushoverEnabled(userData.pushoverEnabled || false);
                setRevierweltEnabled(userData.revierweltEnabled || false);
                setDailyStatusEnabled(userData.dailyStatusEnabled || false);
                setDailyStatusTime(userData.dailyStatusTime || '08:00');
                if (userData.pushEnabled !== undefined) { /* ignore, always enabled now */ }


            }

            if (catchesRes.ok) setCatches(await catchesRes.json());

        } catch (error) {
            console.error('Fehler beim Abrufen der Daten:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ── Android Back Button Support ──────────────────────────────────────────
    useEffect(() => {
        const handleBackEvent = (ev) => {
            if (isEditModalOpen) {
                ev.preventDefault();
                setIsEditModalOpen(false);
            } else if (selectedCatch) {
                ev.preventDefault();
                setSelectedCatch(null);
            } else if (isChangingPassword) {
                ev.preventDefault();
                setIsChangingPassword(false);
            }
        };
        window.addEventListener('backbutton', handleBackEvent);
        return () => window.removeEventListener('backbutton', handleBackEvent);
    }, [isEditModalOpen, selectedCatch, isChangingPassword]);

    const handleUpdateProfile = async () => {
        handleUpdateProfileWithVal();
    };

    const handleUpdateProfileWithVal = async (overrides = {}) => {
        setIsSavingProfile(true);
        setStatusMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/auth/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pushoverAppKey,
                    pushoverUserKey,
                    batteryThreshold,
                    catchAlertInterval,
                    pushoverEnabled,
                    revierweltEnabled,
                    dailyStatusEnabled,
                    dailyStatusTime,
                    ...overrides
                })
            });

            if (res.ok) {
                // fetchData(); // Remove to avoid flickering if needed, or keep for consistency
            } else {
                setStatusMessage({ text: 'Fehler beim Speichern.', type: 'error' });
            }
        } catch (error) {
            console.error('Update profile error:', error);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleEditCatch = (catchSensor, event) => {
        event.stopPropagation();
        setCatchToEdit(catchSensor);
        setIsEditModalOpen(true);
    };

    const handleCatchUpdated = (updatedCatch) => {
        setCatches(catches.map(c => c.id === updatedCatch.id ? updatedCatch : c));
        // Also update selectedCatch if it's currently open
        if (selectedCatch && selectedCatch.id === updatedCatch.id) {
            setSelectedCatch(updatedCatch);
        }
    };

    const handleDeleteCatchSensor = async (id, name, userId, event) => {
        event.stopPropagation(); // Prevent opening detail modal

        const isOwner = currentUser && currentUser.id === userId;
        const confirmMsg = isOwner
            ? `Möchten Sie den Melder "${name}" wirklich unwiderruflich löschen?`
            : `Möchten Sie den Melder "${name}" aus Ihrer Ansicht entfernen? (Der Besitzer behält ihn)`;

        if (window.confirm(confirmMsg)) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE}/api/catches/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    setCatches(catches.filter(c => c.id !== id));
                    if (selectedCatch && selectedCatch.id === id) setSelectedCatch(null);
                } else {
                    const errorData = await response.json();
                    console.error('Löschen fehlgeschlagen:', response.status, errorData);
                    alert(`Fehler beim Löschen: ${errorData.error || 'Serverfehler'}`);
                }
            } catch (error) {
                console.error('Fehler beim Löschen:', error);
            }
        }
    };

    const handleShareCatchSensor = async (e) => {
        e.preventDefault();
        if (!shareEmail) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/catches/${selectedCatch.id}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: shareEmail })
            });

            const data = await response.json();

            if (response.ok) {
                setShareEmail('');
                alert('CatchSensor erfolgreich geteilt!');
                fetchShares(selectedCatch.id);
            } else {
                alert(`Fehler: ${data.error}`);
            }
        } catch (error) {
            console.error('Share error:', error);
            alert('Verbindungsfehler beim Teilen.');
        }
    };

    const handleUnshareCatchSensor = async (userId) => {
        if (!confirm('Zugriff für diesen Nutzer wirklich entfernen?')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/catches/${selectedCatch.id}/share/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchShares(selectedCatch.id);
            } else {
                alert('Fehler beim Entfernen der Freigabe.');
            }
        } catch (error) {
            console.error('Unshare error:', error);
        }
    };

    const fetchShares = async (catchSensorId) => {
        setLoadingShares(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/catches/${catchSensorId}/shares`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setCatchShares(await response.json());
            } else {
                setCatchShares([]);
            }
        } catch (error) {
            console.error('Fetch shares error:', error);
            setCatchShares([]);
        } finally {
            setLoadingShares(false);
        }
    };

    const openCatchSensorDetail = (catchSensor) => {
        setSelectedCatch(catchSensor);
        // Only fetch shares if I am the owner (userId matches). Determine simple check or try fetch.
        // If query fails (403), we know we are not owner.
        // We can check currentUser.id === catchSensor.userId if available.
        if (currentUser && catchSensor.userId === currentUser.id) {
            fetchShares(catchSensor.id);
        } else {
            setCatchShares([]);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setStatusMessage({ text: '', type: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setStatusMessage({ text: 'Passwörter stimmen nicht überein.', type: 'error' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setStatusMessage({ text: 'Das Passwort muss mindestens 6 Zeichen lang sein.', type: 'error' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStatusMessage({ text: 'Passwort erfolgreich geändert!', type: 'success' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => {
                    setIsChangingPassword(false);
                    setStatusMessage({ text: '', type: '' });
                }, 2000);
            } else {
                setStatusMessage({ text: data.message || 'Fehler beim Ändern des Passworts.', type: 'error' });
            }
        } catch (error) {
            console.error('Password change error:', error);
            setStatusMessage({ text: 'Verbindungsfehler zum Server. Prüfen Sie die Internetverbindung.', type: 'error' });
        }
    };

    const handleDeleteAccount = async () => {
        if (confirmDeleteText !== 'LÖSCHEN') {
            setStatusMessage({ text: 'Bitte geben Sie "LÖSCHEN" ein, um zu bestätigen.', type: 'error' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setStatusMessage({ text: 'Account erfolgreich gelöscht. Auf Wiedersehen!', type: 'success' });
                setTimeout(() => {
                    setIsDeletingAccount(false);
                    onLogout();
                }, 2000);
            } else {
                setStatusMessage({ text: data.message || 'Fehler beim Löschen des Accounts.', type: 'error' });
            }
        } catch (error) {
            console.error('Delete account error:', error);
            setStatusMessage({ text: 'Verbindungsfehler zum Server. Prüfen Sie die Internetverbindung.', type: 'error' });
        }
    };





    const fixMe = "cleanup"; // Removing the old misplaced function definitions here

    if (isChangingPassword) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-[#1b3a2e] text-white pt-12 pb-4 px-6 sticky top-0 z-30 shadow-md">
                    <div className="flex items-center space-x-3 max-w-2xl mx-auto">
                        <button onClick={() => setIsChangingPassword(false)} className="bg-white/10 p-2 rounded-xl">
                            <ChevronRight size={20} className="rotate-180" />
                        </button>
                        <h1 className="text-xl font-bold">Passwort ändern</h1>
                    </div>
                </header>

                <main className="max-w-2xl mx-auto w-full px-6 pt-8">
                    <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100">
                        {statusMessage.text && (
                            <div className={`p-4 rounded-2xl mb-6 text-sm font-bold ${statusMessage.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                {statusMessage.text}
                            </div>
                        )}

                        <form onSubmit={handlePasswordChange} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Aktuelles Passwort</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-[#1b3a2e]/20 outline-none transition-all"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Neues Passwort</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-[#1b3a2e]/20 outline-none transition-all"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Passwort bestätigen</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-[#1b3a2e]/20 outline-none transition-all"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[#1b3a2e] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#1b3a2e]/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                            >
                                Passwort jetzt aktualisieren
                            </button>


                        </form>
                    </div>
                </main>
            </div>
        );
    }

    if (isDeletingAccount) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-[#1b3a2e] text-white pt-12 pb-4 px-6 sticky top-0 z-30 shadow-md">
                    <div className="flex items-center space-x-3 max-w-2xl mx-auto">
                        <button onClick={() => setIsDeletingAccount(false)} className="bg-white/10 p-2 rounded-xl">
                            <ChevronRight size={20} className="rotate-180" />
                        </button>
                        <h1 className="text-xl font-bold">Konto löschen</h1>
                    </div>
                </header>

                <main className="max-w-2xl mx-auto w-full px-6 pt-8">
                    <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100 space-y-6">
                        <div className="bg-red-50 text-red-800 p-4 rounded-2xl border border-red-100 space-y-2">
                            <h3 className="font-bold text-sm">⚠️ ACHTUNG: Unwiderrufliche Aktion</h3>
                            <p className="text-xs leading-relaxed">
                                Wenn Sie Ihr Konto löschen, werden alle Ihre Daten (inklusive registrierter Melder, historischer Messwerte und Freigaben) dauerhaft und unwiderruflich gelöscht.
                            </p>
                        </div>

                        {statusMessage.text && (
                            <div className={`p-4 rounded-2xl text-sm font-bold ${statusMessage.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                {statusMessage.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    Geben Sie zur Bestätigung <strong>LÖSCHEN</strong> ein:
                                </label>
                                <input
                                    type="text"
                                    placeholder="LÖSCHEN"
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-red-500/20 outline-none transition-all font-bold tracking-widest text-center"
                                    value={confirmDeleteText}
                                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                                />
							</div>

                            <button
                                onClick={handleDeleteAccount}
                                disabled={confirmDeleteText !== 'LÖSCHEN'}
                                className={`w-full py-4 rounded-2xl font-black text-white text-sm uppercase tracking-widest transition-all ${
                                    confirmDeleteText === 'LÖSCHEN'
                                        ? 'bg-red-600 shadow-lg shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98]'
                                        : 'bg-gray-200 cursor-not-allowed text-gray-400'
                                }`}
                            >
                                Konto jetzt löschen
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-gray-50 flex flex-col"
            style={{
                paddingBottom: 'calc(96px + var(--safe-area-bottom-offset, 0px))'
            }}
        >
            {/* Header matching template */}
            <header className="bg-[#1b3a2e] text-white pt-12 pb-4 px-6 sticky top-0 z-30 shadow-md">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/icons/fox-logo.png"
                            alt="CatchSensor Logo"
                            className="w-20 h-20 rounded-3xl shadow-xl border border-white/20 object-contain bg-white/5"
                        />
                        <h1 className="text-2xl font-black tracking-tight">CatchSensor Setup</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Settings size={20} className="text-white/60" />
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto w-full px-6 pt-6 space-y-8">
                {/* Push Notifications Section */}
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Benachrichtigungen</label>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-2.5 rounded-2xl bg-[#1b3a2e]/10 text-[#1b3a2e]">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Push-Alarm</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Automatisch aktiv auf diesem Mobilgerät</p>
                                </div>
                            </div>
                        </div>

                        {/* Daily Status Report */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="p-2.5 rounded-2xl bg-[#1b3a2e]/10 text-[#1b3a2e]">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Tägliche Statusauskunft</p>
                                        <p className="text-[10px] text-gray-400 font-medium font-bold">Status der Melder einmal täglich senden</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 px-2">
                                    <div
                                        onClick={() => {
                                            const newVal = !dailyStatusEnabled;
                                            setDailyStatusEnabled(newVal);
                                            setTimeout(() => handleUpdateProfileWithVal({ dailyStatusEnabled: newVal }), 0);
                                        }}
                                        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${dailyStatusEnabled ? 'bg-[#1b3a2e]' : 'bg-gray-200'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${dailyStatusEnabled ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </div>
                            </div>
                            {dailyStatusEnabled && (
                                <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <span className="text-xs font-bold text-gray-600">Sendezeitpunkt:</span>
                                    <div className="flex items-center space-x-1">
                                        <select
                                            value={dailyStatusTime.split(':')[0] || '08'}
                                            onChange={(e) => {
                                                const newHour = e.target.value;
                                                const newMin = dailyStatusTime.split(':')[1] || '00';
                                                const newTime = `${newHour}:${newMin}`;
                                                setDailyStatusTime(newTime);
                                                handleUpdateProfileWithVal({ dailyStatusTime: newTime });
                                            }}
                                            className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-sm font-bold text-[#1b3a2e] focus:outline-none focus:border-[#1b3a2e] transition-colors cursor-pointer"
                                        >
                                            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        <span className="text-sm font-bold text-gray-500">:</span>
                                        <select
                                            value={dailyStatusTime.split(':')[1] || '00'}
                                            onChange={(e) => {
                                                const newHour = dailyStatusTime.split(':')[0] || '08';
                                                const newMin = e.target.value;
                                                const newTime = `${newHour}:${newMin}`;
                                                setDailyStatusTime(newTime);
                                                handleUpdateProfileWithVal({ dailyStatusTime: newTime });
                                            }}
                                            className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-sm font-bold text-[#1b3a2e] focus:outline-none focus:border-[#1b3a2e] transition-colors cursor-pointer"
                                        >
                                            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <span className="text-xs font-bold text-gray-500 pl-1">Uhr</span>
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Battery Threshold Slider */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-yellow-50 p-2.5 rounded-2xl text-yellow-600">
                                        <div className="w-5 h-5 flex items-center justify-center font-bold text-[10px]">{batteryThreshold}%</div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Batterie-Warnschwelle</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Alarm unter {batteryThreshold}% Ladung</p>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="90"
                                step="5"
                                value={batteryThreshold}
                                onChange={(e) => setBatteryThreshold(parseInt(e.target.value))}
                                onMouseUp={handleUpdateProfile}
                                onTouchEnd={handleUpdateProfile}
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#1b3a2e]"
                            />
                        </div>

                        {/* Integrations Header (Top Level Row) */}
                        <div
                            className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setShowIntegrations(!showIntegrations)}
                        >
                            <div className="flex items-center space-x-4">
                                <div className="p-2.5 rounded-2xl bg-[#1b3a2e]/10 text-[#1b3a2e]">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Integrationen</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Pushover, Revierwelt</p>
                                </div>
                            </div>
                            <ChevronRight
                                size={18}
                                className={`text-gray-300 transition-transform ${showIntegrations ? 'rotate-90' : ''}`}
                            />
                        </div>

                        {showIntegrations && (
                            <div className="bg-gray-50/30 divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Pushover Config Row */}
                                <div className="p-4 pl-8 space-y-4">
                                    <div
                                        className="flex items-center space-x-4 cursor-pointer hover:bg-white/50 -m-4 p-4 transition-colors"
                                        onClick={() => setShowPushover(!showPushover)}
                                    >
                                        <div className="bg-orange-50 p-2.5 rounded-2xl text-orange-600">
                                            <Info size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900">Pushover</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Zusätzliche Alarme am Handy</p>
                                        </div>
                                        <div className="flex items-center space-x-2 px-2" onClick={(e) => e.stopPropagation()}>
                                            <div
                                                onClick={() => {
                                                    const newVal = !pushoverEnabled;
                                                    setPushoverEnabled(newVal);
                                                    setTimeout(() => handleUpdateProfileWithVal({ pushoverEnabled: newVal }), 0);
                                                }}
                                                className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${pushoverEnabled ? 'bg-[#1b3a2e]' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${pushoverEnabled ? 'left-6' : 'left-1'}`} />
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={18}
                                            className={`text-gray-300 transition-transform ${showPushover ? 'rotate-90' : ''}`}
                                        />
                                    </div>

                                    {showPushover && (
                                        <div className="space-y-2 pt-2">
                                            <input
                                                type="text"
                                                placeholder="Pushover Application Key (Token)..."
                                                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                                                value={pushoverAppKey}
                                                onChange={(e) => setPushoverAppKey(e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Pushover User Key..."
                                                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                                                value={pushoverUserKey}
                                                onChange={(e) => setPushoverUserKey(e.target.value)}
                                            />
                                            <button
                                                onClick={handleUpdateProfile}
                                                disabled={isSavingProfile}
                                                className={`w-full py-3 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-all ${isSavingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {isSavingProfile ? 'Speichere...' : 'Pushover Speichern'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Revierwelt Config Row */}
                                <div className="p-4 pl-8 space-y-4">
                                    <div
                                        className="flex items-center space-x-4 cursor-pointer hover:bg-white/50 -m-4 p-4 transition-colors"
                                        onClick={() => setShowRevierwelt(!showRevierwelt)}
                                    >
                                        <div className="bg-green-50 p-2.5 rounded-2xl text-green-700">
                                            <Shield size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900">Revierwelt</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Fallenmeldung an Revierwelt</p>
                                        </div>
                                        <div className="flex items-center space-x-2 px-2" onClick={(e) => e.stopPropagation()}>
                                            <div
                                                onClick={() => {
                                                    const newVal = !revierweltEnabled;
                                                    setRevierweltEnabled(newVal);
                                                    setTimeout(() => handleUpdateProfileWithVal({ revierweltEnabled: newVal }), 0);
                                                }}
                                                className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${revierweltEnabled ? 'bg-[#1b3a2e]' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${revierweltEnabled ? 'left-6' : 'left-1'}`} />
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={18}
                                            className={`text-gray-300 transition-transform ${showRevierwelt ? 'rotate-90' : ''}`}
                                        />
                                    </div>

                                    {showRevierwelt && (
                                        <div className="space-y-3 pt-2">
                                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                                <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                                    Wenn diese Integration aktiv ist, kannst du beim Anlegen eines neuen Melders direkt deinen Revierwelt-Webhook angeben.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleUpdateProfile}
                                                disabled={isSavingProfile}
                                                className={`w-full py-3 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-all ${isSavingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {isSavingProfile ? 'Speichere...' : 'Revierwelt Speichern'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Account Section - RESTORED */}
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Konto & Profil</label>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                        <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="bg-green-50 p-2.5 rounded-2xl text-green-700">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{currentUser?.email || 'Lädt...'}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Aktiver Benutzer</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                        <div
                            onClick={() => setIsChangingPassword(true)}
                            className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-700">
                                    <Shield size={20} />
                                </div>
                                <div className="text-sm font-bold text-gray-900">Passwort ändern</div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>

                        <button
                            onClick={onLogout}
                            className="w-full text-left p-4 flex items-center justify-between hover:bg-red-50 transition-colors group"
                        >

                            <div className="flex items-center space-x-4">
                                <div className="bg-red-50 p-2.5 rounded-2xl text-red-600 group-hover:bg-red-100">
                                    <LogOut size={20} />
                                </div>
                                <div className="text-sm font-bold text-red-600">Abmelden</div>
                            </div>
                            <ChevronRight size={18} className="text-red-300" />
                        </button>

                        <button
                            onClick={() => {
                                setConfirmDeleteText('');
                                setStatusMessage({ text: '', type: '' });
                                setIsDeletingAccount(true);
                            }}
                            className="w-full text-left p-4 flex items-center justify-between hover:bg-red-100/30 transition-colors group"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="bg-red-50 p-2.5 rounded-2xl text-red-600 group-hover:bg-red-100 transition-colors">
                                    <Trash2 size={20} />
                                </div>
                                <div className="text-sm font-bold text-red-600">Account löschen</div>
                            </div>
                            <ChevronRight size={18} className="text-red-300" />
                        </button>
                    </div>
                </section>

                {/* Add CatchSensor Section */}
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Catchsensor hinzufügen</label>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="bg-green-50 p-2.5 rounded-2xl text-green-700 group-hover:bg-green-100 transition-colors">
                                    <Plus size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-900">Neuen Melder registrieren</p>
                                    <p className="text-[10px] text-gray-400 font-medium">NB-IoT oder LoRaWAN Gerät hinzufügen</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </button>
                    </div>
                </section>

                {/* CatchSensor Management Section */}
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">CatchSensor Verwalten</label>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-center">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">Lade CatchSensor...</div>
                        ) : catches.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">Keine CatchSensor gefunden.</div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {catches.map(catchSensor => (
                                    <div
                                        key={catchSensor.id}
                                        onClick={() => openCatchSensorDetail(catchSensor)}
                                        className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-gray-50 p-2 rounded-xl text-gray-400">
                                                <div className={`w-3 h-3 rounded-full ${catchSensor.status === 'triggered' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : catchSensor.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-900">{catchSensor.alias || catchSensor.name}</p>
                                                    <span className={`text-[8px] font-black px-1 py-0.5 rounded-md border ${catchSensor.type === 'LORAWAN' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                        {catchSensor.type || 'NB-IOT'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-medium">{catchSensor.type === 'LORAWAN' ? catchSensor.deviceId : catchSensor.imei}</p>
                                            </div>

                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {/* Edit Button (Owner Only) */}
                                            {currentUser && catchSensor.userId === currentUser.id && (
                                                <button
                                                    onClick={(e) => handleEditCatch(catchSensor, e)}
                                                    className="p-2 text-gray-300 hover:text-[#1b3a2e] hover:bg-green-50 rounded-xl transition-all"
                                                    title="Bearbeiten"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openCatchSensorDetail(catchSensor);
                                                }}
                                                className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Freigeben / Details"
                                            >
                                                <User size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteCatchSensor(catchSensor.id, catchSensor.name, catchSensor.userId, e)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Löschen / Entfernen"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section >



                {/* CatchSensor Details & Share Modal */}
                {
                    selectedCatch && (
                        <div
                            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-md p-4"
                            onClick={() => setSelectedCatch(null)}
                        >
                            <div
                                className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    paddingBottom: 'calc(24px + var(--safe-area-bottom-offset, 0px))'
                                }}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">{selectedCatch.name}</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{selectedCatch.location || 'Kein Standort'}</p>
                                    </div>
                                    <button onClick={() => setSelectedCatch(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Status</div>
                                            <div className={`font-bold ${selectedCatch.status === 'active' ? 'text-green-600' : 'text-gray-900'}`}>
                                                {selectedCatch.status === 'active' ? 'Online' : selectedCatch.status === 'triggered' ? 'Ausgelöst' : 'Inaktiv'}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <div className="text-[10px] uppercase font-black text-gray-400 mb-1">{selectedCatch.type === 'LORAWAN' ? 'Device ID' : 'IMEI'}</div>
                                            <div className="font-mono text-sm font-bold text-gray-900 truncate" title={selectedCatch.type === 'LORAWAN' ? selectedCatch.deviceId : selectedCatch.imei}>
                                                {selectedCatch.type === 'LORAWAN' ? selectedCatch.deviceId : selectedCatch.imei}
                                            </div>
                                        </div>

                                    </div>

                                    {/* Sharing Section */}
                                    <div className="border-t border-gray-100 pt-6">
                                        <h4 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                                            <User size={18} className="text-gray-400" />
                                            <span>CatchSensor teilen</span>
                                        </h4>

                                        {currentUser && selectedCatch.userId === currentUser.id ? (
                                            <>
                                                <p className="text-xs text-gray-500 mb-4">
                                                    Geben Sie eine E-Mail-Adresse ein, um diesen CatchSensor mit einem anderen Benutzer zu teilen.
                                                </p>

                                                <form onSubmit={handleShareCatchSensor} className="flex space-x-2 mb-6">
                                                    <input
                                                        type="email"
                                                        placeholder="E-Mail Adresse"
                                                        className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                                        value={shareEmail}
                                                        onChange={(e) => setShareEmail(e.target.value)}
                                                        required
                                                    />
                                                    <button type="submit" className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">
                                                        Teilen
                                                    </button>
                                                </form>

                                                <div className="space-y-3">
                                                    <div className="text-[10px] uppercase font-black text-gray-400">Bereits geteilt mit:</div>
                                                    {loadingShares ? (
                                                        <div className="text-sm text-gray-400 italic">Lade Freigaben...</div>
                                                    ) : catchShares.length === 0 ? (
                                                        <div className="text-sm text-gray-400 italic">Noch mit niemandem geteilt.</div>
                                                    ) : (
                                                        catchShares.map(share => (
                                                            <div key={share.userId} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 text-xs font-bold border border-gray-100">
                                                                        {share.email.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-xs font-bold text-gray-900">{share.email}</div>
                                                                        <div className="text-[10px] text-gray-400">Lesezugriff</div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleUnshareCatchSensor(share.userId)}
                                                                    className="text-red-400 hover:text-red-600 p-2"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-xs font-medium">
                                                ⚠️ Sie können diesen CatchSensor nicht teilen, da Sie nicht der Besitzer sind.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* App Installation Section - Only show if PWA installable AND not native (but user wants to hide it mostly) */}
                {/* User requested no PWA features on web, so we hide installation prompt entirety or only show on mobile web if needed. 
                    For now, we hide it completely to focus on Native App stability as requested. */
                }

                {/* Status Message Container */}
                {
                    statusMessage.text && !isChangingPassword && (
                        <div className={`mx-6 p-4 rounded-2xl text-sm font-bold ${statusMessage.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {statusMessage.text}
                        </div>
                    )
                }

                {/* Info Section */}
                <section>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Informationen</label>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="bg-gray-50 p-2.5 rounded-2xl text-gray-400">
                                    <Info size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">App Version</p>
                                    <p className="text-[10px] text-gray-400 font-medium">CatchSensor v1.2.0 (Build 2026.02)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div
                            onClick={() => setShowDebug(!showDebug)}
                            className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 cursor-pointer">
                                Entwickleroptionen & Debug
                            </label>
                            <ChevronRight size={18} className={`text-gray-300 transition-transform ${showDebug ? 'rotate-90' : ''}`} />
                        </div>

                        {showDebug && (
                            <div className="border-t border-gray-50 divide-y divide-gray-50">
                                {/* Server API URL Config */}
                                <div className="p-4 flex flex-col space-y-3 bg-gray-50/50">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600">
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Server-Adresse (Backend)</p>
                                            <p className="text-[10px] text-gray-400 font-medium break-all">
                                                Aktuell: {API_BASE || 'Relatives Root-Verzeichnis'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tempApiUrl}
                                            onChange={(e) => setTempApiUrl(e.target.value)}
                                            placeholder="z.B. http://192.168.178.50:3000"
                                            className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                        <button
                                            onClick={handleSaveApiUrl}
                                            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-all active:scale-95 cursor-pointer"
                                        >
                                            Speichern
                                        </button>
                                        {localStorage.getItem('api_custom_url') && (
                                            <button
                                                onClick={handleResetApiUrl}
                                                className="px-3 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 border border-red-100 transition-all active:scale-95 cursor-pointer"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-2.5 rounded-2xl ${notifPermission === 'granted' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            <Info size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Berechtigung</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-tight ${notifPermission === 'granted' ? 'text-green-600' : 'text-red-500'}`}>
                                                {notifPermission === 'granted' ? '✅ Erteilt' : notifPermission === 'denied' ? '❌ Blockiert' : '❓ Status offen'}
                                            </p>
                                        </div>
                                    </div>
                                    {notifPermission !== 'granted' && Capacitor.isNativePlatform() && (
                                        <button
                                            onClick={handleRequestPermission}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 active:scale-95 transition-all"
                                        >
                                            Anfordern
                                        </button>
                                    )}
                                </div>


                                <div
                                    onClick={() => {
                                        const token = localStorage.getItem('token');
                                        navigator.clipboard.writeText(token);
                                        setStatusMessage({ text: 'Token in Zwischenablage kopiert! ✅', type: 'success' });
                                        setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
                                    }}
                                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600">
                                            <Settings size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">API-Token kopieren</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Für MQTT-Simulator & Debugging</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300" />
                                </div>

                                <div
                                    onClick={testConnection}
                                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600">

                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Server-Verbindung</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Klicken zum Testen</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300" />
                                </div>
                                <div
                                    onClick={handleRemoteTestPush}
                                    className="p-4 flex items-center justify-between hover:bg-orange-50 group transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-orange-50 p-2.5 rounded-2xl text-orange-600 group-hover:bg-orange-100">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Push-Test (Server)</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Sende Test-Push via Server</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300" />
                                </div>

                                <div
                                    onClick={handleClearPushSubscriptions}
                                    className="p-4 flex items-center justify-between hover:bg-red-50 group transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-red-50 p-2.5 rounded-2xl text-red-600 group-hover:bg-red-100">
                                            <Trash2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-red-600">Push-Verbindung löschen</p>
                                            <p className="text-[10px] text-red-400 font-medium whitespace-nowrap">Löscht alle Abos für dieses Konto</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-red-300" />
                                </div>


                            </div>
                        )}
                    </div>
                </section>

                <EditCatchModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    catchSensor={catchToEdit}
                    onEdit={handleCatchUpdated}
                    revierweltEnabled={revierweltEnabled}
                />

                <AddCatchModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={(newCatch) => setCatches([...catches, newCatch])}
                    revierweltEnabled={revierweltEnabled}
                />

            </main >
        </div >
    );
};

export default Setup;
