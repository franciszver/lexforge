import React, { useState, useEffect } from 'react';
import { signIn, signUp, getCurrentUser } from 'aws-amplify/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { setAuthenticated } from '../features/authSlice';
import { FileText } from 'lucide-react';

/**
 * Login Page
 * 
 * Handles user authentication via AWS Cognito.
 * Styled to match DraftWise theming.
 */
export const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState('');

    // Check if already authenticated
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await getCurrentUser();
                if (user) {
                    dispatch(setAuthenticated({
                        email: user.signInDetails?.loginId || user.username,
                        userId: user.userId,
                    }));
                    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
                    navigate(from, { replace: true });
                }
            } catch {
                // Not authenticated, stay on login page
            } finally {
                setCheckingAuth(false);
            }
        };
        checkAuth();
    }, [dispatch, navigate, location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                await signUp({
                    username: email,
                    password,
                    options: {
                        userAttributes: {
                            email,
                        },
                    },
                });
                setError('Please check your email for verification code');
            } else {
                const result = await signIn({
                    username: email,
                    password,
                });
                if (result.isSignedIn) {
                    const user = await getCurrentUser();
                    dispatch(setAuthenticated({
                        email: user.signInDetails?.loginId || user.username,
                        userId: user.userId,
                    }));
                    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
                    navigate(from, { replace: true });
                }
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setter(e.target.value);
            if (error) setError('');
        };

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner w-8 h-8 text-primary-600 mx-auto mb-4" />
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo and title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg">
                        <FileText className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">LexForge</h1>
                    <p className="text-primary-200">
                        AI-Powered Legal Document Drafting
                    </p>
                </div>

                {/* Login card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-slate-900">
                            {isSignUp ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {isSignUp
                                ? 'Sign up to start drafting legal documents'
                                : 'Enter your credentials to continue'
                            }
                        </p>
                    </div>

                    {error && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${error.includes('check your email')
                                ? 'bg-green-50 text-green-600'
                                : 'bg-red-50 text-red-600'
                            }`}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="label">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={handleInputChange(setEmail)}
                                className={`input ${error && !error.includes('check your email') ? 'input-error' : ''}`}
                                placeholder="attorney@example.com"
                                autoFocus
                                disabled={loading}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="label">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={handleInputChange(setPassword)}
                                className={`input ${error && !error.includes('check your email') ? 'input-error' : ''}`}
                                placeholder="Enter your password"
                                disabled={loading}
                                required
                            />
                        </div>

                        {isSignUp && (
                            <div>
                                <label htmlFor="confirmPassword" className="label">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={handleInputChange(setConfirmPassword)}
                                    className={`input ${error && !error.includes('check your email') ? 'input-error' : ''}`}
                                    placeholder="Confirm your password"
                                    disabled={loading}
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !email.trim() || !password.trim()}
                            className="btn-primary w-full"
                        >
                            {loading ? (
                                <>
                                    <span className="spinner mr-2" />
                                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                                </>
                            ) : (
                                isSignUp ? 'Create Account' : 'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Toggle signup/login */}
                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <p className="text-sm text-slate-500 text-center">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError('');
                                }}
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                {isSignUp ? 'Sign in' : 'Sign up'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-primary-200 text-sm">
                    <p>Secure, AI-powered legal document drafting</p>
                </div>
            </div>
        </div>
    );
};
