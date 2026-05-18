import React from 'react';

import './movie-card.scss';

import { Link } from 'react-router-dom';

import Button from '../button/Button';
import BookmarkButton from '../bookmark-button/BookmarkButton';

import { category } from '../../api/tmdbApi';
import apiConfig from '../../api/apiConfig';

const MovieCard = props => {

    const item = props.item;

    // Prefer per-item media_type when present (used by mixed lists like
    // Hidden Gems, Trending All). Fall back to the row's category prop.
    const resolvedCategory = item.media_type
        ? (item.media_type === 'tv' ? category.tv : category.movie)
        : category[props.category];

    const link = '/' + resolvedCategory + '/' + item.id;

    const posterPath = item.poster_path || item.backdrop_path;
    const bg = posterPath ? apiConfig.w500Image(posterPath) : null;

    return (
        <Link to={link} className="movie-card-link">
            <div
                className={`movie-card${bg ? '' : ' movie-card--no-poster'}`}
                style={bg ? { backgroundImage: `url(${bg})` } : undefined}
            >
                {!bg && (
                    <span className="movie-card__placeholder">
                        {item.title || item.name}
                    </span>
                )}
                <Button>
                    <i className="bx bx-play"></i>
                </Button>
                {item.media_type && (
                    <span className={`movie-card__media-badge movie-card__media-badge--${item.media_type}`}>
                        {item.media_type === 'tv' ? 'Series' : 'Movie'}
                    </span>
                )}
                <div className="movie-card__info">
                    <div className="movie-card__rating">
                        <i className="bx bxs-star"></i>
                        <span>{item.vote_average?.toFixed(1) || 'N/A'}</span>
                    </div>
                </div>
                <BookmarkButton
                    item={item}
                    mediaType={resolvedCategory}
                    variant="card"
                />
            </div>
            <div className="movie-card__title">
                <h3>{item.title || item.name}</h3>
                {props.subtitleOverride ? (
                    <p className="movie-card__year movie-card__year--accent">
                        {props.subtitleOverride}
                    </p>
                ) : (
                    <p className="movie-card__year">
                        {new Date(item.release_date || item.first_air_date).getFullYear() || 'TBA'}
                    </p>
                )}
            </div>
        </Link>
    );
}

export default MovieCard;
