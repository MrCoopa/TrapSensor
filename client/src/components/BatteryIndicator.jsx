import React from 'react';

const BatteryIndicator = ({ percentage, className = "" }) => {
    const fillLevel = Math.min(100, Math.max(0, percentage));

    // Modern colors and shadows based on percentage
    let gradientClass = 'from-emerald-500 to-green-400 shadow-[0_0_4px_rgba(16,185,129,0.2)]';
    if (fillLevel <= 20) {
        gradientClass = 'from-rose-500 to-red-400 shadow-[0_0_4px_rgba(244,63,94,0.3)]';
    } else if (fillLevel <= 50) {
        gradientClass = 'from-amber-500 to-yellow-400 shadow-[0_0_4px_rgba(245,158,11,0.2)]';
    }

    return (
        <div className={`flex items-center ${className}`}>
            <div className="relative w-6 h-3.5 border border-gray-400 rounded-md p-[2px] flex items-center bg-gray-50/50">
                <div
                    className={`h-full rounded-[2px] bg-gradient-to-r transition-all duration-500 ${gradientClass}`}
                    style={{ width: `${fillLevel}%` }}
                />
                {/* Battery terminal tip */}
                <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[1.5px] h-1.5 bg-gray-400 rounded-r-[1px]" />
            </div>
        </div>
    );
};

export default BatteryIndicator;
