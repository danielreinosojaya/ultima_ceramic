import React, { ReactNode, ReactElement } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactElement;
    componentName?: string;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    private errorTimeout: NodeJS.Timeout | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error details for debugging
        console.error(`[ErrorBoundary${this.props.componentName ? ` - ${this.props.componentName}` : ''}] Error caught:`, error);
        console.error('Error Info:', errorInfo);
        console.error('Component Stack:', errorInfo.componentStack);

        // Store error details in state
        this.setState({
            error,
            errorInfo,
        });

        // Call optional error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Try to send error to Vercel logs
        this.logErrorToServer(error, errorInfo);
    }

    private logErrorToServer = async (error: Error, errorInfo: React.ErrorInfo) => {
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                componentName: this.props.componentName,
                userAgent: navigator.userAgent,
            };

            // Log to console for Vercel function logs
            console.log('[ERROR_LOG_FOR_VERCEL]', JSON.stringify(errorLog));

            // Optionally send to an error logging service
            // await fetch('/api/error-log', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorLog),
            // }).catch(err => console.error('Failed to log error:', err));
        } catch (err) {
            console.error('Failed to log error to server:', err);
        }
    };

    resetError = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                        <div className="text-center">
                            {/* Error Icon */}
                            <div className="mb-4 flex justify-center">
                                <div className="text-red-500 text-5xl">⚠️</div>
                            </div>

                            {/* Error Title */}
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Oops, algo salió mal
                            </h1>

                            {/* Error Message */}
                            <p className="text-gray-600 mb-4">
                                {this.state.error?.message || 'Se encontró un error inesperado'}
                            </p>

                            {/* Development Error Details */}
                            {process.env.NODE_ENV === 'development' && (
                                <div className="mb-6 bg-gray-100 rounded p-4 text-left max-h-40 overflow-y-auto">
                                    <p className="text-xs font-mono text-gray-700 mb-2 font-bold">Detalles técnicos:</p>
                                    <p className="text-xs font-mono text-red-600 mb-2">{this.state.error?.stack}</p>
                                    {this.state.errorInfo && (
                                        <p className="text-xs font-mono text-blue-600">{this.state.errorInfo.componentStack}</p>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={this.resetError}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                                >
                                    Reintentar
                                </button>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded transition-colors"
                                >
                                    Volver al inicio
                                </button>
                                <a
                                    href="https://wa.me/573044503330"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors inline-block text-center"
                                >
                                    Contactar soporte
                                </a>
                            </div>

                            {/* Support Info */}
                            <p className="text-xs text-gray-500 mt-4">
                                Si el problema persiste, contáctanos vía WhatsApp
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
