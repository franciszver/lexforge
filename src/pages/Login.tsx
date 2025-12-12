import React, { useState, useEffect } from 'react';
import { signIn, signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword, getCurrentUser } from 'aws-amplify/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { setAuthenticated } from '../features/authSlice';
import { FileText, ArrowLeft } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset';

/**
 * Login Page
 * 
 * Handles user authentication via AWS Cognito.
 * Includes sign-in, sign-up, email verification, and password reset flows.
 */
export const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    const clearForm = () => {
        setPassword('');
        setConfirmPassword('');
        setNewPassword('');
        setVerificationCode('');
        setError('');
        setSuccess('');
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
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
        } catch (err: unknown) {
            const error = err as { name?: string; message?: string };
            
            // Check if user is not confirmed - offer to verify email
            if (error.name === 'UserNotConfirmedException' || 
                error.message?.includes('not confirmed') ||
                error.message?.includes('not verified')) {
                try {
                    await resendSignUpCode({ username: email });
                    setMode('verify');
                    setSuccess('Your account is not verified yet. A new verification code has been sent to your email.');
                } catch {
                    setError('Account not verified. Please check your email for a verification code or sign up again.');
                }
            } else {
                const message = error.message || 'Authentication failed';
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }

            const { nextStep } = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email,
                    },
                },
            });

            if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
                setMode('verify');
                setSuccess('Verification code sent to your email');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Sign up failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await confirmSignUp({
                username: email,
                confirmationCode: verificationCode,
            });

            // If we have the password (came from sign-up flow), auto sign-in
            if (password) {
                setSuccess('Email verified! Signing you in...');
                
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
            } else {
                // No password stored (came from forgot password flow) - redirect to sign in
                setSuccess('Email verified! You can now sign in or reset your password.');
                setMode('signin');
                setVerificationCode('');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Verification failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await resendSignUpCode({ username: email });
            setSuccess('New verification code sent to your email');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to resend code';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const { nextStep } = await resetPassword({ username: email });
            
            if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
                setMode('reset');
                setSuccess('Password reset code sent to your email');
            }
        } catch (err: unknown) {
            const error = err as { name?: string; message?: string };
            
            // Check if user is not confirmed - offer to verify email first
            if (error.name === 'UserNotConfirmedException' || 
                error.message?.includes('not confirmed') ||
                error.message?.includes('not verified')) {
                // Resend verification code and switch to verify mode
                try {
                    await resendSignUpCode({ username: email });
                    setMode('verify');
                    setSuccess('Your account is not verified yet. A new verification code has been sent to your email.');
                } catch (resendErr) {
                    setError('Account not verified. Please sign up again or contact support.');
                }
            } else {
                const message = error.message || 'Failed to send reset code';
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }

            await confirmResetPassword({
                username: email,
                confirmationCode: verificationCode,
                newPassword: newPassword,
            });

            setSuccess('Password reset successful! Signing you in...');
            
            // Auto sign-in after reset
            const result = await signIn({
                username: email,
                password: newPassword,
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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Password reset failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendResetCode = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await resetPassword({ username: email });
            setSuccess('New reset code sent to your email');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to resend code';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setter(e.target.value);
            if (error) setError('');
            if (success) setSuccess('');
        };

    const getTitle = () => {
        switch (mode) {
            case 'signin': return 'Welcome Back';
            case 'signup': return 'Create Account';
            case 'verify': return 'Verify Email';
            case 'forgot': return 'Forgot Password';
            case 'reset': return 'Reset Password';
        }
    };

    const getSubtitle = () => {
        switch (mode) {
            case 'signin': return 'Enter your credentials to continue';
            case 'signup': return 'Sign up to start drafting legal documents';
            case 'verify': return `Enter the code sent to ${email}`;
            case 'forgot': return 'Enter your email to receive a reset code';
            case 'reset': return `Enter the code sent to ${email}`;
        }
    };

    const handleBack = () => {
        switch (mode) {
            case 'verify':
                setMode('signup');
                break;
            case 'forgot':
            case 'reset':
                setMode('signin');
                break;
            default:
                setMode('signin');
        }
        clearForm();
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
                <div className="bg-white rounded-2xl shadow-2xl p-8 relative">
                    {/* Header */}
                    <div className="text-center mb-6">
                        {(mode === 'verify' || mode === 'forgot' || mode === 'reset') && (
                            <button
                                onClick={handleBack}
                                className="absolute left-6 top-6 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}
                        <h2 className="text-xl font-semibold text-slate-900">
                            {getTitle()}
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {getSubtitle()}
                        </p>
                    </div>

                    {/* Success message */}
                    {success && (
                        <div className="mb-4 p-3 rounded-lg text-sm bg-green-50 text-green-600">
                            {success}
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Sign In Form */}
                    {mode === 'signin' && (
                        <form onSubmit={handleSignIn} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="label">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={handleInputChange(setEmail)}
                                    className={`input ${error ? 'input-error' : ''}`}
                                    placeholder="attorney@example.com"
                                    autoFocus
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="password" className="label mb-0">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode('forgot');
                                            clearForm();
                                        }}
                                        className="text-xs text-primary-600 hover:text-primary-700"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={handleInputChange(setPassword)}
                                    className={`input ${error ? 'input-error' : ''}`}
                                    placeholder="Enter your password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email.trim() || !password.trim()}
                                className="btn-primary w-full"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner mr-2" />
                                        Signing In...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Sign Up Form */}
                    {mode === 'signup' && (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="label">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={handleInputChange(setEmail)}
                                    className={`input ${error ? 'input-error' : ''}`}
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
                                    className={`input ${error ? 'input-error' : ''}`}
                                    placeholder="Create a password"
                                    disabled={loading}
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Min 8 chars, uppercase, lowercase, number, symbol
                                </p>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="label">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={handleInputChange(setConfirmPassword)}
                                    className={`input ${error ? 'input-error' : ''}`}
                                    placeholder="Confirm your password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email.trim() || !password.trim() || !confirmPassword.trim()}
                                className="btn-primary w-full"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner mr-2" />
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Email Verification Form */}
                    {mode === 'verify' && (
                        <form onSubmit={handleVerify} className="space-y-4">
                            <div>
                                <label htmlFor="code" className="label">
                                    Verification Code
                                </label>
                                <input
                                    id="code"
                                    type="text"
                                    value={verificationCode}
                                    onChange={handleInputChange(setVerificationCode)}
                                    className={`input text-center text-2xl tracking-widest ${error ? 'input-error' : ''}`}
                                    placeholder="000000"
                                    autoFocus
                                    disabled={loading}
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || verificationCode.length < 6}
                                className="btn-primary w-full"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner mr-2" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify Email'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={loading}
                                className="btn-ghost w-full text-sm"
                            >
                                Didn't receive the code? Resend
                            </button>
                        </form>
                    )}

                    {/* Forgot Password Form - Step 1: Enter Email */}
                    {mode === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="label">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={handleInputChange(setEmail)}
                                    className={`input ${error ? 'input-error' : ''}`}
                                    placeholder="attorney@example.com"
                                    autoFocus
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email.trim()}
                                className="btn-primary w-full"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner mr-2" />
                                        Sending Code...
                                    </>
                                ) : (
                                    'Send Reset Code'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Reset Password Form - Step 2: Enter Code and New Password */}
                    {mode === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label htmlFor="resetCode" className="label">
                                    Reset Code
                                </label>
                                <input
                                    id="resetCode"
                                    type="text"
                                    value={verificationCode}
                                    onChange={handleInputChange(setVerificationCode)}
                                    className={`input text-center text-2xl tracking-widest ${error ? 'input-error' : ''}`}
                                    placeholder="000000"
                                    autoFocus
                                    disabled={loading}
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="newPassword" className="label">
                                    New Password
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={handleInputChange(setNewPassword)}
                                    className={`input ${error ? 'input-error' : ''}`}
                                    placeholder="Create new password"
                                    disabled={loading}
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Min 8 chars, uppercase, lowercase, number, symbol
                                </p>
                            </div>

                            <div>
                                <label htmlFor="confirmNewPassword" className="label">
                                    Confirm New Password
                                </label>
                                <input
                                    id="confirmNewPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={handleInputChange(setConfirmPassword)}
                                    className={`input ${error ? 'input-error' : ''}`}
                                    placeholder="Confirm new password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || verificationCode.length < 6 || !newPassword.trim() || !confirmPassword.trim()}
                                className="btn-primary w-full"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner mr-2" />
                                        Resetting Password...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleResendResetCode}
                                disabled={loading}
                                className="btn-ghost w-full text-sm"
                            >
                                Didn't receive the code? Resend
                            </button>
                        </form>
                    )}

                    {/* Toggle signup/login */}
                    {(mode === 'signin' || mode === 'signup') && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <p className="text-sm text-slate-500 text-center">
                                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode(mode === 'signup' ? 'signin' : 'signup');
                                        clearForm();
                                    }}
                                    className="text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    {mode === 'signup' ? 'Sign in' : 'Sign up'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-primary-200 text-sm">
                    <p>Secure, AI-powered legal document drafting</p>
                </div>
            </div>
        </div>
    );
};
