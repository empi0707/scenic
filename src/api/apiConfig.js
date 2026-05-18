const apiConfig = {
    baseUrl: 'https://api.themoviedb.org/3/',
    apiKey: process.env.REACT_APP_API_KEY,
    originalImage: (imgPath) => `https://image.tmdb.org/t/p/original/${imgPath}`,
    w500Image: (imgPath) => `https://image.tmdb.org/t/p/w500/${imgPath}`,
    w780Image: (imgPath) => `https://image.tmdb.org/t/p/w780/${imgPath}`,
    w1280Image: (imgPath) => `https://image.tmdb.org/t/p/w1280/${imgPath}`
}

export default apiConfig;