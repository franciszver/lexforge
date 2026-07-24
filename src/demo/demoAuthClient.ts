/**
 * Demo Auth Client
 *
 * Drop-in replacement for the `aws-amplify/auth` functions used by the app.
 * In demo mode, any credentials sign in successfully as the bundled demo
 * user and no Cognito calls are made. When demo mode is off, every function
 * delegates straight through to the real Amplify auth module.
 */
import * as amplifyAuth from 'aws-amplify/auth';
import { isDemoMode } from './demoConfig';
import { DEMO_USER } from './fixtures';

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
    return amplifyAuth.signIn(input);
}

export async function signUp(
    input: Parameters<typeof amplifyAuth.signUp>[0]
): ReturnType<typeof amplifyAuth.signUp> {
    if (isDemoMode) {
        return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } } as Awaited<ReturnType<typeof amplifyAuth.signUp>>;
    }
    return amplifyAuth.signUp(input);
}

export async function confirmSignUp(
    input: Parameters<typeof amplifyAuth.confirmSignUp>[0]
): ReturnType<typeof amplifyAuth.confirmSignUp> {
    if (isDemoMode) {
        demoSignedIn = true;
        return { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } } as Awaited<ReturnType<typeof amplifyAuth.confirmSignUp>>;
    }
    return amplifyAuth.confirmSignUp(input);
}

export async function resendSignUpCode(
    input: Parameters<typeof amplifyAuth.resendSignUpCode>[0]
): ReturnType<typeof amplifyAuth.resendSignUpCode> {
    if (isDemoMode) {
        return { destination: DEMO_USER.email, deliveryMedium: 'EMAIL', attributeName: 'email' } as Awaited<ReturnType<typeof amplifyAuth.resendSignUpCode>>;
    }
    return amplifyAuth.resendSignUpCode(input);
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
    return amplifyAuth.resetPassword(input);
}

export async function confirmResetPassword(
    input: Parameters<typeof amplifyAuth.confirmResetPassword>[0]
): ReturnType<typeof amplifyAuth.confirmResetPassword> {
    if (isDemoMode) {
        return undefined as Awaited<ReturnType<typeof amplifyAuth.confirmResetPassword>>;
    }
    return amplifyAuth.confirmResetPassword(input);
}

export async function getCurrentUser(): ReturnType<typeof amplifyAuth.getCurrentUser> {
    if (isDemoMode) {
        if (!demoSignedIn) {
            throw new Error('Not authenticated');
        }
        return demoUser();
    }
    return amplifyAuth.getCurrentUser();
}

export async function fetchAuthSession(): ReturnType<typeof amplifyAuth.fetchAuthSession> {
    if (isDemoMode) {
        return { tokens: { accessToken: { payload: { 'cognito:groups': ['admin'] } } } } as unknown as Awaited<ReturnType<typeof amplifyAuth.fetchAuthSession>>;
    }
    return amplifyAuth.fetchAuthSession();
}

export async function signOut(): ReturnType<typeof amplifyAuth.signOut> {
    if (isDemoMode) {
        demoSignedIn = false;
        return undefined as Awaited<ReturnType<typeof amplifyAuth.signOut>>;
    }
    return amplifyAuth.signOut();
}
