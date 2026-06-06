import axiosClient from "./axiosClient";

export const category = {
    movie: 'movie',
    tv: 'tv',
    multi: 'multi'
}

export const movieType = {
    upcoming: 'upcoming',
    popular: 'popular',
    top_rated: 'top_rated',
    now_playing: 'now_playing'
}

export const tvType = {
    popular: 'popular',
    top_rated: 'top_rated',
    on_the_air: 'on_the_air'
}

const tmdbApi = {
    getMoviesList: (type, params) => {
        const url = 'movie/' + movieType[type];
        return axiosClient.get(url, params);
    },
    getTvList: (type, params) => {
        const url = 'tv/' + tvType[type];
        return axiosClient.get(url, params);
    },
    getVideos: (cate, id) => {
        const url = category[cate] + '/' + id + '/videos';
        return axiosClient.get(url, { params: {} });
    },
    search: (cate, params) => {
        const url = 'search/' + category[cate];
        return axiosClient.get(url, params);
    },
    detail: (cate, id, params) => {
        const url = category[cate] + '/' + id;
        return axiosClient.get(url, params);
    },
    credits: (cate, id) => {
        const url = category[cate] + '/' + id + '/credits';
        return axiosClient.get(url, { params: {} });
    },
    recommendations: (cate, id) => {
        const url = category[cate] + '/' + id + '/recommendations';
        return axiosClient.get(url, { params: {} });
    },
    getSeason: (id, seasonNumber) => {
        const url = `tv/${id}/season/${seasonNumber}`;
        return axiosClient.get(url, { params: {} });
    },
    getGenreList: (cate) => {
        const url = `genre/${category[cate]}/list`;
        return axiosClient.get(url, { params: {} });
    },
    discover: (mediaType, params) => {
        const url = `discover/${mediaType === 'tv' ? 'tv' : 'movie'}`;
        return axiosClient.get(url, { params });
    },
    getMoviesByGenre: (params) => {
        const url = 'discover/movie';
        return axiosClient.get(url, { params });
    },
    getTvByGenre: (params) => {
        const url = 'discover/tv';
        return axiosClient.get(url, { params });
    },
    // Anime = Japanese-language Animation series. Extra params (sort_by, page,
    // vote_count.gte, ...) override the defaults below.
    getAnime: (params = {}) => {
        const url = 'discover/tv';
        return axiosClient.get(url, {
            params: {
                with_genres: 16,
                with_original_language: 'ja',
                include_adult: false,
                sort_by: 'popularity.desc',
                ...params,
            },
        });
    },
    getCountryList: () => {
        const url = 'configuration/countries';
        return axiosClient.get(url, { params: {} });
    },
    person: (id) => {
        const url = `person/${id}`;
        return axiosClient.get(url, { params: {} });
    },
    collection: (id) => {
        const url = `collection/${id}`;
        return axiosClient.get(url, { params: {} });
    },
    personCombinedCredits: (id) => {
        const url = `person/${id}/combined_credits`;
        return axiosClient.get(url, { params: {} });
    },
    trending: (mediaType = 'all', timeWindow = 'week') => {
        const url = `trending/${mediaType}/${timeWindow}`;
        return axiosClient.get(url, { params: {} });
    },
    discoverByProvider: (mediaType, providerId, region = 'US', params = {}) => {
        const url = `discover/${mediaType === 'tv' ? 'tv' : 'movie'}`;
        return axiosClient.get(url, {
            params: {
                with_watch_providers: providerId,
                watch_region: region,
                sort_by: 'popularity.desc',
                ...params,
            },
        });
    },
    getWatchProviders: (mediaType, region) => {
        const url = `watch/providers/${mediaType === 'tv' ? 'tv' : 'movie'}`;
        return axiosClient.get(url, {
            params: region ? { watch_region: region } : {},
        });
    },
    getWatchRegions: () => {
        const url = 'watch/providers/regions';
        return axiosClient.get(url, { params: {} });
    },
    reviews: (mediaType, id, page = 1) => {
        const type = mediaType === 'tv' ? 'tv' : 'movie';
        const url = `${type}/${id}/reviews`;
        return axiosClient.get(url, { params: { page } });
    }
}

export default tmdbApi;