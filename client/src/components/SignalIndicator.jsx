import React from 'react';

const SignalIndicator = ({ rsrp, rsrq, sinr, snr, type = 'NB-IOT', className = "", barWidth = "w-0.5", barHeight = "h-3" }) => {

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
            // NB-IoT combined logic based on RSRP, RSRQ, and SINR
            const rVal = Number(r);
            const qVal = rsrq != null ? Number(rsrq) : null;
            const sVal = sinr != null ? Number(sinr) : null;

            const getGrade = (val, thresholds) => {
                if (val == null) return 4; // Ignore if missing
                if (val >= thresholds[0]) return 4;
                if (val >= thresholds[1]) return 3;
                if (val >= thresholds[2]) return 2;
                return 1;
            };

            const gradeRSRP = getGrade(rVal, [-80, -90, -100]);
            const gradeRSRQ = getGrade(qVal, [-10, -15, -20]);
            const gradeSINR = getGrade(sVal, [20, 13, 0]);

            return Math.min(gradeRSRP, gradeRSRQ, gradeSINR);
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
            if (b === 4) return 'bg-green-600';
            if (b === 3) return 'bg-lime-500';
            if (b === 2) return 'bg-yellow-500';
            if (b === 1) return 'bg-red-500';
            return 'bg-gray-200';
        }
    };

    const bars = getBars(rsrp, snr, type);
    const colorClass = getColorClass(bars, rsrp, snr, type);

    const tooltipText = type === 'LORAWAN'
        ? `Signal: ${rsrp || 'N/A'} dBm, Qualität (SNR): ${snr != null ? Number(snr).toFixed(1) : 'N/A'} dB`
        : `Signal: ${rsrp || 'N/A'} dBm, RSRQ: ${rsrq != null ? rsrq + ' dB' : 'N/A'}, SINR: ${sinr != null ? sinr + ' dB' : 'N/A'}`;

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
