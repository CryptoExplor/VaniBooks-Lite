import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { InputBar } from "../components/InputBar";
import { ResultCard } from "../components/ResultCard";
import { Ledger } from "../components/Ledger";
import { InvoicePreview } from "../components/InvoicePreview";
import { SummaryPanel } from "../components/SummaryPanel";
import { callClaude, parseClaudeResponse } from "../services/claude";
import { detectIntent } from "../services/parser";
import { rupeesToPaise, calculateGst } from "../services/gst";
import { useLedger } from "../store/ledger";
import { logger } from "../lib/logger";
import type { Transaction, Invoice, FinancialSummary } from "../types/transaction";
import type {
  RawExpenseOutput,
  RawInvoiceOutput,
  RawAnalysisOutput,
} from "../types/ai";
import {
  isValidExpenseOutput,
  isValidInvoiceOutput,
  isValidAnalysisOutput,
} from "../lib/validate";

type FeedItem =
  | { id: string; kind: "transaction"; data: Transaction; added: boolean }
  | { id: string; kind: "invoice"; data: Invoice; added: boolean }
  | { id: string; kind: "summary"; data: FinancialSummary }
  | { id: string; kind: "error"; message: string };

export function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "ledger">("chat");

  const { transactions, invoices, addTransaction, addInvoice } = useLedger();

  const handleSubmit = async (input: string) => {
    setInputError(null);
    setIsLoading(true);

    const mode = detectIntent(input);
    logger.info("Intent detected", { data: { mode, input: input.slice(0, 50) } });

    try {
      let raw: string;

      if (mode === "analysis") {
        // Pass existing transactions as context
        const txEntries = transactions.map((t) => ({
          type: t.type,
          amount: Number(t.amountPaise) / 100,
          category: t.category,
          date: t.date,
          party: t.party,
        }));
        const invoiceEntries = invoices.map(inv => ({
          type: "income",
          amount: Number(inv.totalAmountPaise) / 100,
          category: "sales",
          date: inv.date,
          party: inv.clientName,
        }));
        const contextData = [...txEntries, ...invoiceEntries];
        raw = await callClaude({ mode, userMessage: input, contextData });
      } else {
        raw = await callClaude({ mode, userMessage: input });
      }

      if (mode === "analysis") {
        const parsed = parseClaudeResponse<RawAnalysisOutput>(raw);
        if (!isValidAnalysisOutput(parsed)) {
          throw new Error("VALIDATION_ERROR: Analysis response missing required fields");
        }
        const summary: FinancialSummary = {
          revenuePaise: rupeesToPaise(parsed.revenue),
          expensesPaise: rupeesToPaise(parsed.expenses),
          profitPaise: rupeesToPaise(parsed.profit),
          summary: parsed.summary,
          period: parsed.period,
        };
        setFeed((f) => [{ id: uuidv4(), kind: "summary", data: summary }, ...f]);

      } else if (mode === "invoice") {
        const parsed = parseClaudeResponse<RawInvoiceOutput>(raw);
        if (!isValidInvoiceOutput(parsed)) {
          throw new Error("VALIDATION_ERROR: Invoice response missing required fields");
        }
        const subtotalPaise = rupeesToPaise(parsed.subtotal);
        const gstAmountPaise = calculateGst(subtotalPaise, parsed.gst_rate);
        const invoice: Invoice = {
          id: uuidv4(),
          clientName: parsed.client_name,
          items: parsed.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            pricePaise: rupeesToPaise(item.price),
            totalPaise: rupeesToPaise(item.total),
          })),
          subtotalPaise,
          gstRatePct: parsed.gst_rate,
          gstAmountPaise,
          totalAmountPaise: subtotalPaise + gstAmountPaise,
          currency: "INR",
          date: parsed.date,
          rawInput: input,
          createdAt: new Date().toISOString(),
        };
        setFeed((f) => [{ id: uuidv4(), kind: "invoice", data: invoice, added: false }, ...f]);

      } else {
        // expense / income / payment / receipt
        const parsed = parseClaudeResponse<RawExpenseOutput>(raw);
        if (!isValidExpenseOutput(parsed)) {
          throw new Error("VALIDATION_ERROR: Expense response missing required fields");
        }
        const amountPaise = rupeesToPaise(parsed.amount);
        const gstAmountPaise = parsed.gst_applicable
          ? calculateGst(amountPaise, parsed.gst_rate)
          : 0n;

        const transaction: Transaction = {
          id: uuidv4(),
          type: parsed.type,
          amountPaise,
          currency: "INR",
          category: parsed.category,
          paymentMode: parsed.payment_mode,
          party: parsed.party,
          description: parsed.description,
          date: parsed.date,
          gstApplicable: parsed.gst_applicable,
          gstRatePct: parsed.gst_rate,
          gstAmountPaise,
          confidence: parsed.confidence,
          rawInput: input,
          createdAt: new Date().toISOString(),
        };
        setFeed((f) => [
          { id: uuidv4(), kind: "transaction", data: transaction, added: false },
          ...f,
        ]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      logger.error("Processing error", { code: "PROCESSING_ERROR", data: { message } });

      // User-friendly error messages
      let userMessage = "Something went wrong. Please try again.";
      if (message.includes("CLAUDE_API_ERROR")) {
        userMessage = "Could not reach Claude API. Check your API key and connection.";
      } else if (message.includes("invalid JSON") || message.includes("CLAUDE_PARSE_ERROR")) {
        userMessage = "Claude returned an unexpected response. Please rephrase and try again.";
      } else if (message.includes("VALIDATION_ERROR")) {
        userMessage = "The response was incomplete. Please try again with more detail.";
      } else if (message.includes("VITE_ANTHROPIC_API_KEY")) {
        userMessage = "API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env file.";
      }

      setInputError(userMessage);
      setFeed((f) => [{ id: uuidv4(), kind: "error", message: userMessage }, ...f]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = (feedId: string, tx: Transaction) => {
    addTransaction(tx);
    setFeed((f) =>
      f.map((item) =>
        item.id === feedId && item.kind === "transaction"
          ? { ...item, added: true }
          : item
      )
    );
    setActiveTab("ledger");
  };

  const handleAddInvoice = (feedId: string, inv: Invoice) => {
    addInvoice(inv);
    setFeed((f) =>
      f.map((item) =>
        item.id === feedId && item.kind === "invoice"
          ? { ...item, added: true }
          : item
      )
    );
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-bg">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display font-bold text-lg leading-tight">
            VaniBooks <span className="text-accent">Lite</span>
          </h1>
          <p className="text-xs text-white/60 font-body">AI Accounting for Indian MSMEs</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`text-xs font-body px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "chat"
                ? "bg-accent text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`text-xs font-body px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "ledger"
                ? "bg-accent text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Ledger
            {transactions.length > 0 && (
              <span className="ml-1 bg-white/20 text-white text-xs px-1.5 rounded-full">
                {transactions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "chat" ? (
          <div className="p-4 space-y-3">
            {feed.length === 0 && (
              <div className="text-center py-16 px-6">
                <div className="text-5xl mb-4">🧾</div>
                <h2 className="font-display font-semibold text-text text-lg mb-2">
                  Start with any transaction
                </h2>
                <p className="text-muted font-body text-sm mb-6">
                  Type or speak in plain English or Hindi
                </p>
                <div className="space-y-2 text-left max-w-sm mx-auto">
                  {[
                    "Paid 5000 for office rent in cash",
                    "Create invoice for Ramesh for 10 shirts at 500 each",
                    "Received 25000 from client Priya via UPI",
                    "What's my profit this month?",
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => handleSubmit(example)}
                      disabled={isLoading}
                      className="w-full text-left text-sm font-body text-muted bg-surface border border-border rounded-lg px-3 py-2 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="bg-surface border border-border rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-6 w-20 bg-border rounded-full"></div>
                  <div className="h-6 w-24 bg-border rounded"></div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-4 bg-border rounded w-3/4"></div>
                  <div className="h-4 bg-border rounded w-1/2"></div>
                </div>
                <div className="h-10 bg-border rounded-lg mt-4"></div>
              </div>
            )}

            {feed.map((item) => {
              if (item.kind === "error") {
                return (
                  <div
                    key={item.id}
                    className="bg-expense/5 border border-expense/20 rounded-xl p-4 text-sm font-body text-expense"
                  >
                    ⚠️ {item.message}
                  </div>
                );
              }

              if (item.kind === "summary") {
                return <SummaryPanel key={item.id} summary={item.data} />;
              }

              if (item.kind === "invoice") {
                return (
                  <div key={item.id}>
                    <InvoicePreview
                      invoice={item.data}
                      invoiceNumber={invoices.length + 1}
                    />
                    {!item.added && (
                      <button
                        onClick={() => handleAddInvoice(item.id, item.data)}
                        className="w-full mt-2 bg-accent text-white text-sm font-body font-medium py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Save Invoice to Ledger
                      </button>
                    )}
                    {item.added && (
                      <p className="text-center text-xs text-income font-body mt-2">
                        ✓ Saved to ledger
                      </p>
                    )}
                  </div>
                );
              }

              if (item.kind === "transaction") {
                return (
                  <div key={item.id}>
                    {item.added ? (
                      <div className="bg-income/5 border border-income/20 rounded-xl p-3 text-sm font-body text-income text-center">
                        ✓ Added to ledger
                      </div>
                    ) : (
                      <ResultCard
                        result={{ kind: "transaction", data: item.data }}
                        onAddToLedger={() =>
                          handleAddTransaction(item.id, item.data)
                        }
                      />
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        ) : (
          <div className="p-4">
            <Ledger />
          </div>
        )}
      </main>

      {/* Sticky input bar */}
      <div className="flex-shrink-0">
        <InputBar
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={inputError}
        />
      </div>
    </div>
  );
}
