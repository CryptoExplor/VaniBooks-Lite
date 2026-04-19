import { useEffect, useRef, useState } from "react";
import type { FinancialSummary } from "../types/transaction";
import { formatPaise } from "../lib/format";

interface SummaryPanelProps {
  summary: FinancialSummary;
}

function useCountUp(target: bigint, duration = 800): bigint {
  const [current, setCurrent] = useState(0n);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const targetNum = Number(target / 100n) * 100;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      if (progress >= 1) {
        setCurrent(target);
      } else {
        setCurrent(BigInt(Math.round(targetNum * eased)));
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return current;
}

interface StatCardProps {
  label: string;
  value: bigint;
  color: "income" | "expense" | "profit" | "loss";
}

function StatCard({ label, value, color }: StatCardProps) {
  const animated = useCountUp(value < 0n ? -value : value);

  const colorMap = {
    income: "text-income",
    expense: "text-expense",
    profit: "text-income",
    loss: "text-expense",
  };

  const bgMap = {
    income: "bg-income/10 border-income/20",
    expense: "bg-expense/10 border-expense/20",
    profit: "bg-income/10 border-income/20",
    loss: "bg-expense/10 border-expense/20",
  };

  return (
    <div className={`rounded-xl border p-4 ${bgMap[color]}`}>
      <p className="text-xs font-body text-muted mb-1">{label}</p>
      <p className={`font-mono text-xl font-bold ${colorMap[color]}`}>
        {value < 0n ? "-" : ""}
        {formatPaise(animated)}
      </p>
    </div>
  );
}

export function SummaryPanel({ summary }: SummaryPanelProps) {
  const isProfit = summary.profitPaise >= 0n;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">📊</span>
        <h2 className="font-display font-semibold text-text text-sm">
          Financial Summary
        </h2>
        {summary.period && (
          <span className="ml-auto text-xs text-muted font-body">
            {summary.period}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard
          label="Revenue"
          value={summary.revenuePaise}
          color="income"
        />
        <StatCard
          label="Expenses"
          value={summary.expensesPaise}
          color="expense"
        />
        <StatCard
          label={isProfit ? "Profit" : "Loss"}
          value={
            isProfit ? summary.profitPaise : -summary.profitPaise
          }
          color={isProfit ? "profit" : "loss"}
        />
      </div>

      {summary.summary && (
        <p className="text-sm font-body text-text bg-bg rounded-lg p-3 border border-border">
          {summary.summary}
        </p>
      )}
    </div>
  );
}
