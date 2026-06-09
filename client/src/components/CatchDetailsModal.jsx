import React, { useState, useEffect } from 'react';
import { X, Battery, Signal } from 'lucide-react';
import BatteryIndicator from './BatteryIndicator';
import API_BASE from '../apiConfig';
import SignalIndicator from './SignalIndicator';

const CatchDetailsModal = ({ catchSensor, isOpen, onClose }) => {
    const [readings, setReadings] = useState([]);

    useEffect(() => {
        if (isOpen && catchSensor) {
            const fetchReadings = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_BASE}/api/readings/${catchSensor.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const data = await response.json();
                    setReadings(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error('Error fetching readings:', err);
                    setReadings([]);
                }
            };
            fetchReadings();
        }
    }, [isOpen, catchSensor]);

    const exportToCSV = () => {
        if (readings.length === 0) return;
        
        // CSV Headers (German naming matches application defaults)
        const headers = ['Zeitstempel', 'Status', 'Spannung (V)', 'Ladung (%)', 'Signal (dBm)', 'SNR (dB)', 'SF', 'Gateway-ID', 'F-CNT'];
        
        // Format rows
        const rows = readings.map(r => [
            new Date(r.timestamp).toLocaleString('de-DE'),
            r.status === 'triggered' ? 'CLOSED/FANG' : 'ACTIVE',
            ((r.value || 0) / 1000).toFixed(2).replace('.', ','),
            r.batteryPercent || 0,
            r.rsrp || 0,
            r.snr != null ? r.snr : (r.sinr != null ? r.sinr : ''),
            r.spreadingFactor || '',
            r.gatewayId || '',
            r.fCnt || 0
        ]);
        
        // Combine into CSV string (using semicolon for German Excel compatibility)
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(val => `"${val}"`).join(';'))
        ].join('\n');
        
        // Create download link with UTF-8 BOM
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `Report_${catchSensor.alias || catchSensor.name}_${new Date().toISOString().slice(0, 10)}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen || !catchSensor) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-xl w-full p-8 max-h-[90vh] flex flex-col relative">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{catchSensor.name}</h2>
                        {catchSensor.location && <p className="text-gray-400 text-sm font-medium">{catchSensor.location}</p>}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <X size={24} />
                    </button>
                </div>

                {catchSensor.lastSeen && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <div className="flex items-center text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">
                                <BatteryIndicator percentage={catchSensor.batteryPercent || 0} className="mr-2" /> Batterie
                            </div>
                            <div className="text-lg font-bold text-gray-900">{catchSensor.batteryPercent || 0}%</div>
                            <div className="text-[10px] text-gray-400 font-medium">{((catchSensor.batteryVoltage || 0) / 1000).toFixed(2).replace('.', ',')} V</div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-center">
                             <div className="flex items-center text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">
                                <SignalIndicator 
                                    rsrp={catchSensor.type === 'LORAWAN' ? catchSensor.lorawanCatchSensor?.loraRssi : catchSensor.rsrp} 
                                    rsrq={catchSensor.type === 'NB-IOT' ? catchSensor.rsrq : undefined}
                                    sinr={catchSensor.type === 'NB-IOT' ? catchSensor.sinr : undefined}
                                    snr={catchSensor.type === 'LORAWAN' ? catchSensor.lorawanCatchSensor?.snr : undefined} 
                                    type={catchSensor.type} 
                                    className="mr-2" 
                                /> Signal
                            </div>
                            <div className="flex flex-col">
                                <div className="text-lg font-bold text-gray-900 leading-none">{catchSensor.type === 'LORAWAN' ? (catchSensor.lorawanCatchSensor?.loraRssi || 0) : (catchSensor.rsrp || 0)} dBm</div>
                                 {catchSensor.lorawanCatchSensor && (
                                    <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-white/50 rounded-lg border border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] uppercase text-gray-400 font-bold">SNR</span>
                                            <span className="text-[10px] font-bold text-gray-700">{catchSensor.lorawanCatchSensor?.snr != null ? Number(catchSensor.lorawanCatchSensor.snr).toFixed(1) : 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] uppercase text-gray-400 font-bold">SF</span>
                                            <span className="text-[10px] font-bold text-gray-700">SF{catchSensor.lorawanCatchSensor.spreadingFactor}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] uppercase text-gray-400 font-bold">Gateways</span>
                                            <span className="text-[10px] font-bold text-gray-700">{catchSensor.lorawanCatchSensor.gatewayCount || 1}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] uppercase text-gray-400 font-bold">fCnt</span>
                                            <span className="text-[10px] font-bold text-gray-700">{catchSensor.lorawanCatchSensor.fCnt || 0}</span>
                                        </div>
                                        {catchSensor.lorawanCatchSensor.gatewayId && (
                                            <div className="flex flex-col col-span-2">
                                                <span className="text-[8px] uppercase text-gray-400 font-bold">Last Gateway</span>
                                                <span className="text-[9px] font-bold text-gray-700 truncate">{catchSensor.lorawanCatchSensor.gatewayId}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {catchSensor.type === 'NB-IOT' && (catchSensor.rsrq != null || catchSensor.sinr != null) && (
                                    <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-white/50 rounded-lg border border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] uppercase text-gray-400 font-bold">RSRQ</span>
                                            <span className="text-[10px] font-bold text-gray-700">{catchSensor.rsrq != null ? catchSensor.rsrq + ' dB' : 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] uppercase text-gray-400 font-bold">SINR</span>
                                            <span className="text-[10px] font-bold text-gray-700">{catchSensor.sinr != null ? catchSensor.sinr + ' dB' : 'N/A'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verlauf</h4>
                        {readings.length > 0 && (
                            <button 
                                onClick={exportToCSV}
                                className="text-[10px] font-black text-green-700 hover:text-green-800 uppercase tracking-widest border border-green-700/20 px-3 py-1 rounded-lg bg-green-50/50 transition-all active:scale-95"
                            >
                                CSV Exportieren
                            </button>
                        )}
                    </div>
                    <div className="space-y-4">
                        {readings.map((reading) => (
                            <div key={reading.id} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50">
                                {/* Header: Status & Date */}
                                <div className="flex justify-between items-center mb-3">
                                    <p className={`font-black text-xs tracking-widest uppercase ${reading.status === 'triggered' ? 'text-red-600' : 'text-green-600'}`}>
                                        {reading.status === 'triggered' ? '❌ FANG!' : '✅ ONLINE'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {new Date(reading.timestamp).toLocaleString('de-DE')}
                                    </p>
                                </div>

                                {/* Unified Row: Battery -> RSSI -> Metadata */}
                                <div className="flex items-center gap-4 w-full">

                                    {/* 1. Battery (Fixed Width) */}
                                    <div className="flex items-center space-x-2 shrink-0">
                                        <BatteryIndicator percentage={reading.batteryPercent || 0} />
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-gray-700 leading-none">{reading.batteryPercent || 0}%</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{((reading.value || 0) / 1000).toFixed(2).replace('.', ',')} V</span>
                                        </div>
                                    </div>

                                    {/* 2. Scrollable Metadata Stream (Takes remaining width) */}
                                    <div className="flex flex-1 items-center gap-3 overflow-x-auto custom-scrollbar pb-1">
                                        {/* Signal (RSSI) */}
                                        <div className="flex items-center space-x-2 shrink-0">
                                            <SignalIndicator 
                                                rsrp={reading.rsrp} 
                                                rsrq={catchSensor.type === 'NB-IOT' ? reading.rsrq : undefined}
                                                sinr={catchSensor.type === 'NB-IOT' ? reading.sinr : undefined}
                                                snr={reading.snr} 
                                                type={catchSensor.type} 
                                            />
                                            <span className="text-[12px] font-black text-gray-500 leading-none">{reading.rsrp || 0} dBm</span>
                                        </div>

                                        {/* Extended Metadata (NB-IoT only) */}
                                        {catchSensor.type === 'NB-IOT' && (reading.rsrq != null || reading.sinr != null) && (
                                            <>
                                                {reading.rsrq != null && (
                                                    <div className="flex items-center bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm shrink-0">
                                                        <span className="text-[8px] uppercase text-gray-400 font-bold mr-1">RSRQ</span>
                                                        <span className="text-[10px] font-bold text-gray-700">{reading.rsrq} dB</span>
                                                    </div>
                                                )}
                                                {reading.sinr != null && (
                                                    <div className="flex items-center bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm shrink-0">
                                                        <span className="text-[8px] uppercase text-gray-400 font-bold mr-1">SINR</span>
                                                        <span className="text-[10px] font-bold text-gray-700">{reading.sinr} dB</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {/* Extended Metadata (LoRaWAN only) */}
                                        {catchSensor.type === 'LORAWAN' && (reading.snr !== undefined || reading.spreadingFactor) && (
                                            <>
                                                {reading.snr !== undefined && (
                                                    <div className="flex items-center bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm shrink-0">
                                                        <span className="text-[8px] uppercase text-gray-400 font-bold mr-1">SNR</span>
                                                        <span className="text-[10px] font-bold text-gray-700">{reading.snr != null ? Number(reading.snr).toFixed(1) : 'N/A'}</span>
                                                    </div>
                                                )}
                                                {reading.spreadingFactor && (
                                                    <div className="flex items-center bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm shrink-0">
                                                        <span className="text-[8px] uppercase text-gray-400 font-bold mr-1">SF</span>
                                                        <span className="text-[10px] font-bold text-gray-700">{reading.spreadingFactor}</span>
                                                    </div>
                                                )}
                                                {reading.gatewayCount !== undefined && (
                                                    <div className="flex items-center bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm shrink-0">
                                                        <span className="text-[8px] uppercase text-gray-400 font-bold mr-1">GW</span>
                                                        <span className="text-[10px] font-bold text-gray-700">{reading.gatewayCount}</span>
                                                    </div>
                                                )}
                                                {reading.fCnt !== undefined && (
                                                    <div className="flex items-center bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm shrink-0">
                                                        <span className="text-[8px] uppercase text-gray-400 font-bold mr-1">F-CNT</span>
                                                        <span className="text-[10px] font-bold text-gray-700">{reading.fCnt}</span>
                                                    </div>
                                                )}
                                                {reading.gatewayId && (
                                                    <div className="flex items-center bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm max-w-[100px] shrink-0">
                                                        <span className="text-[10px] font-bold text-gray-700 truncate w-full" title={reading.gatewayId}>
                                                            {reading.gatewayId}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="mt-8 w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                >
                    Schließen
                </button>
            </div>
        </div>
    );
};

export default CatchDetailsModal;
