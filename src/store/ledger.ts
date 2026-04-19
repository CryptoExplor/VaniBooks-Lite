import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Transaction, Invoice } from "../types/transaction";
import { replacer, reviver } from "../lib/bigint";

interface LedgerState {
  transactions: Transaction[];
  invoices: Invoice[];
  addTransaction: (t: Transaction) => void;
  addInvoice: (i: Invoice) => void;
  clearAll: () => void;
}



export const useLedger = create<LedgerState>()(
  persist(
    (set) => ({
      transactions: [],
      invoices: [],
      addTransaction: (t) =>
        set((s) => ({ transactions: [t, ...s.transactions] })),
      addInvoice: (i) => set((s) => ({ invoices: [i, ...s.invoices] })),
      clearAll: () => set({ transactions: [], invoices: [] }),
    }),
    {
      name: "vanibooks-ledger-v1",
      storage: {
        getItem: (name: string) => {
          const raw = localStorage.getItem(name);
          if (!raw) return null;
          return JSON.parse(raw, reviver);
        },
        setItem: (name: string, value: unknown) => {
          localStorage.setItem(name, JSON.stringify(value, replacer));
        },
        removeItem: (name: string) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
