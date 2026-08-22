import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../config/embedBranding';
import './footer.scss';

const MENUS = {
    movies: {
        title: 'Movies',
        icon: 'bx-movie-play',
        blurb: 'Embark on a cinematic adventure with our vast collection of movies. From timeless classics to the latest blockbusters, find your next favorite film today.',
        items: [
            { name: 'Discover', path: '/movie', icon: 'bx-compass', desc: 'Uncover hidden gems and new releases in the world of cinema.' },
            { name: 'Popular', path: '/movie/type/popular', icon: 'bx-heart', desc: 'Dive into the movies that have captured the hearts of audiences.' },
            { name: 'Top Rated', path: '/movie/type/top_rated', icon: 'bx-star', desc: 'Explore the pinnacle of cinematic excellence, ranked.' },
            { name: 'Now Playing', path: '/movie/type/now_playing', icon: 'bx-film', desc: 'Catch the latest movies now playing in theaters near you.' },
            { name: 'Upcoming', path: '/movie/type/upcoming', icon: 'bx-calendar', desc: 'Be the first to watch the latest movies before release.' },
        ],
    },
    tv: {
        title: 'TV Series',
        icon: 'bx-tv',
        blurb: 'Embark on a journey through the world of TV shows. From the latest hits to timeless classics, discover new stories and revisit your favorites.',
        items: [
            { name: 'Discover', path: '/tv', icon: 'bx-compass', desc: 'Unearth new shows and hidden gems across television.' },
            { name: 'Popular', path: '/tv/type/popular', icon: 'bx-heart', desc: 'Dive into the shows that have captured audiences worldwide.' },
            { name: 'Top Rated', path: '/tv/type/top_rated', icon: 'bx-star', desc: 'Explore the pinnacle of television excellence, ranked.' },
            { name: 'On The Air', path: '/tv/type/on_the_air', icon: 'bx-broadcast', desc: 'Tune in to the latest buzz with shows currently on the air.' },
        ],
    },
};

const FooterMega = ({ id, menu, openId, onToggle, onClose }) => {
    const isOpen = openId === id;
    return (
        <div className={`footer-mega${isOpen ? ' is-open' : ''}`}>
            <button
                type="button"
                className="footer-mega__trigger"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() => onToggle(id)}
            >
                {menu.title}
                <i className="bx bx-chevron-up footer-mega__caret" aria-hidden="true" />
            </button>

            <div className="footer-mega__backdrop" onClick={onClose} aria-hidden="true" />

            <div className="footer-mega__panel" role="menu" onClick={onClose}>
                <span className="footer-mega__handle" aria-hidden="true" />
                <div className="footer-mega__head">
                    <h4><i className={`bx ${menu.icon}`} aria-hidden="true" /> {menu.title}</h4>
                    <p>{menu.blurb}</p>
                </div>
                <div className="footer-mega__grid">
                    {menu.items.map((item) => (
                        <Link key={item.path} to={item.path} className="footer-mega__item" role="menuitem">
                            <span className="footer-mega__item-title">
                                <i className={`bx ${item.icon}`} aria-hidden="true" />
                                {item.name}
                            </span>
                            <span className="footer-mega__item-desc">{item.desc}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Footer = () => {
    const [openId, setOpenId] = useState(null);
    const navRef = useRef(null);
    const currentYear = new Date().getFullYear();

    const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));
    const close = () => setOpenId(null);

    useEffect(() => {
        if (!openId) return undefined;
        const onDown = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) setOpenId(null);
        };
        const onKey = (e) => e.key === 'Escape' && setOpenId(null);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [openId]);

    return (
        <footer className="footer">
            <div className="footer__top container">
                <div className="footer__brand">
                    <h3 className="footer__logo">{BRAND}</h3>
                    <p className="footer__tagline">Whether you're searching for the latest blockbuster or discovering a hidden gem, {BRAND} has you covered. Stream content from multiple servers and watch trailers instantly to make your viewing decisions effortless.</p>
                </div>

                <nav className="footer__nav" aria-label="Footer" ref={navRef}>
                    <Link to="/" className="footer__nav-link">Home</Link>
                    <FooterMega id="movies" menu={MENUS.movies} openId={openId} onToggle={toggle} onClose={close} />
                    <FooterMega id="tv" menu={MENUS.tv} openId={openId} onToggle={toggle} onClose={close} />
                    <Link to="/anime" className="footer__nav-link">Anime</Link>
                </nav>
            </div>

            <div className="footer__legal">
                <div className="container">
                    <p className="footer__disclaimer">
                        {BRAND} does not host or store any media files on its servers. It operates as a content aggregator, providing links to and embedding content from third-party services. For any copyright concerns or DMCA takedown requests, please contact the respective content providers directly.
                    </p>
                    <p className="footer__credit">
                        © {currentYear} {BRAND}.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
