import React from 'react';

import { useParams } from 'react-router';

import MovieGrid from '../components/movie-grid/MovieGrid';
import './Catalog.scss';

const Catalog = () => {

    const { category, type } = useParams();

    return (
        <div className="catalog-page">
            <div className="container">
                <div className="section mb-3">
                    <MovieGrid category={category} type={type}/>
                </div>
            </div>
        </div>
    );
}

export default Catalog;
