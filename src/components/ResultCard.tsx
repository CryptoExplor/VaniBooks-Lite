import { useState } from "react";
import type { Transaction, Invoice } from "../types/transaction";
import { formatPaise } from "../lib/format";
import { callClaude, parseClaudeResponse } from "../services/claude";

type ResultData =
  | { kind: "transaction"; data: Transaction }
  | { kind: "invoice"; data: Invoice };

interface ResultCardProps {
  result: ResultData;
  onAddToLedger: () => void;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> =
  {
    income: { bg: "bg-income/10", text: "text-income", label: "Income" },
    expense: { bg: "bg-expense/10", text: "text-expense", label: "Expense" },
    invoice: { bg: "bg-invoice/10", text: "text-invoice", label: "Invoice" },
    payment: { bg: "bg-income/10", text: "text-income", label: "Payment" },
    receipt: { bg: "bg-income/10", text: "text-income", label: "Receipt" },
  };

export function ResultCard({ result, onAddToLedger }: ResultCardProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const handleExplain = async () => {
    setLoadingExplain(true);
    try {
      const raw = await callClaude({
        mode: "expense",
        userMessage: `Explain this accounting entry in simple English for a small business owner (2-3 sentences max): ${JSON.stringify(result.data)}`,
      });
      // The explanation prompt may return plain text or JSON — handle both
      let text = raw;
      try {
        const parsed = parseClaudeResponse<{ explanation: string }>(raw);
        if (parsed.explanation) text = parsed.explanation;
      } catch {
        // plain text is fine
      }
      setExplanation(text);
    } catch {
      setExplanation("Could not fetch explanation. Please try again.");
    } finally {
      setLoadingExplain(false);
    }
  };

  if (result.kind === "invoice") {
    const inv = result.data;
    const style = TYPE_STYLES["invoice"];
    return (
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full font-body ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
          <span className="font-mono text-lg font-bold text-text">
            {formatPaise(inv.totalAmountPaise)}
          </span>
        </div>
        <p className="text-sm font-body text-text mb-1">
          <span className="text-muted">Client:</span> {inv.clientName}
        </p>
        <p className="text-sm font-body text-muted mb-1">
          {inv.items.length} item{inv.items.length !== 1 ? "s" : ""} ·{" "}
          {inv.date}
        </p>
        <p className="text-xs text-muted font-body mb-3">
          GST {inv.gstRatePct}% = {formatPaise(inv.gstAmountPaise)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onAddToLedger}
            className="flex-1 bg-accent text-white text-sm font-body font-medium py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Add to Ledger
          </button>
        </div>
      </div>
    );
  }

  const tx = result.data;
  const style = TYPE_STYLES[tx.type] ?? TYPE_STYLES["expense"];

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full font-body ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
        <span className="font-mono text-lg font-bold text-text">
          {formatPaise(tx.amountPaise)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-body mb-3">
        <div>
          <span className="text-muted">Category</span>
          <p className="text-text capitalize">{tx.category}</p>
        </div>
        <div>
          <span className="text-muted">Party</span>
          <p className="text-text">{tx.party}</p>
        </div>
        <div>
          <span className="text-muted">Date</span>
          <p className="text-text">{tx.date}</p>
        </div>
        <div>
          <span className="text-muted">Mode</span>
          <p className="text-text capitalize">{tx.paymentMode}</p>
        </div>
      </div>

      {tx.description && (
        <p className="text-xs text-muted font-body mb-2 italic">
          {tx.description}
        </p>
      )}

      {tx.gstApplicable && (
        <span className="inline-block text-xs bg-invoice/10 text-invoice px-2 py-0.5 rounded-full font-body mb-3">
          GST {tx.gstRatePct}% = {formatPaise(tx.gstAmountPaise)}
        </span>
      )}

      {/* Confidence meter — only show if below 0.85 */}
      {tx.confidence < 0.85 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted font-body mb-1">
            <span>Confidence</span>
            <span>{Math.round(tx.confidence * 100)}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                tx.confidence < 0.5 ? "bg-expense" : "bg-income"
              }`}
              style={{ width: `${tx.confidence * 100}%` }}
            />
          </div>
        </div>
      )}

      {explanation && (
        <div className="mb-3 p-3 bg-bg rounded-lg text-xs text-text font-body border border-border">
          {explanation}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onAddToLedger}
          className="flex-1 bg-accent text-white text-sm font-body font-medium py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Add to Ledger
        </button>
        <button
          onClick={handleExplain}
          disabled={loadingExplain}
          className="text-sm font-body text-muted hover:text-accent transition-colors disabled:opacity-50 px-2"
        >
          {loadingExplain ? "..." : "Explain this"}
        </button>
      </div>
    </div>
  );
}
