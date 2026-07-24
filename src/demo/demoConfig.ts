/**
 * Demo Mode Configuration
 *
 * Build-time flag that switches the app into a fully static, AWS-free demo:
 * stubbed auth and fixture-backed data services. Set VITE_DEMO_MODE=1 at
 * build time (e.g. `VITE_DEMO_MODE=1 npm run build`) to enable it.
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === '1';
