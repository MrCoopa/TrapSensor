import { Capacitor } from '@capacitor/core';

// Use the user's local IP for native Android development
// For PWA/Web, leave empty to use relative paths (handled by proxy or same-origin)
const mode = import.meta.env.VITE_CONNECTIVITY_MODE || 'IP';
const API_BASE = Capacitor.isNativePlatform()
    ? (mode === 'DNS' ? import.meta.env.VITE_API_URL_DNS : import.meta.env.VITE_API_URL_IP)
    : '';

export default API_BASE;
