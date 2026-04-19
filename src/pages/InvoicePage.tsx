import { useParams, Link } from "react-router-dom";
import { useLedger } from "../store/ledger";
import { InvoicePreview } from "../components/InvoicePreview";

export function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { invoices } = useLedger();

  const invoice = invoices.find((inv) => inv.id === id);
  const invoiceIndex = invoices.findIndex((inv) => inv.id === id);

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-6">
        <p className="text-muted font-body text-sm mb-4">Invoice not found.</p>
        <Link
          to="/"
          className="text-accent font-body text-sm hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-4 max-w-2xl mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/"
          className="text-muted font-body text-sm hover:text-accent transition-colors"
        >
          ← Back
        </Link>
        <h1 className="font-display font-semibold text-text">Invoice Detail</h1>
      </div>
      <InvoicePreview
        invoice={invoice}
        invoiceNumber={invoices.length - invoiceIndex}
      />
    </div>
  );
}
