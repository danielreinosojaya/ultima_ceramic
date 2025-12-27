import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Booking } from '../types';

interface AuthState {
    isAuthenticated: boolean;
    user: {
        email: string;
        bookingCode: string;
        bookingId: string;
    } | null;
    booking: Booking | null;
    loading: boolean;
}

interface AuthContextValue extends AuthState {
    login: (email: string, bookingCode?: string, bookingId?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes (refresh before 15min expiry)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_LOGOUT = 2 * 60 * 1000; // 2 minutes warning

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        user: null,
        booking: null,
        loading: true
    });

    const [lastActivity, setLastActivity] = useState<number>(Date.now());
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);

    /**
     * Refresh access token
     */
    const refreshToken = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth?action=refresh', {
                method: 'POST',
                credentials: 'include' // Include httpOnly cookies
            });

            // 401 is expected when there's no session - just return false silently
            if (response.status === 401) {
                return false;
            }

            if (!response.ok) {
                console.error('[AUTH] Token refresh failed');
                setState(prev => ({ ...prev, isAuthenticated: false, user: null, booking: null }));
                return false;
            }

            const data = await response.json();
            console.log('[AUTH] Token refreshed successfully');
            return data.success;

        } catch (error) {
            console.error('[AUTH] Token refresh error:', error);
            setState(prev => ({ ...prev, isAuthenticated: false, user: null, booking: null }));
            return false;
        }
    }, []);

    /**
     * Login with email and booking code OR bookingId
     * Supports both new flow (bookingId) and legacy flow (bookingCode)
     */
    const login = useCallback(async (email: string, bookingCode?: string, bookingId?: string): Promise<{ success: boolean; error?: string }> => {
        setState(prev => ({ ...prev, loading: true }));

        try {
            const payload: any = { email };
            
            if (bookingId) {
                payload.bookingId = bookingId;
            } else if (bookingCode) {
                payload.bookingCode = bookingCode;
            } else {
                setState(prev => ({ ...prev, loading: false }));
                return {
                    success: false,
                    error: 'Código de reserva requerido'
                };
            }

            const response = await fetch('/api/auth?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Include httpOnly cookies
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setState(prev => ({ ...prev, loading: false }));
                return {
                    success: false,
                    error: data.error || 'Error al iniciar sesión'
                };
            }

            // Update auth state
            setState({
                isAuthenticated: true,
                user: {
                    email,
                    bookingCode: data.booking.bookingCode,
                    bookingId: data.booking.id.toString()
                },
                booking: data.booking,
                loading: false
            });

            // Reset activity tracking
            setLastActivity(Date.now());

            return { success: true };

        } catch (error) {
            console.error('[AUTH] Login error:', error);
            setState(prev => ({ ...prev, loading: false }));
            return {
                success: false,
                error: 'Error de conexión. Por favor intenta de nuevo.'
            };
        }
    }, []);

    /**
     * Logout
     */
    const logout = useCallback(async (): Promise<void> => {
        try {
            await fetch('/api/auth?action=logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('[AUTH] Logout error:', error);
        } finally {
            // Clear state regardless of API response
            setState({
                isAuthenticated: false,
                user: null,
                booking: null,
                loading: false
            });

            // Clear legacy localStorage if exists
            localStorage.removeItem('clientEmail');
            localStorage.removeItem('clientBookingCode');
            localStorage.removeItem('lastBookingId');

            setShowInactivityWarning(false);
        }
    }, []);

    /**
     * Track user activity
     */
    useEffect(() => {
        if (!state.isAuthenticated) return;

        const handleActivity = () => {
            setLastActivity(Date.now());
            setShowInactivityWarning(false);
        };

        // Track mouse/keyboard/touch activity
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
        };
    }, [state.isAuthenticated]);

    /**
     * Inactivity timeout checker
     */
    useEffect(() => {
        if (!state.isAuthenticated) return;

        const interval = setInterval(() => {
            const timeSinceLastActivity = Date.now() - lastActivity;

            // Show warning 2 minutes before logout
            if (timeSinceLastActivity >= INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT && !showInactivityWarning) {
                setShowInactivityWarning(true);
                console.warn('[AUTH] Inactivity warning: 2 minutes until auto-logout');
            }

            // Auto-logout after 30 minutes
            if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
                console.log('[AUTH] Auto-logout due to inactivity');
                logout();
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [state.isAuthenticated, lastActivity, showInactivityWarning, logout]);

    /**
     * Auto-refresh token every 14 minutes
     */
    useEffect(() => {
        if (!state.isAuthenticated) return;

        const interval = setInterval(() => {
            console.log('[AUTH] Auto-refreshing token...');
            refreshToken();
        }, REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, [state.isAuthenticated, refreshToken]);

    /**
     * Initialize auth state (check for existing session)
     */
    useEffect(() => {
        const initAuth = async () => {
            // Only try to refresh if we might have a valid session
            // (to avoid unnecessary 401 errors at startup)
            const legacyEmail = localStorage.getItem('clientEmail');
            const legacyCode = localStorage.getItem('clientBookingCode');

            if (legacyEmail && legacyCode) {
                // Try to migrate legacy session first
                console.log('[AUTH] Found legacy localStorage session, migrating to JWT...');
                const result = await login(legacyEmail, legacyCode);
                
                if (result.success) {
                    console.log('[AUTH] Legacy session migrated successfully');
                    // Clear legacy storage
                    localStorage.removeItem('clientEmail');
                    localStorage.removeItem('clientBookingCode');
                    localStorage.removeItem('lastBookingId');
                } else {
                    console.log('[AUTH] Legacy migration failed, clearing storage');
                    localStorage.removeItem('clientEmail');
                    localStorage.removeItem('clientBookingCode');
                    localStorage.removeItem('lastBookingId');
                }
            } else {
                // No legacy session, just mark as ready
                console.log('[AUTH] No existing session found');
            }

            setState(prev => ({ ...prev, loading: false }));
        };

        initAuth();
    }, []); // Run once on mount

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                refreshToken
            }}
        >
            {children}
            
            {/* Inactivity Warning Modal */}
            {showInactivityWarning && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-brand-text mb-2">
                            Sesión por expirar
                        </h3>
                        <p className="text-brand-secondary mb-4">
                            Tu sesión cerrará en 2 minutos por inactividad.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setLastActivity(Date.now());
                                    setShowInactivityWarning(false);
                                }}
                                className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90"
                            >
                                Mantener sesión
                            </button>
                            <button
                                onClick={logout}
                                className="flex-1 px-4 py-2 bg-gray-200 text-brand-text rounded-lg hover:bg-gray-300"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
};

/**
 * useAuth hook
 * 
 * Access authentication state and methods from any component
 * 
 * @example
 * const { isAuthenticated, user, login, logout } = useAuth();
 */
export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
