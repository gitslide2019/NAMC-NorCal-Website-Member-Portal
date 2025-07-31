import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    retry: () => void;
    retryCount: number;
  }>;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundaryWithRetry extends React.Component<Props, ErrorState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    this.props.onError?.(error, errorInfo);
    
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentWillUnmount() {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  retry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  autoRetry = (delay: number = 1000) => {
    const timeout = setTimeout(() => {
      this.retry();
    }, delay);
    
    this.retryTimeouts.push(timeout);
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback: CustomFallback, maxRetries = 3 } = this.props;

    if (hasError && error) {
      if (CustomFallback) {
        return (
          <CustomFallback 
            error={error} 
            retry={this.retry} 
            retryCount={retryCount}
          />
        );
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                {error.message || 'An unexpected error occurred'}
              </p>
              {retryCount > 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  Retry attempt: {retryCount} of {maxRetries}
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              {retryCount < maxRetries && (
                <Button
                  onClick={this.retry}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Show Error Details
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook for handling async errors with retry logic
export const useErrorHandler = (maxRetries: number = 3) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  const executeWithRetry = React.useCallback(async (
    operation: () => Promise<any>,
    onSuccess?: (result: any) => void,
    onError?: (error: Error) => void
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      setRetryCount(0); // Reset retry count on success
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      
      // Auto-retry for network errors
      if (retryCount < maxRetries && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('timeout')
      )) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          executeWithRetry(operation, onSuccess, onError);
        }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, maxRetries]);

  const retry = React.useCallback(() => {
    setRetryCount(0);
    setError(null);
  }, []);

  return {
    executeWithRetry,
    retry,
    error,
    retryCount,
    isLoading,
    canRetry: retryCount < maxRetries
  };
};

export default ErrorBoundaryWithRetry;