export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
};

/** Fields a CSV column can be mapped onto during import. */
export const IMPORT_FIELDS: ImportField[] = [
  { key: "tradeDate", label: "Trade date", required: true, hint: "YYYY-MM-DD" },
  { key: "symbol", label: "Instrument", required: true },
  { key: "direction", label: "Direction", required: true, hint: "long / short / buy / sell" },
  { key: "positionSize", label: "Position size", required: true },
  { key: "entryPrice", label: "Entry price", required: true },
  { key: "exitPrice", label: "Exit price" },
  { key: "entryTime", label: "Entry time", hint: "HH:MM" },
  { key: "exitTime", label: "Exit time", hint: "HH:MM" },
  { key: "stopLoss", label: "Stop loss" },
  { key: "takeProfit", label: "Take profit" },
  { key: "fees", label: "Fees / commission" },
  { key: "netPnl", label: "Net P&L", hint: "Overrides the calculated value" },
  { key: "market", label: "Market" },
  { key: "setup", label: "Setup" },
  { key: "strategy", label: "Strategy" },
  { key: "session", label: "Session" },
  { key: "notes", label: "Notes" },
];
