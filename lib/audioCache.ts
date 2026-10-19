/**
 * Audio Cache using the browser Cache API.
 * Downloads audio once from Supabase Storage, caches it locally in the browser.
 * Subsequent plays use the cached version — zero bandwidth.
 *
 * Cache persists across sessions (survives tab close, browser restart).
 * Storage: virtually unlimited (browser manages eviction under pressure).
 */

import { normalizeDemoStorageUrl } from '@/lib/demo/supabaseSandbox';

const CACHE_NAME = 'tcm-audio-v1';

/**
 * Plays audio from cache if available, otherwise fetches from network and caches.
 * Returns the HTMLAudioElement for external control (pause, cleanup).
 */
export async function playCachedAudio(rawUrl: string): Promise<HTMLAudioElement> {
    const url = normalizeDemoStorageUrl(rawUrl);
    let objectUrl: string | null = null;

    try {
        const cache = await caches.open(CACHE_NAME);
        let response = await cache.match(url);

        if (!response) {
            // First time — fetch from Supabase and store in cache
            const networkResponse = await fetch(url);

            if (!networkResponse.ok) {
                throw new Error(`Audio fetch failed: ${networkResponse.status}`);
            }

            // Clone before consuming (Response body can only be read once)
            await cache.put(url, networkResponse.clone());
            response = networkResponse;
        }

        // Create a blob URL for playback
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        const audio = new Audio(objectUrl);

        // Revoke blob URL after playback to free memory
        const cleanup = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        audio.addEventListener('ended', cleanup, { once: true });
        audio.addEventListener('error', cleanup, { once: true });

        return audio;
    } catch {
        // Cache API not available (e.g. private browsing on some browsers)
        // Fall back to direct playback — still works, just no caching
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return new Audio(url);
    }
}

/**
 * Pre-caches a list of audio URLs in the background (fire-and-forget).
 * Useful for warming the cache when the deck loads.
 */
export async function preCacheAudioUrls(urls: string[]): Promise<void> {
    try {
        const cache = await caches.open(CACHE_NAME);
        const uncached = await Promise.all(
            urls.map(async (url) => {
                const hit = await cache.match(url);
                return hit ? null : url;
            })
        );

        const toFetch = uncached.filter(Boolean) as string[];
        if (toFetch.length === 0) return;

        // Fetch in batches of 3 to avoid overloading
        for (let i = 0; i < toFetch.length; i += 3) {
            const batch = toFetch.slice(i, i + 3);
            await Promise.allSettled(
                batch.map(async (url) => {
                    const res = await fetch(url);
                    if (res.ok) await cache.put(url, res);
                })
            );
        }
    } catch {
        // Silent fail — pre-caching is best-effort
    }
}
