import { lazy, Suspense } from 'react';
import 'swiper/css';
import './assets/boxicons-2.0.7/css/boxicons.min.css';
import './App.scss';
import '@mantine/core/styles.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Toaster } from 'react-hot-toast';
import { theme } from './theme';
import Header from './components/header/Header';
import Footer from './components/footer/Footer';
import ScrollToTop from './components/ScrollToTop';
import Loading from './components/loading/Loading';

// Lazy-loaded route components
const Home = lazy(() => import('./pages/home/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Detail = lazy(() => import('./pages/detail/Detail'));
const Person = lazy(() => import('./pages/person/Person'));
const MultiSearch = lazy(() => import('./components/MultiSearch/MultiSearch'));
const MyList = lazy(() => import('./pages/my-list/MyList'));
const Collection = lazy(() => import('./pages/collection/Collection'));

function App() {
    return (
        <MantineProvider theme={theme} defaultColorScheme="dark">
            <BrowserRouter
                future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                }}
            >
                <ScrollToTop />
                <Header />
                <Suspense fallback={<Loading />}>
                    <Routes>
                        <Route path='/person/:id' element={<Person />} />
                        <Route path='/collection/:id' element={<Collection />} />
                        <Route path='/my-list' element={<MyList />} />
                        <Route path='/:category/search/:keyword' element={<Catalog />} />
                        <Route path='/:category/type/:type' element={<Catalog />} />
                        <Route path='/:category/:id' element={<Detail />} />
                        <Route path='/:category' element={<Catalog />} />
                        <Route path='/' element={<Home />} />
                        <Route path="/search/:keyword" element={<MultiSearch />} />
                    </Routes>
                </Suspense>
                <Footer />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#333',
                            color: '#fff',
                        },
                    }}
                />
            </BrowserRouter>
        </MantineProvider>
    );
}

export default App;
