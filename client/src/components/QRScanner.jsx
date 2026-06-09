import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

const QRScanner = ({ onScan, onClose }) => {
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        const startScanner = async () => {
            setError(null);
            try {
                // Ensure DOM element is present
                const readerDiv = document.getElementById("reader");
                if (!readerDiv) {
                    console.error("Reader element not found");
                    return;
                }

                if (!html5QrCodeRef.current) {
                    html5QrCodeRef.current = new Html5Qrcode("reader");
                }

                // Check if already scanning to avoid errors
                if (html5QrCodeRef.current.isScanning) {
                    return;
                }

                await html5QrCodeRef.current.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        onScan(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => {
                        // ignore error messages during scan
                    }
                );
            } catch (err) {
                console.error("Unable to start scanner", err);
                if (err.name === 'NotAllowedError' || err === 'NotAllowedError') {
                    setError("Kamera-Zugriff verweigert. Bitte erlauben Sie der App den Zugriff auf die Kamera in den Android-Einstellungen.");
                } else if (err.name === 'NotFoundError' || err === 'NotFoundError') {
                    setError("Keine Kamera gefunden.");
                } else {
                    setError("Kamera konnte nicht gestartet werden: " + (err.message || err));
                }
            }
        };

        // Delay to ensure the "reader" div is rendered
        const timer = setTimeout(startScanner, 200);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, []);

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner", err);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[60] p-6">
            <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-[#1b3a2e]">
                        <Camera size={20} />
                        <span className="font-bold uppercase tracking-widest text-xs">QR-Code scannen</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div id="reader" className="w-full aspect-square bg-gray-900 relative">
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-900/90 z-20">
                            <p className="text-white text-sm font-bold mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-white text-[#1b3a2e] px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest"
                            >
                                Seite neu laden
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-6 text-center">
                    <p className="text-sm text-gray-400 font-medium">Halten Sie den QR-Code Ihrer Falle mittig vor die Kamera.</p>
                </div>
            </div>

            <button
                onClick={onClose}
                className="mt-8 px-8 py-3 bg-white/10 text-white rounded-full font-bold hover:bg-white/20 transition-colors"
            >
                Abbrechen
            </button>
        </div>
    );
};

export default QRScanner;
