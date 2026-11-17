'use client';

import React, { useState } from 'react';

export interface PerformanceCounts {
  BLUE: number;
  GREEN: number;
  YELLOW: number;
  RED: number;
}

interface PerformancePieChartProps {
  counts: PerformanceCounts;
  size?: number;
  className?: string;
  showLegend?: boolean;
  showDetails?: boolean;
}

export default function PerformancePieChart({
  counts,
  size = 54,
  className = '',
  showLegend = true,
  showDetails = false,
}: PerformancePieChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const total = (counts.BLUE || 0) + (counts.GREEN || 0) + (counts.YELLOW || 0) + (counts.RED || 0);

  const categories = [
    { key: 'BLUE', label: 'Excellent', count: counts.BLUE || 0, color: 'var(--blue-600)', bgLight: 'bg-blue-50', textCol: 'text-blue-600', dotCol: 'bg-blue-600' },
    { key: 'GREEN', label: 'Good', count: counts.GREEN || 0, color: 'var(--status-success)', bgLight: 'bg-status-success-bg', textCol: 'text-status-success-text', dotCol: 'bg-status-success' },
    { key: 'YELLOW', label: 'Average', count: counts.YELLOW || 0, color: 'var(--status-warning)', bgLight: 'bg-status-warning-bg', textCol: 'text-status-warning-text', dotCol: 'bg-status-warning' },
    { key: 'RED', label: 'Needs Impr.', count: counts.RED || 0, color: 'var(--status-danger)', bgLight: 'bg-status-danger-bg', textCol: 'text-status-danger-text', dotCol: 'bg-status-danger' },
  ];

  // SVG Donut geometry
  const radius = 16.5;
  const strokeWidth = 5.5;
  const circumference = 2 * Math.PI * radius; // ~103.67

  let accumulatedPercent = 0;
  const segments = categories.map((cat) => {
    const percent = total > 0 ? (cat.count / total) : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -(accumulatedPercent * circumference);
    accumulatedPercent += percent;

    return {
      ...cat,
      percent,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className={`flex items-center gap-3 justify-center ${className}`}>
      {/* Donut SVG Pie Chart */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 44 44"
          className="w-full h-full transform -rotate-90 filter drop-shadow-2xs"
        >
          {/* Subtle background track circle */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="transparent"
            stroke="var(--blue-50)"
            strokeWidth={strokeWidth}
          />
          {total === 0 ? (
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="transparent"
              stroke="var(--blue-100)"
              strokeWidth={strokeWidth}
              strokeDasharray="4 3"
            />
          ) : (
            segments.map((seg) => {
              if (seg.count === 0) return null;
              const isHovered = hoveredKey === seg.key;
              return (
                <circle
                  key={seg.key}
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 1.5 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })
          )}
        </svg>

        {/* Center Stat inside Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-black text-navy-900 leading-none font-mono">
            {hoveredKey
              ? (counts[hoveredKey as keyof PerformanceCounts] || 0)
              : total}
          </span>
          <span className="text-[7px] font-bold text-text-muted uppercase tracking-tight leading-none mt-0.5">
            {hoveredKey ? hoveredKey.slice(0, 1) : 'Total'}
          </span>
        </div>
      </div>

      {/* 2x2 Mini Colored Legend with Numbers */}
      {showLegend && (
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-left">
          {categories.map((cat) => {
            const isHovered = hoveredKey === cat.key;
            return (
              <div
                key={cat.key}
                onMouseEnter={() => setHoveredKey(cat.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md cursor-pointer transition-all ${
                  isHovered ? `${cat.bgLight} scale-105 shadow-2xs` : 'hover:bg-blue-50'
                }`}
                title={`${cat.label}: ${cat.count} (${total > 0 ? Math.round((cat.count / total) * 100) : 0}%)`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 shadow-2xs ${cat.dotCol}`}
                />
                <span className={`text-[10px] font-extrabold font-mono ${cat.textCol}`}>
                  {cat.count}
                </span>
                <span className="text-[9px] font-semibold text-text-muted truncate">
                  {cat.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
