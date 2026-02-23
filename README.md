# Scenic

A modern movie and TV series discovery platform built with React. Browse trending content, explore genres, search across movies and shows, watch trailers, and stream from multiple servers — all wrapped in a sleek glass-morphism UI.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-Modules-CC6699?logo=sass&logoColor=white)
![TMDB](https://img.shields.io/badge/TMDB-API-01D277?logo=themoviedatabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Multi-Server Streaming** — Watch movies and TV episodes from 10+ configurable servers with a built-in server selector
- **TV Series Player** — Season and episode selector with previous/next navigation and auto-saved progress via localStorage
- **Hero Carousel** — Auto-playing showcase of top 5 trending movies with poster art and quick actions
- **Global Search** — Debounced multi-search across movies and TV shows with instant results
- **Genre & Country Filters** — Filter content by genre or production country on catalog pages
- **Trailer Playback** — Watch YouTube trailers directly in-app through a modal player
- **Detailed Info Pages** — Backdrop art, cast lists, ratings, genres, runtime, and related recommendations
- **Responsive Design** — Optimized layouts for mobile (with bottom nav), tablet, and desktop
- **Glass-morphism UI** — Translucent panels, backdrop blur, gradient accents, and smooth fade-in animations

## Tech Stack

| Layer | Tools |
|-------|-------|
| **Framework** | React 18, React Router DOM v6 |
| **Styling** | SCSS, Mantine UI |
| **Animations** | Framer Motion, Swiper.js, CSS transitions |
| **API** | TMDB (The Movie Database) |
| **HTTP** | Axios with interceptors |
| **Icons** | Boxicons, Font Awesome |
| **Utilities** | use-debounce, query-string, react-hot-toast |

## Getting Started

### Prerequisites

- Node.js v14+
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

### Installation

```bash
git clone https://github.com/vanshaj-pahwa/scenic.git
cd scenic
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# TMDB
REACT_APP_API_KEY=your_tmdb_api_key

# Streaming servers (movie & TV pairs)
REACT_APP_MOVIE_SERVER1=https://example.com/embed/movie/
REACT_APP_TV_SERVER1=https://example.com/embed/tv/
# ... configure up to SERVER10
```

### Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.


## Routes

| Path | Page |
|------|------|
| `/` | Home — hero slider, trending & top rated sections |
| `/movie` | Movie catalog with filters |
| `/tv` | TV series catalog with filters |
| `/movie/type/:type` | Movies by type (popular, top_rated, now_playing, upcoming) |
| `/tv/type/:type` | TV by type (popular, top_rated, on_the_air) |
| `/movie/:id` | Movie detail + player |
| `/tv/:id` | TV series detail + episode player |
| `/search/:keyword` | Global search results |

## Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m "Add your feature"`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a Pull Request

---

Built with ❤️ by [Vanshaj Pahwa](https://github.com/vanshaj-pahwa)
