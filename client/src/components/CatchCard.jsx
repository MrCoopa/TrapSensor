import { Battery, Signal, Users, CheckCheck, RefreshCw } from 'lucide-react';
import BatteryIndicator from './BatteryIndicator';
import SignalIndicator from './SignalIndicator';
import API_BASE from '../apiConfig';

const formatTimeAgo = (date) => {
    if (!date) return 'Nie';
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - d) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Gerade eben';
    if (diffInMinutes < 60) return `Vor ${diffInMinutes} Min`;
    if (diffInHours < 24) return `Vor ${diffInHours} Std`;
    if (diffInDays === 1) return 'Gestern';
    if (diffInDays < 7) return `Vor ${diffInDays} Tagen`;
    
    return d.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
    });
};

const CatchCard = ({ catchSensor, onViewHistory, isShared, onAcknowledge, onResync }) => {
    const isLoRa = catchSensor.type === 'LORAWAN';
    const status = catchSensor.status;
    const voltage = catchSensor.batteryVoltage; // mV
    const lastUpdate = catchSensor.lastSeen;

    // Acknowledged = alarmAcknowledgedAt is set, AND either:
    // - lastCatchAlert was reset to null (we just acknowledged), OR
    // - the acknowledgment happened AFTER the last notification
    const isAcknowledged = !!catchSensor.alarmAcknowledgedAt && (
        !catchSensor.lastCatchAlert ||
        new Date(catchSensor.alarmAcknowledgedAt) >= new Date(catchSensor.lastCatchAlert)
    );

    const statusConfig = {
        active: {
            border: 'border-l-[6px] border-l-green-600',
            bg: 'bg-green-50/50',
            text: 'text-green-600',
            label: 'ONLINE',
            timeColor: 'text-gray-400'
        },
        inactive: {
            border: 'border-l-[6px] border-l-gray-400',
            bg: 'bg-gray-100/50',
            text: 'text-gray-500',
            label: 'OFFLINE',
            timeColor: 'text-gray-400'
        },
        triggered: {
            border: 'border-l-[6px] border-l-red-600',
            bg: 'bg-red-50/80',
            text: 'text-red-600',
            label: 'FANG GEMELDET!',
            timeColor: 'text-gray-400',
        },
    };

    const config = statusConfig[status] || statusConfig.active;

    const handleAcknowledge = async (e) => {
        e.stopPropagation(); // don't open history modal
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/api/catches/${catchSensor.id}/acknowledge`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (onAcknowledge) onAcknowledge(catchSensor.id);
        } catch (err) {
            console.error('Acknowledge failed:', err);
        }
    };

    const handleResync = async (e, action = 'confirm') => {
        e.stopPropagation();
        
        if (action === 'confirm' && !window.confirm('Haben Sie die Batterie gewechselt? Der Sicherheitszähler wird nun zurückgesetzt.')) return;
        if (action === 'reject' && !window.confirm('Wollen Sie diese Warnung ignorieren? Der alte Sicherheitszähler bleibt aktiv.')) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/catches/${catchSensor.id}/resync`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });
            if (res.ok && onResync) onResync(catchSensor.id, action);
        } catch (err) {
            console.error('Resync failed:', err);
        }
    };

    return (
        <div
            onClick={() => onViewHistory(catchSensor)}
            className={`relative cursor-pointer bg-white rounded-2xl shadow-sm p-5 border-y border-r border-gray-100 transition-all active:scale-[0.98] ${config.border} ${config.bg} ${config.animate || ''}`}
        >
            <div className="flex justify-between items-start mb-0.5">
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        {catchSensor.alias || catchSensor.name}
                        {isShared && (
                            <Users size={16} className="text-blue-500" />
                        )}
                    </h3>
                </div>
                <span className={`text-xs font-medium ${config.timeColor}`}>
                    {lastUpdate ? formatTimeAgo(lastUpdate) : 'Nie'}
                </span>
            </div>
            {catchSensor.location && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide my-2">
                    {catchSensor.location}
                </p>
            )}

            <div className={`text-sm font-black tracking-wider mb-3 ${config.text}`}>
                {config.label}
            </div>

            {/* ALARM QUITTIEREN button — only for triggered sensors */}
            {status === 'triggered' && (
                <button
                    onClick={handleAcknowledge}
                    className={`mb-3 flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${isAcknowledged
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-default'
                        : 'bg-red-600 text-white shadow-md shadow-red-200 active:bg-red-700'
                        }`}
                    disabled={isAcknowledged}
                >
                    <CheckCheck size={14} />
                    {isAcknowledged ? 'Quittiert – keine weiteren Meldungen' : 'Alarm quittieren'}
                </button>
            )}

            {/* BATTERY RESET buttons — Variant 1 Replay Protection */}
            {catchSensor.resyncRequired && (
                <div className="flex gap-2">
                    <button
                        onClick={handleResync}
                        className="mb-3 flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 bg-amber-500 text-white shadow-md shadow-amber-200 active:bg-amber-600"
                    >
                        <RefreshCw size={14} />
                        Batteriewechsel bestätigen
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleResync(e, 'reject');
                        }}
                        className="mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 bg-gray-200 text-gray-600 border border-gray-300 hover:bg-gray-300 active:bg-gray-400"
                    >
                        Ignorieren
                    </button>
                </div>
            )}

            {lastUpdate && (
                <div className="flex items-center space-x-8 text-gray-500">
                    <div className="flex items-center space-x-2">
                        <BatteryIndicator percentage={catchSensor.batteryPercent || 0} />
                        <div className="text-sm font-medium">
                            <p className="leading-none">{catchSensor.batteryPercent || 0}%</p>
                            <p className="text-[10px] text-gray-400 leading-none mt-0.5">{((voltage || 0) / 1000).toFixed(2).replace('.', ',')} V</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 text-gray-500">
                        <div className="flex items-center space-x-2">
                            <SignalIndicator rssi={isLoRa ? catchSensor.lorawanCatchSensor?.loraRssi : catchSensor.rssi} snr={isLoRa ? catchSensor.lorawanCatchSensor?.snr : undefined} type={catchSensor.type} barWidth="w-1" barHeight="h-4" className="mb-0.5" />
                            <div className="text-sm font-medium text-gray-500 leading-none mt-0.5">
                                {(isLoRa ? (catchSensor.lorawanCatchSensor?.loraRssi || 0) : (catchSensor.rssi || 0))} dBm
                            </div>
                        </div>
                        {isLoRa && catchSensor.lorawanCatchSensor && (
                            <div className="flex items-center gap-1.5 ml-1">
                                <span className="text-[9px] font-extrabold text-[#1b3a2e]/60 bg-white/50 px-1.5 py-0.5 rounded border border-[#1b3a2e]/10 shadow-sm uppercase leading-none">SNR {catchSensor.lorawanCatchSensor?.snr != null ? Number(catchSensor.lorawanCatchSensor.snr).toFixed(1) : 'N/A'}</span>
                                <span className="text-[9px] font-extrabold text-[#1b3a2e]/60 bg-white/50 px-1.5 py-0.5 rounded border border-[#1b3a2e]/10 shadow-sm uppercase leading-none">SF {catchSensor.lorawanCatchSensor.spreadingFactor}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CatchCard;
