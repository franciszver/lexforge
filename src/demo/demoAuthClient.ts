/**
 * Demo Auth Client
 *
 * The app's auth surface: signIn/signUp/getCurrentUser/etc. In demo mode,
 * any credentials sign in successfully as the bundled demo user and no
 * server calls are made. When demo mode is off, every function delegates to
 * the server-backed `../api/authClient` (POST /auth/* on the Express/Prisma
 * server — see server/src/auth/routes.js).
 *
 * The shapes below (nextStep, signInStep, etc.) are a minimal auth-session
 * stub for demo mode; kept as local types since authSlice, Login, and
 * Dashboard already consume them.
 *
 * The API has no equivalent of email-verification or password-reset flows
 * (v1 has none). Where the contract expects a `nextStep`, those functions
 * return a no-op "already done" shape instead of making a network call —
 * see the comment on each.
 */
import { isDemoMode } from './demoConfig';
import { DEMO_USER } from './fixtures';
import * as authClient from '../api/authClient';

interface AuthUser {
    userId: string;
    username: string;
    signInDetails: { loginId: string };
}

interface SignInInput {
    username?: string;
    password?: string;
}

interface SignInResult {
    isSignedIn: boolean;
    nextStep: { signInStep: string };
}

interface SignUpInput {
    username?: string;
    password?: string;
    options?: { userAttributes?: { email?: string } };
}

interface SignUpResult {
    isSignUpComplete: boolean;
    nextStep: { signUpStep: string };
}

interface ConfirmSignUpInput {
    username?: string;
    confirmationCode?: string;
}

interface ResendSignUpCodeInput {
    username?: string;
}

interface ResendSignUpCodeResult {
    destination?: string;
    deliveryMedium: string;
    attributeName: string;
}

interface ResetPasswordInput {
    username?: string;
}

interface ResetPasswordResult {
    isPasswordReset: boolean;
    nextStep: { resetPasswordStep: string; codeDeliveryDetails?: { destination: string; deliveryMedium: string } };
}

interface ConfirmResetPasswordInput {
    username?: string;
    confirmationCode?: string;
    newPassword?: string;
}

interface AuthSession {
    groups: string[];
}

let demoSignedIn = false;

function demoUser(): AuthUser {
    return {
        userId: DEMO_USER.userId,
        username: DEMO_USER.email,
        signInDetails: { loginId: DEMO_USER.email },
    };
}

export async function signIn(input: SignInInput): Promise<SignInResult> {
    if (isDemoMode) {
        demoSignedIn = true;
        return { isSignedIn: true, nextStep: { signInStep: 'DONE' } };
    }
    await authClient.login(input.username ?? '', input.password ?? '');
    return { isSignedIn: true, nextStep: { signInStep: 'DONE' } };
}

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
    if (isDemoMode) {
        return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } };
    }
    // No email-verification step in v1: register() signs the user in
    // immediately, so this reports DONE rather than CONFIRM_SIGN_UP.
    const email = input.options?.userAttributes?.email ?? input.username ?? '';
    await authClient.register(email, input.password ?? '', undefined);
    return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } };
}

export async function confirmSignUp(input: ConfirmSignUpInput): Promise<SignUpResult> {
    if (isDemoMode) {
        demoSignedIn = true;
        return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } };
    }
    // No email-verification flow in v1 (signUp already signs the user in):
    // a no-op success, no network call.
    void input;
    return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } };
}

export async function resendSignUpCode(input: ResendSignUpCodeInput): Promise<ResendSignUpCodeResult> {
    if (isDemoMode) {
        return { destination: DEMO_USER.email, deliveryMedium: 'EMAIL', attributeName: 'email' };
    }
    // No email-verification flow in v1: a no-op success, no network call.
    return {
        destination: input.username,
        deliveryMedium: 'EMAIL',
        attributeName: 'email',
    };
}

export async function resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    if (isDemoMode) {
        return {
            isPasswordReset: false,
            nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE', codeDeliveryDetails: { destination: DEMO_USER.email, deliveryMedium: 'EMAIL' } },
        };
    }
    // No password-reset flow in v1: a no-op "nothing to do" success, no
    // network call.
    void input;
    return {
        isPasswordReset: true,
        nextStep: { resetPasswordStep: 'DONE' },
    };
}

export async function confirmResetPassword(input: ConfirmResetPasswordInput): Promise<void> {
    if (isDemoMode) {
        return undefined;
    }
    // No password-reset flow in v1: a no-op success, no network call.
    void input;
    return undefined;
}

export async function getCurrentUser(): Promise<AuthUser> {
    if (isDemoMode) {
        if (!demoSignedIn) {
            throw new Error('Not authenticated');
        }
        return demoUser();
    }
    const user = await authClient.me();
    return {
        userId: user.id,
        username: user.email,
        signInDetails: { loginId: user.email },
    };
}

export async function fetchAuthSession(): Promise<AuthSession> {
    if (isDemoMode) {
        return { groups: ['admin'] };
    }
    const role = authClient.getStoredAuth()?.user.role;
    const groups = role === 'admin' ? ['admin'] : [];
    return { groups };
}

export async function signOut(): Promise<void> {
    if (isDemoMode) {
        demoSignedIn = false;
        return undefined;
    }
    await authClient.logout();
    return undefined;
}
