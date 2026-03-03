"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] px-6 py-12">
          <AlertCircle size={32} className="text-neutral-600 mb-4" />
          <h2 className="text-sm font-semibold text-white mb-1">Something went wrong</h2>
          <p className="text-xs text-neutral-500 text-center mb-4 max-w-xs">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-medium text-white hover:bg-white/[0.1] transition-colors"
          >
            <RotateCcw size={12} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
