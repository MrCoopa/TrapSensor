import React from 'react';

const SignalIndicator = ({ rssi, snr, type = 'NB-IOT', className = "", barWidth = "w-0.5", barHeight = "h-3" }) => {

    const getBars = (r, s, t) => {
        if (!r || r === 0) return 0;

        if (t === 'LORAWAN') {
            // Combined Logic for LoRaWAN
            // 4 Bars: Excellent (Strong signal AND high quality)
            if (r >= -80 && (s === undefined || s >= 5)) return 4;

            // 3 Bars: Good (Acceptable signal AND quality)
            if (r >= -100 && (s === undefined || s >= 0)) return 3;

            // 2 Bars: Weak (Signal or Quality is low)
            if (r >= -115 && (s === undefined || s >= -13)) return 2;

            // 1 Bar: Critical (Still connected but borderline)
            if (r >= -125 && (s === undefined || s >= -20)) return 1;

            return 0; // Out of range
        } else {
            // NB-IoT ranges (absolute values logic)
            const absR = Math.abs(r);
            if (absR <= 75) return 4;
            if (absR <= 90) return 3;
            if (absR <= 100) return 2;
            if (absR <= 110) return 1;
            return 0;
        }
    };

    const getColorClass = (b, r, s, t) => {
        if (b === 0 || !r) return 'bg-gray-200';

        if (t === 'LORAWAN') {
            if (b === 4) return 'bg-green-600';
            if (b === 3) return 'bg-lime-500';
            if (b === 2) return 'bg-yellow-500';
            if (b === 1) return 'bg-orange-500';
            return 'bg-red-500';
        } else {
            const absR = Math.abs(r);
            if (absR <= 75) return 'bg-green-600';
            if (absR <= 90) return 'bg-lime-500';
            if (absR <= 105) return 'bg-yellow-500';
            return 'bg-red-500';
        }
    };

    const bars = getBars(rssi, snr, type);
    const colorClass = getColorClass(bars, rssi, snr, type);

    const tooltipText = type === 'LORAWAN'
        ? `Signal: ${rssi || 'N/A'} dBm, Qualität (SNR): ${snr != null ? Number(snr).toFixed(1) : 'N/A'} dB`
        : `Signalstärke: ${rssi || 'N/A'} dBm`;

    return (
        <div
            className={`flex items-end space-x-0.5 ${barHeight} ${className}`}
            title={tooltipText}
        >
            {[1, 2, 3, 4].map((bar) => (
                <div
                    key={bar}
                    className={`${barWidth} rounded-t-sm transition-all duration-500 ${bar <= bars ? colorClass : 'bg-gray-200'}`}
                    style={{ height: `${bar * 25}%` }}
                />
            ))}
        </div>
    );
};

export default SignalIndicator;
