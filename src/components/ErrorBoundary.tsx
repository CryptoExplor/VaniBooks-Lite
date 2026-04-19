import { Component, type ReactNode, type ErrorInfo } from "react";
import { logger } from "../lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("Uncaught React error", {
      code: "REACT_ERROR_BOUNDARY",
      data: { componentStack: info.componentStack },
    });
    // Log error message but not full stack to avoid PII leakage
    logger.error(error.message);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-6">
            <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center shadow">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="font-display text-xl font-semibold text-text mb-2">
                Something went wrong
              </h2>
              <p className="text-muted text-sm mb-6">
                An unexpected error occurred. Please refresh the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-accent text-white px-6 py-2 rounded-lg font-body font-medium hover:opacity-90 transition-opacity"
              >
                Refresh
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
