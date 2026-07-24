/**
 * Returns the given URL only if it is a safe http(s) link, otherwise undefined.
 * Blocks javascript:, data:, and other potentially dangerous URL schemes.
 */
export function safeHref(url?: string): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return undefined;
}
