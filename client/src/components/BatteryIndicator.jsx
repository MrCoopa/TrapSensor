import React from 'react';

const BatteryIndicator = ({ percentage, className = "" }) => {
    const fillLevel = Math.min(100, Math.max(0, percentage));

    // Matching the exact app colors (bg-green-600, bg-yellow-500, bg-red-500)
    let colorClass = 'bg-green-600 shadow-[0_0_4px_rgba(22,163,74,0.2)]';
    if (fillLevel <= 20) {
        colorClass = 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.2)]';
    } else if (fillLevel <= 50) {
        colorClass = 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.2)]';
    }

    return (
        <div className={`flex items-center ${className}`}>
            <div className="relative w-6 h-3.5 border border-gray-400 rounded-md p-[2px] flex items-center bg-gray-50/50">
                <div
                    className={`h-full rounded-[2px] transition-all duration-500 ${colorClass}`}
                    style={{ width: `${fillLevel}%` }}
                />
                {/* Battery terminal tip */}
                <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[1.5px] h-1.5 bg-gray-400 rounded-r-[1px]" />
            </div>
        </div>
    );
};

export default BatteryIndicator;
