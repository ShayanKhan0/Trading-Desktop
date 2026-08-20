export const MARKETS = ["FUTURES", "FOREX", "STOCKS", "CRYPTO", "INDICES", "COMMODITIES"] as const;
export const DIRECTIONS = ["LONG", "SHORT"] as const;
export const RESULTS = ["WIN", "LOSS", "BREAKEVEN"] as const;
export const IMAGE_PHASES = ["BEFORE", "ENTRY", "DURING", "EXIT", "HTF", "OTHER"] as const;

export const MARKET_CONDITIONS = [
  "Trending",
  "Ranging",
  "High Volatility",
  "Low Volatility",
  "News",
];

export const EMOTIONS = [
  "Calm",
  "Confident",
  "Focused",
  "Neutral",
  "Anxious",
  "Fearful",
  "Greedy",
  "Impatient",
  "Frustrated",
  "Euphoric",
  "Tired",
];

export const DEFAULT_MISTAKES = [
  "FOMO",
  "Revenge Trading",
  "Early Entry",
  "Late Entry",
  "Moved Stop Loss",
  "Overtrading",
  "Oversized Position",
  "Ignored Trading Plan",
  "Closed Too Early",
  "Held Too Long",
];

export const DEFAULT_SESSIONS = [
  { name: "Asia", startHour: 0, endHour: 7 },
  { name: "London", startHour: 7, endHour: 12 },
  { name: "New York", startHour: 12, endHour: 21 },
];

export const DEFAULT_SETUPS = [
  "ICT Silver Bullet",
  "Liquidity Sweep",
  "FVG Entry",
  "Breaker Block",
  "London Session Setup",
  "New York Open",
];

export const DEFAULT_TAGS = [
  { name: "A+ Setup", color: "emerald" },
  { name: "High Confidence", color: "sky" },
  { name: "News Day", color: "amber" },
  { name: "Clean Execution", color: "violet" },
  { name: "Counter Trend", color: "rose" },
  { name: "Scalping", color: "slate" },
  { name: "Swing", color: "slate" },
];

export const GOAL_METRICS = [
  { value: "NET_PNL", label: "Net P&L", unit: "currency" },
  { value: "WIN_RATE", label: "Win rate", unit: "percent" },
  { value: "TRADE_COUNT", label: "Number of trades", unit: "count" },
  { value: "MAX_LOSS", label: "Maximum loss", unit: "currency" },
  { value: "AVG_R", label: "Average R multiple", unit: "r" },
  { value: "TOTAL_R", label: "Total R", unit: "r" },
  { value: "DISCIPLINE", label: "Average discipline score", unit: "score" },
  { value: "JOURNAL_COMPLETION", label: "Journal completion", unit: "percent" },
] as const;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
