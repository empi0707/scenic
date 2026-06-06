import React from 'react';

import { useParams } from 'react-router';

import MovieGrid from '../components/movie-grid/MovieGrid';
import { category as cate } from '../api/tmdbApi';
import './Catalog.scss';

const TYPE_LABELS = {
    top_rated: 'Top Rated',
    now_playing: 'Now Playing',
    popular: 'Popular',
    upcoming: 'Upcoming',
    on_the_air: 'On The Air',
};

// Blurb under each catalog title, keyed by category + type ('base' = the
// default Discover view). No em dashes.
const DESCRIPTIONS = {
    movie: {
        base: "Uncover hidden gems and new releases in the world of cinema. Dive into a sea of movies waiting to be discovered by you.",
        popular: "Dive into the world of popular movies that have captured the hearts of audiences worldwide. From blockbuster hits to critically acclaimed films, discover what's trending in the cinematic universe.",
        upcoming: "Be the first to watch the latest movies before they hit the big screen. Discover the upcoming movies that everyone is talking about.",
        now_playing: "Catch the latest movies now playing in theaters near you. Experience the magic of cinema with current hits.",
        top_rated: "Explore the pinnacle of cinematic excellence with our collection of top-rated movies. These films have been recognized for their outstanding storytelling, direction, and performances.",
    },
    tv: {
        base: "Unearth new TV shows and hidden gems in the vast landscape of television. Whether you're into dramas, comedies, or thrillers, there's always something new to discover.",
        popular: "Dive into the world of popular TV shows that have captured the hearts of audiences worldwide. From binge-worthy series to critically acclaimed dramas, discover what's trending in the TV universe.",
        on_the_air: "Tune in to the latest buzz with shows currently on the air. From gripping dramas to laugh-out-loud comedies, watch what's captivating audiences right now.",
        top_rated: "Explore the pinnacle of television excellence with our collection of top-rated TV shows. These series have been recognized for their outstanding storytelling, acting, and production values.",
    },
};

const Catalog = () => {

    const { category, type } = useParams();

    const categoryName = category === cate.movie ? 'Movies' : 'TV Series';
    const title = type
        ? `${TYPE_LABELS[type] || 'Popular'} ${categoryName}`
        : `Discover ${categoryName}`;
    const description = (DESCRIPTIONS[category] || {})[type || 'base'] || '';

    return (
        <div className="catalog-page">
            <div className="container">
                <div className="section mb-3">
                    <div className="catalog-page__header">
                        <h2>{title}</h2>
                        {description && (
                            <p className="catalog-page__desc">{description}</p>
                        )}
                    </div>
                    <MovieGrid category={category} type={type}/>
                </div>
            </div>
        </div>
    );
}

export default Catalog;
