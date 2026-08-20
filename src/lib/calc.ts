/** Derives P&L, risk and R-multiple from raw trade inputs. */

export type CalcInput = {
  direction: "LONG" | "SHORT" | string;
  positionSize: number;
  entryPrice: number;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  fees?: number | null;
  pointValue?: number | null;
  /** Overrides the derived gross P&L when the user enters it manually. */
  manualGrossPnl?: number | null;
};

export type CalcResult = {
  grossPnl: number;
  fees: number;
  netPnl: number;
  riskAmount: number | null;
  rewardAmount: number | null;
  plannedRr: number | null;
  rMultiple: number | null;
  pnlPercent: number | null;
  result: "WIN" | "LOSS" | "BREAKEVEN";
};

const sign = (direction: string) => (direction === "SHORT" ? -1 : 1);

export function calculateTrade(input: CalcInput): CalcResult {
  const multiplier = input.pointValue && input.pointValue > 0 ? input.pointValue : 1;
  const size = input.positionSize || 0;
  const fees = input.fees ?? 0;
  const dir = sign(input.direction);

  const priceMove =
    input.exitPrice !== null && input.exitPrice !== undefined
      ? (input.exitPrice - input.entryPrice) * dir
      : null;

  const grossPnl =
    input.manualGrossPnl !== null && input.manualGrossPnl !== undefined
      ? input.manualGrossPnl
      : priceMove !== null
        ? priceMove * size * multiplier
        : 0;

  const netPnl = round2(grossPnl - fees);

  const riskPerUnit =
    input.stopLoss !== null && input.stopLoss !== undefined
      ? (input.entryPrice - input.stopLoss) * dir
      : null;
  const riskAmount =
    riskPerUnit !== null && riskPerUnit > 0 ? round2(riskPerUnit * size * multiplier) : null;

  const rewardPerUnit =
    input.takeProfit !== null && input.takeProfit !== undefined
      ? (input.takeProfit - input.entryPrice) * dir
      : null;
  const rewardAmount =
    rewardPerUnit !== null && rewardPerUnit > 0 ? round2(rewardPerUnit * size * multiplier) : null;

  const plannedRr =
    riskAmount && rewardAmount ? round4(rewardAmount / riskAmount) : null;

  const rMultiple = riskAmount && riskAmount > 0 ? round4(netPnl / riskAmount) : null;

  const notional = Math.abs(input.entryPrice * size * multiplier);
  const pnlPercent = notional > 0 ? round4((netPnl / notional) * 100) : null;

  return {
    grossPnl: round2(grossPnl),
    fees: round2(fees),
    netPnl,
    riskAmount,
    rewardAmount,
    plannedRr,
    rMultiple,
    pnlPercent,
    result: classify(netPnl),
  };
}

export function classify(netPnl: number): "WIN" | "LOSS" | "BREAKEVEN" {
  if (netPnl > 0.0001) return "WIN";
  if (netPnl < -0.0001) return "LOSS";
  return "BREAKEVEN";
}

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000;
