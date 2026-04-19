import { useState } from "react";
import type { Transaction, Invoice } from "../types/transaction";
import { formatPaise } from "../lib/format";
import { callClaude, parseClaudeResponse } from "../services/claude";
import { stringify } from "../lib/bigint";

type ResultData =
  | { kind: "transaction"; data: Transaction }
  | { kind: "invoice"; data: Invoice };

interface ResultCardProps {
  result: ResultData;
  raw?: string;
  isFirst?: boolean;
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

export function ResultCard({ result, raw, isFirst, onAddToLedger }: ResultCardProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [showBrain, setShowBrain] = useState(isFirst || false);

  const handleExplain = async () => {
    setLoadingExplain(true);
    try {
      const resp = await callClaude({
        mode: "explain",
        userMessage: `Explain this accounting entry in simple English for a small business owner (2-3 sentences max): ${stringify(result.data)}`,
      });
      let text = resp;
      try {
        const parsed = parseClaudeResponse<{ explanation: string }>(resp);
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

  const style = result.kind === "transaction" 
    ? (TYPE_STYLES[result.data.type] ?? TYPE_STYLES["expense"])
    : TYPE_STYLES["invoice"];

  const showInsight = result.kind === "transaction" && (!result.data.gstApplicable || result.data.confidence < 0.75);

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full font-body ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
          <button
            onClick={() => setShowBrain(!showBrain)}
            className={`p-1 rounded-md transition-colors ${showBrain ? "text-accent bg-accent/5" : "text-muted hover:bg-bg"}`}
            title="View AI Brain"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
        <span className="font-mono text-lg font-bold text-text">
          {formatPaise(result.kind === "transaction" ? result.data.amountPaise : result.data.totalAmountPaise)}
        </span>
      </div>

      {showBrain && raw && (
        <div className="mb-4 bg-primary text-[10px] p-3 rounded-lg overflow-x-auto font-mono text-white/80 border-l-2 border-accent">
          <p className="text-accent/60 mb-1 font-bold">RAW_CLAUDE_OUTPUT_PASE</p>
          <pre>{raw}</pre>
        </div>
      )}

      {result.kind === "transaction" ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-body mb-3">
          <div>
            <span className="text-[10px] text-muted uppercase">Category</span>
            <p className="text-text capitalize leading-tight">{result.data.category}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase">Party</span>
            <p className="text-text leading-tight">{result.data.party}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase">Date</span>
            <p className="text-text leading-tight">{result.data.date}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase">Mode</span>
            <p className="text-text capitalize leading-tight">{result.data.paymentMode}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1 mb-3 font-body text-sm">
          <p className="text-text"><span className="text-muted">Client:</span> {result.data.clientName}</p>
          <p className="text-muted text-xs">
            {result.data.items.length} item{result.data.items.length !== 1 ? "s" : ""} · {result.data.date}
          </p>
        </div>
      )}

      {result.kind === "transaction" && result.data.description && (
        <p className="text-xs text-muted font-body mb-3 italic leading-relaxed">
          "{result.data.description}"
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {result.kind === "transaction" && result.data.gstApplicable && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold bg-invoice/5 text-invoice px-2 py-1 rounded-md border border-invoice/10">
            <span className="w-1.5 h-1.5 bg-invoice rounded-full animate-pulse" />
            SMART GST ({result.data.gstRatePct}%) = {formatPaise(result.data.gstAmountPaise)}
          </span>
        )}
        {result.kind === "invoice" && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold bg-invoice/5 text-invoice px-2 py-1 rounded-md border border-invoice/10">
            <span className="w-1.5 h-1.5 bg-invoice rounded-full animate-pulse" />
            GST COMPLIANT ({result.data.gstRatePct}%)
          </span>
        )}
        {showInsight && result.kind === "transaction" && (
          <div className="w-full mt-1 p-2 bg-accent/5 border border-accent/10 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent mb-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AI ACCOUNTANT INSIGHT
            </div>
            <p className="text-[11px] text-text font-body leading-relaxed">
              {!result.data.gstApplicable 
                ? "No GST applied as this entry is typically exempt or personal." 
                : "Confidence is low. Please verify party and amount before saving."}
            </p>
          </div>
        )}
      </div>

      {explanation && (
        <div className="mb-4 p-3 bg-primary/5 rounded-lg text-xs text-primary font-body border border-primary/10 italic">
          {explanation}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onAddToLedger}
          className="flex-1 bg-accent text-white text-sm font-body font-bold py-2.5 rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-accent/20"
        >
          Add to Ledger
        </button>
        <button
          onClick={handleExplain}
          disabled={loadingExplain}
          className="text-xs font-bold font-body text-muted hover:text-accent transition-colors disabled:opacity-50 px-3 border border-border rounded-xl"
        >
          {loadingExplain ? "Analyzing..." : "Explain"}
        </button>
      </div>
    </div>
  );
}
