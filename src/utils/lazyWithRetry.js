import { lazy } from 'react';

// Wraps React.lazy so a failed chunk load (stale hashes after a new deploy)
// triggers a one-time full reload to fetch the current bundle instead of
// crashing with a ChunkLoadError.
const STORAGE_KEY = 'chunk-reload-attempted';

export default function lazyWithRetry(importer) {
    return lazy(async () => {
        const alreadyReloaded = window.sessionStorage.getItem(STORAGE_KEY) === 'true';
        try {
            const component = await importer();
            window.sessionStorage.removeItem(STORAGE_KEY);
            return component;
        } catch (error) {
            const isChunkError =
                error?.name === 'ChunkLoadError' ||
                /Loading chunk [\d]+ failed/i.test(error?.message || '') ||
                /Loading CSS chunk/i.test(error?.message || '');

            if (isChunkError && !alreadyReloaded) {
                window.sessionStorage.setItem(STORAGE_KEY, 'true');
                window.location.reload();
                // Return a never-resolving promise so Suspense holds until reload.
                return new Promise(() => {});
            }
            throw error;
        }
    });
}
