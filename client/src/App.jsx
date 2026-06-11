import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Setup from './components/Setup';
import Login from './components/Login';
import Register from './components/Register';
import { Home, Plus, Settings } from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import API_BASE from './apiConfig';

import { App as CapApp } from '@capacitor/app';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'register', 'dashboard', 'setup'

  // ── Android 15+ Safe Area / Edge-to-Edge Detection ──────────────────────────
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const ua = navigator.userAgent;
      const match = ua.match(/Android\s+([0-9]+)/);
      if (match) {
        const version = parseInt(match[1], 10);
        if (version >= 15) {
          document.documentElement.style.setProperty('--safe-area-bottom-offset', 'env(safe-area-inset-bottom, 24px)');
          document.documentElement.classList.add('android-15');
        }
      }
    }
  }, []);

  // ── Android Back Button Support ─────────────────────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListener = CapApp.addListener('backButton', () => {
      // 1. Dispatch custom event so components can intercept (close modals)
      const ev = new CustomEvent('backbutton', {
        cancelable: true,
        detail: { currentView: view }
      });
      window.dispatchEvent(ev);

      if (ev.defaultPrevented) {
        console.log('App: Back button handled by component (modal closed).');
        return;
      }

      // 2. Navigation fallback
      if (view === 'setup') {
        setView('dashboard');
      } else if (view === 'register') {
        setView('login');
      } else {
        // Dashboard or Login -> Exit
        console.log('App: Back button -> Exiting app.');
        CapApp.exitApp();
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [view]);

  // ── Global Push Notification Logic ──────────────────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initPush = async () => {
      // 1. Create Channel (Required for Android 8+)
      try {
        await PushNotifications.createChannel({
          id: 'catch-channel',
          name: 'CatchSensor Alarme',
          description: 'Kanal für Fangmeldungen und Status-Updates',
          importance: 5, // High/Max importance
          visibility: 1, // Public
          vibration: true
        });
        console.log('App: Push channel "catch-channel" created/verified.');
      } catch (e) {
        console.error('App: Failed to create push channel', e);
      }

      // 2. Initial permission check & registration
      const result = await PushNotifications.checkPermissions();
      if (result.receive === 'granted') {
        PushNotifications.register();
      } else if (result.receive === 'prompt' || result.receive === 'default') {
        const requestResult = await PushNotifications.requestPermissions();
        if (requestResult.receive === 'granted') {
          PushNotifications.register();
        }
      }
    };
    initPush();

    // 3. Listeners
    const registrationListener = PushNotifications.addListener('registration', async (token) => {
      console.log('App: Push registration success, token: ' + token.value);
      localStorage.setItem('fcm_token', token.value);
      syncPushToken(token.value);
    });

    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('App: Push registration error: ' + JSON.stringify(error));
    });

    const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('App: Push received: ' + JSON.stringify(notification));
    });

    return () => {
      registrationListener.remove();
      errorListener.remove();
      notificationListener.remove();
    };
  }, []);

  // Helper to sync token when user is available
  const syncPushToken = async (tokenValue) => {
    const activeToken = tokenValue || localStorage.getItem('fcm_token');
    const authToken = localStorage.getItem('token');
    if (activeToken && authToken) {
      try {
        await fetch(`${API_BASE}/api/notifications/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ endpoint: activeToken, keys: null })
        });
        console.log('App: Push token synced with backend.');
      } catch (e) {
        console.error('App: Failed to sync push token', e);
      }
    }
  };

  // Re-sync when user/token changes
  useEffect(() => {
    if (user && user.token) {
      syncPushToken();
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    if (token && email) {
      setUser({ token, email });
      setView('dashboard');
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setUser(null);
    setView('login');
  };

  if (view === 'login') return <Login onLogin={handleLogin} onSwitchToRegister={() => setView('register')} />;
  if (view === 'register') return <Register onRegister={handleRegister} onSwitchToLogin={() => setView('login')} />;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <main className="flex-1 overflow-y-auto">
        {view === 'dashboard' ? (
          <Dashboard onLogout={handleLogout} />
        ) : (
          <Setup onLogout={handleLogout} />
        )}
      </main>

      {/* Bottom Navigation matching template */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pt-3 pb-3 z-40"
        style={{
          paddingBottom: 'calc(12px + var(--safe-area-bottom-offset, 0px))'
        }}
      >
        <div className="max-w-2xl mx-auto flex justify-between items-center text-gray-400">
          <button
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center space-y-1 transition-colors ${view === 'dashboard' ? 'text-green-700' : 'hover:text-green-700'}`}
          >
            <Home size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Melder</span>
          </button>

          <button
            onClick={() => {
              if (view !== 'dashboard') setView('dashboard');
              setTimeout(() => window.dispatchEvent(new CustomEvent('open-add-catch-sensor')), 100);
            }}
            className="flex flex-col items-center space-y-1 hover:text-green-700 transition-colors"
          >
            <Plus size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Neu</span>
          </button>

          <button
            onClick={() => setView('setup')}
            className={`flex flex-col items-center space-y-1 transition-colors ${view === 'setup' ? 'text-green-700' : 'hover:text-green-700'}`}
          >
            <Settings size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Setup</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
