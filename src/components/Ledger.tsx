import { useState } from "react";
import { useLedger } from "../store/ledger";
import { formatPaise, formatDate } from "../lib/format";

const PAGE_SIZE = 20;

export function Ledger() {
  const { transactions, clearAll } = useLedger();
  const [page, setPage] = useState(0);

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Description",
      "Party",
      "Amount (₹)",
      "GST",
      "Category",
      "Mode",
    ];
    const rows = sorted.map((t) => [
      t.date,
      t.type,
      `"${t.description}"`,
      `"${t.party}"`,
      (Number(t.amountPaise) / 100).toFixed(2),
      t.gstApplicable ? `${t.gstRatePct}%` : "N/A",
      t.category,
      t.paymentMode,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vanibooks-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted font-body text-sm">
        No transactions yet. Start by typing an expense or income above.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-text text-base">
          Ledger
          <span className="ml-2 text-xs text-muted font-body font-normal">
            ({transactions.length} entries)
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="text-xs font-body text-muted hover:text-accent transition-colors border border-border rounded-lg px-3 py-1.5"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              if (confirm("Clear all transactions? This cannot be undone.")) {
                clearAll();
              }
            }}
            className="text-xs font-body text-muted hover:text-expense transition-colors border border-border rounded-lg px-3 py-1.5"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="bg-bg border-b border-border">
              <th className="text-left px-3 py-2.5 text-muted font-medium text-xs">
                Date
              </th>
              <th className="text-left px-3 py-2.5 text-muted font-medium text-xs">
                Type
              </th>
              <th className="text-left px-3 py-2.5 text-muted font-medium text-xs">
                Description
              </th>
              <th className="text-left px-3 py-2.5 text-muted font-medium text-xs">
                Party
              </th>
              <th className="text-right px-3 py-2.5 text-muted font-medium text-xs">
                Amount
              </th>
              <th className="text-center px-3 py-2.5 text-muted font-medium text-xs">
                GST
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((tx) => {
              const isIncome = ["income", "receipt", "payment"].includes(
                tx.type
              );
              return (
                <tr
                  key={tx.id}
                  className={`border-b border-border last:border-0 ${
                    isIncome ? "bg-income/5" : "bg-expense/5"
                  }`}
                >
                  <td className="px-3 py-2.5 text-muted text-xs whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${
                        isIncome
                          ? "bg-income/10 text-income"
                          : "bg-expense/10 text-expense"
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text max-w-[160px] truncate">
                    {tx.description || tx.category}
                  </td>
                  <td className="px-3 py-2.5 text-muted text-xs">
                    {tx.party}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium text-text whitespace-nowrap">
                    {formatPaise(tx.amountPaise)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted">
                    {tx.gstApplicable ? `${tx.gstRatePct}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs font-body text-muted hover:text-accent disabled:opacity-40 px-2 py-1 border border-border rounded"
          >
            ← Prev
          </button>
          <span className="text-xs text-muted font-body">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="text-xs font-body text-muted hover:text-accent disabled:opacity-40 px-2 py-1 border border-border rounded"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
