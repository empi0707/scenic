import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Per-entry scroll memory: new navigations jump to the top, but Back/Forward
// restore where you were. It retries while async content (grids, detail pages)
// grows the page so the saved offset is actually reachable.
const positions = new Map();

const ScrollToTop = () => {
    const location = useLocation();
    const navType = useNavigationType();

    // Continuously record the scroll position for the current history entry.
    useEffect(() => {
        const onScroll = () => {
            positions.set(location.key, window.scrollY);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [location.key]);

    useEffect(() => {
        if (navType !== 'POP') {
            window.scrollTo(0, 0);
            return undefined;
        }

        const saved = positions.get(location.key) || 0;
        if (saved <= 0) {
            window.scrollTo(0, 0);
            return undefined;
        }

        let attempts = 0;
        let timer;
        const restore = () => {
            window.scrollTo(0, saved);
            attempts += 1;
            // Keep trying while the document is still shorter than the target.
            if (Math.abs(window.scrollY - saved) > 2 && attempts < 40) {
                timer = setTimeout(restore, 50);
            }
        };
        timer = setTimeout(restore, 0);
        return () => clearTimeout(timer);
    }, [location.key, navType]);

    return null;
};

export default ScrollToTop;
