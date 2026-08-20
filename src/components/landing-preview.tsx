"use client";

import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AXIS, DOWN, UP } from "./charts/chart-kit";

/** Static mock data — the landing page shows the shape of the product, not real trades. */
const EQUITY = Array.from({ length: 60 }, (_, i) => {
  const drift = i * 320;
  const wave = Math.sin(i / 5) * 1100 + Math.cos(i / 3.2) * 620;
  return { i, value: Math.round(drift + wave) };
});

const DAILY = [
  820, -430, 1240, 360, -910, 1580, 240, -260, 690, 1420, -1180, 540, 980, -320, 1760, 430,
].map((netPnl, i) => ({ day: `D${i + 1}`, netPnl }));

const SETUPS = [
  { label: "Silver Bullet", value: 8420 },
  { label: "Liquidity Sweep", value: 5210 },
  { label: "FVG Entry", value: 3180 },
  { label: "London Open", value: 1240 },
  { label: "Breaker Block", value: -1860 },
];

const CALENDAR = [
  0, 640, -220, 1180, 320, 0, 0, 890, -410, 0, 1520, 260, 0, 0, -730, 1040, 380, -190, 2100, 0, 0,
  450, 1260, -540, 720, 1830, 0, 0,
];

export function LandingPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card overflow-hidden lg:col-span-2">
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <p className="text-xs text-ink-faint">Cumulative P&amp;L</p>
            <p className="num mt-0.5 text-2xl font-semibold text-up">+$18,420.55</p>
          </div>
          <div className="hidden gap-1 sm:flex">
            {["1M", "3M", "YTD", "All"].map((label, index) => (
              <span
                key={label}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  index === 2 ? "bg-accent/15 text-accent" : "text-ink-faint"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[248px] px-2 pb-3 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={EQUITY} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="previewFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={UP} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={UP} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="i" hide />
              <YAxis hide domain={["dataMin - 500", "dataMax + 500"]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={UP}
                strokeWidth={2}
                fill="url(#previewFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 pt-4">
          <p className="text-xs text-ink-faint">P&amp;L calendar</p>
          <p className="mt-0.5 text-sm font-medium">February</p>
        </div>
        <div className="grid grid-cols-7 gap-1 p-4">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <span key={i} className="pb-1 text-center text-[10px] text-ink-faint">
              {day}
            </span>
          ))}
          {CALENDAR.map((value, index) => (
            <div
              key={index}
              className="flex aspect-square items-center justify-center rounded-md border text-[9px] font-medium"
              style={{
                borderColor: value === 0 ? "#f1eae0" : value > 0 ? "rgba(21,127,82,0.28)" : "rgba(192,51,74,0.28)",
                backgroundColor:
                  value === 0
                    ? "transparent"
                    : value > 0
                      ? `rgba(21,127,82,${Math.min(0.28, Math.abs(value) / 8000 + 0.07)})`
                      : `rgba(192,51,74,${Math.min(0.28, Math.abs(value) / 8000 + 0.07)})`,
                color: value === 0 ? "#8b7a67" : value > 0 ? UP : DOWN,
              }}
            >
              {value === 0 ? "" : value > 0 ? `+${(value / 1000).toFixed(1)}k` : `${(value / 1000).toFixed(1)}k`}
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs text-ink-faint">Daily P&amp;L</p>
        </div>
        <div className="h-[180px] px-2 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DAILY} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" hide />
              <YAxis hide />
              <Bar dataKey="netPnl" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {DAILY.map((row) => (
                  <Cell key={row.day} fill={row.netPnl >= 0 ? UP : DOWN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs text-ink-faint">Net P&amp;L by setup</p>
        </div>
        <div className="h-[180px] px-2 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SETUPS} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...AXIS} width={110} interval={0} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={14} isAnimationActive={false}>
                {SETUPS.map((row) => (
                  <Cell key={row.label} fill={row.value >= 0 ? UP : DOWN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
