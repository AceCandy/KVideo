/**
 * HTTP Utilities for API calls
 * Handles timeouts and retries
 */

import { assertSafeOutboundUrl } from '@/lib/server/url-guard';
import { dispatcherForUrl } from '@/lib/server/tls-policy';

const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 200;

/**
 * Fetch with timeout support
 * Accepts an optional external AbortSignal for cancellation cascade.
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // If an external signal is provided, propagate its abort
    const externalSignal = options.signal;
    if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(timeoutId);
            controller.abort();
        } else {
            const onAbort = () => controller.abort();
            externalSignal.addEventListener('abort', onAbort, { once: true });
        }
    }

    try {
        await assertSafeOutboundUrl(url);
        const fetchOptions: RequestInit & { dispatcher?: unknown } = {
            ...options,
            signal: controller.signal,
        };
        const dispatcher = await dispatcherForUrl(url);
        if (dispatcher) fetchOptions.dispatcher = dispatcher;
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Retry logic wrapper
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
            }
        }
    }

    throw lastError;
}
