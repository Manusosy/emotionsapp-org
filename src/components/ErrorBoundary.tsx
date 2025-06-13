import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  dashboardPath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Something went wrong</h2>
            <p className="text-gray-600">
              We encountered an error while rendering this page.
            </p>
            {this.state.error && (
              <div className="p-4 text-sm bg-red-50 text-red-700 rounded-md border border-red-200 text-left overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button onClick={this.resetErrorBoundary}>
                Try Again
              </Button>
              {this.props.dashboardPath && (
                <Button variant="outline" onClick={() => window.location.href = this.props.dashboardPath}>
                  Return to Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 