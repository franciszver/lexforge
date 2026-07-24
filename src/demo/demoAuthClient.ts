/**
 * Demo Auth Client
 *
 * Drop-in replacement for the `aws-amplify/auth` functions used by the app.
 * In demo mode, any credentials sign in successfully as the bundled demo
 * user and no server calls are made. When demo mode is off, every function
 * delegates to the server-backed `../api/authClient` (POST /auth/* on the
 * Express/Prisma server — see server/src/auth/routes.js) instead of Cognito.
 *
 * Only the type shapes of `aws-amplify/auth` are used here (a type-only
 * import — no runtime dependency on the package from this module), so the
 * rest of the app (authSlice, Login, Dashboard) doesn't need to change.
 *
 * The new API has no equivalent of Cognito's email-verification or
 * password-reset flows (v1 has none). Where Amplify's contract expects a
 * `nextStep`, those functions return a no-op "already done" shape instead of
 * making a network call — see the comment on each.
 */
import type * as amplifyAuth from 'aws-amplify/auth';
import { isDemoMode } from './demoConfig';
import { DEMO_USER } from './fixtures';
import * as authClient from '../api/authClient';

let demoSignedIn = false;

function demoUser() {
    return {
        userId: DEMO_USER.userId,
        username: DEMO_USER.email,
        signInDetails: { loginId: DEMO_USER.email },
    } as Awaited<ReturnType<typeof amplifyAuth.getCurrentUser>>;
}

export async function signIn(
    input: Parameters<typeof amplifyAuth.signIn>[0]
): ReturnType<typeof amplifyAuth.signIn> {
    if (isDemoMode) {
        demoSignedIn = true;
        return { isSignedIn: true, nextStep: { signInStep: 'DONE' } } as Awaited<ReturnType<typeof amplifyAuth.signIn>>;
    }
    await authClient.login(input.username ?? '', input.password ?? '');
    return { isSignedIn: true, nextStep: { signInStep: 'DONE' } } as Awaited<ReturnType<typeof amplifyAuth.signIn>>;
}

export async function signUp(
    input: Parameters<typeof amplifyAuth.signUp>[0]
): ReturnType<typeof amplifyAuth.signUp> {
    if (isDemoMode) {
        return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } } as Awaited<ReturnType<typeof amplifyAuth.signUp>>;
    }
    // No email-verification step in v1: register() signs the user in
    // immediately, so this reports DONE rather than CONFIRM_SIGN_UP.
    const email = input.options?.userAttributes?.email ?? input.username;
    await authClient.register(email, input.password ?? '', undefined);
    return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } } as Awaited<ReturnType<typeof amplifyAuth.signUp>>;
}

export async function confirmSignUp(
    input: Parameters<typeof amplifyAuth.confirmSignUp>[0]
): ReturnType<typeof amplifyAuth.confirmSignUp> {
    if (isDemoMode) {
        demoSignedIn = true;
        return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } } as Awaited<ReturnType<typeof amplifyAuth.confirmSignUp>>;
    }
    // No email-verification flow in v1 (signUp already signs the user in):
    // a no-op success, no network call.
    void input;
    return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } } as Awaited<ReturnType<typeof amplifyAuth.confirmSignUp>>;
}

export async function resendSignUpCode(
    input: Parameters<typeof amplifyAuth.resendSignUpCode>[0]
): ReturnType<typeof amplifyAuth.resendSignUpCode> {
    if (isDemoMode) {
        return { destination: DEMO_USER.email, deliveryMedium: 'EMAIL', attributeName: 'email' } as Awaited<ReturnType<typeof amplifyAuth.resendSignUpCode>>;
    }
    // No email-verification flow in v1: a no-op success, no network call.
    return {
        destination: input.username,
        deliveryMedium: 'EMAIL',
        attributeName: 'email',
    } as Awaited<ReturnType<typeof amplifyAuth.resendSignUpCode>>;
}

export async function resetPassword(
    input: Parameters<typeof amplifyAuth.resetPassword>[0]
): ReturnType<typeof amplifyAuth.resetPassword> {
    if (isDemoMode) {
        return {
            isPasswordReset: false,
            nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE', codeDeliveryDetails: { destination: DEMO_USER.email, deliveryMedium: 'EMAIL' } },
        } as Awaited<ReturnType<typeof amplifyAuth.resetPassword>>;
    }
    // No password-reset flow in v1: a no-op "nothing to do" success, no
    // network call.
    void input;
    return {
        isPasswordReset: true,
        nextStep: { resetPasswordStep: 'DONE' },
    } as Awaited<ReturnType<typeof amplifyAuth.resetPassword>>;
}

export async function confirmResetPassword(
    input: Parameters<typeof amplifyAuth.confirmResetPassword>[0]
): ReturnType<typeof amplifyAuth.confirmResetPassword> {
    if (isDemoMode) {
        return undefined as Awaited<ReturnType<typeof amplifyAuth.confirmResetPassword>>;
    }
    // No password-reset flow in v1: a no-op success, no network call.
    void input;
    return undefined as Awaited<ReturnType<typeof amplifyAuth.confirmResetPassword>>;
}

export async function getCurrentUser(): ReturnType<typeof amplifyAuth.getCurrentUser> {
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
    } as Awaited<ReturnType<typeof amplifyAuth.getCurrentUser>>;
}

export async function fetchAuthSession(): ReturnType<typeof amplifyAuth.fetchAuthSession> {
    if (isDemoMode) {
        return { tokens: { accessToken: { payload: { 'cognito:groups': ['admin'] } } } } as unknown as Awaited<ReturnType<typeof amplifyAuth.fetchAuthSession>>;
    }
    const role = authClient.getStoredAuth()?.user.role;
    const groups = role === 'admin' ? ['admin'] : [];
    return {
        tokens: { accessToken: { payload: { 'cognito:groups': groups } } },
    } as unknown as Awaited<ReturnType<typeof amplifyAuth.fetchAuthSession>>;
}

export async function signOut(): ReturnType<typeof amplifyAuth.signOut> {
    if (isDemoMode) {
        demoSignedIn = false;
        return undefined as Awaited<ReturnType<typeof amplifyAuth.signOut>>;
    }
    await authClient.logout();
    return undefined as Awaited<ReturnType<typeof amplifyAuth.signOut>>;
}
