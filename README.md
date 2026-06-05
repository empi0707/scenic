# Scenic

A movie and TV series discovery app built with React. Browse trending content, search by title, voice, or natural language, watch trailers, track what you're watching, and stream from multiple servers.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-Modules-CC6699?logo=sass&logoColor=white)
![TMDB](https://img.shields.io/badge/TMDB-API-01D277?logo=themoviedatabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

**Features**

- **Smart Search:** Natural-language queries - "punjabi movies", "hindi comedy", "korean series", "2019 horror" - route to TMDB Discover with language, genre, and year filters; plain titles fall back to full-text search
- **Autocomplete Suggestions:** As-you-type dropdown with poster thumbnails, highlighted matches, and type/year/rating, fully keyboard and TV-remote navigable
- **Voice Search:** Speak your query via the Web Speech API; the mic button only appears where the browser supports it
- **Multi-Server Streaming:** Watch movies and TV episodes from 10+ configurable servers with a built-in server selector
- **TV Series Player:** Season and episode selector with previous/next navigation and auto-saved progress via localStorage
- **Continue Watching:** Recently opened titles resume on the home page, including the exact "S2 E5" you left off on
- **My List:** Bookmark anything to a personal watchlist that persists locally and syncs instantly across the app
- **Streaming-Provider Browser:** Discover what's "Streaming on" Netflix, Prime, and more in your region, with auto-detected location and a searchable region/provider picker
- **Hidden Gems:** Surfaces highly rated titles (7.5+ with a modest review count) that most people haven't found yet
- **Trending Rows:** Trending Today and a ranked Top 10 This Week across movies and TV
- **Hero Carousel:** Auto-playing showcase of top trending movies with poster art and quick actions
- **Genre & Country Filters:** Glass dropdowns with type-ahead and keyboard/remote navigation on catalog pages
- **Trailer Playback:** Watch YouTube trailers directly in-app through a modal player
- **Detailed Info Pages:** Backdrop art, cast with dedicated person pages, ratings, genres, runtime, reviews, and related recommendations
- **Share:** Native share sheet with copy-link fallback, plus rich social preview cards (Open Graph / Twitter) rendered server-side
- **Keyboard & Remote Friendly:** Arrow/D-pad navigation, focus management, and submit-on-Enter throughout - usable on a TV browser
- **Responsive Design:** Optimized layouts for mobile (with bottom nav), tablet, and desktop

**Tech Stack**

| Layer | Tools |
|-------|-------|
| **Framework** | React 18, React Router DOM v6 |
| **Styling** | SCSS, Mantine UI |
| **Animations** | Framer Motion, Swiper.js, CSS transitions |
| **API** | TMDB (The Movie Database) |
| **HTTP** | Axios with interceptors |
| **Browser APIs** | Web Speech (voice search), localStorage (watchlist, history, progress) |
| **Deployment** | Vercel edge functions (TMDB key proxy + social meta) |
| **Icons** | Boxicons, Font Awesome |
| **Utilities** | use-debounce, query-string, react-hot-toast |

**Getting Started**

Prerequisites: Node.js v14+ and a free [TMDB API key](https://www.themoviedb.org/settings/api).

```bash
git clone https://github.com/vanshaj-pahwa/scenic.git
cd scenic
npm install
```

Create a `.env` file in the root:

```env
# TMDB
REACT_APP_API_KEY=your_tmdb_api_key

# Streaming servers (movie & TV pairs)
REACT_APP_MOVIE_SERVER1=https://example.com/embed/movie/
REACT_APP_TV_SERVER1=https://example.com/embed/tv/
# ... configure up to SERVER10
```

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

**Routes**

| Path | Page |
|------|------|
| `/` | Home: hero slider, trending and top rated sections |
| `/movie` | Movie catalog with filters |
| `/tv` | TV series catalog with filters |
| `/movie/type/:type` | Movies by type (popular, top_rated, now_playing, upcoming) |
| `/tv/type/:type` | TV by type (popular, top_rated, on_the_air) |
| `/movie/:id` | Movie detail + player |
| `/tv/:id` | TV series detail + episode player |
| `/person/:id` | Cast/crew member with filmography |
| `/my-list` | Saved watchlist |
| `/search/:keyword` | Search results (title, voice, or natural language) |

**Contributing**

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

---

Built by [Vanshaj Pahwa](https://github.com/vanshaj-pahwa)
