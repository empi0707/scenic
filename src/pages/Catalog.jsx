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

const Catalog = () => {

    const { category, type } = useParams();

    const categoryName = category === cate.movie ? 'Movies' : 'TV Series';
    const title = type
        ? `${TYPE_LABELS[type] || 'Popular'} ${categoryName}`
        : categoryName;

    return (
        <div className="catalog-page">
            <div className="container">
                <div className="section mb-3">
                    <div className="section__header catalog-page__header">
                        <h2>{title}</h2>
                    </div>
                    <MovieGrid category={category} type={type}/>
                </div>
            </div>
        </div>
    );
}

export default Catalog;
