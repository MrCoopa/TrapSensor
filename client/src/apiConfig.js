import { Capacitor } from '@capacitor/core';

// Use the user's local IP for native Android development
// For PWA/Web, leave empty to use relative paths (handled by proxy or same-origin)
const mode = import.meta.env.VITE_CONNECTIVITY_MODE || 'IP';
const DEFAULT_API_BASE = Capacitor.isNativePlatform()
    ? (mode === 'DNS' ? import.meta.env.VITE_API_URL_DNS : import.meta.env.VITE_API_URL_IP)
    : '';

const customApiUrl = typeof window !== 'undefined' ? localStorage.getItem('api_custom_url') : null;
const API_BASE = customApiUrl || DEFAULT_API_BASE;

export default API_BASE;
