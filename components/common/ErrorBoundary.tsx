import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <i className="bi bi-exclamation-triangle-fill text-4xl text-red-600"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            Maaf, terjadi kesalahan tak terduga pada halaman ini. Silakan coba muat ulang.
          </p>
          <div className="bg-gray-100 p-3 rounded text-left text-xs font-mono text-gray-700 w-full max-w-lg overflow-auto mb-4 border border-gray-300">
            {this.state.error?.toString()}
          </div>
          <button
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
            onClick={() => window.location.reload()}
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}