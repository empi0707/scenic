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
import Home from './pages/home/Home';
import Catalog from './pages/Catalog';
import Detail from './pages/detail/Detail';
import MultiSearch from './components/MultiSearch/MultiSearch';

function App() {
    return (
        <MantineProvider theme={theme} defaultColorScheme="dark">
            <BrowserRouter>
                <ScrollToTop />


                <Header />
                <Routes>
                    <Route path='/:category/search/:keyword' element={<Catalog />} />
                    <Route path='/:category/type/:type' element={<Catalog />} />
                    <Route path='/:category/:id' element={<Detail />} />
                    <Route path='/:category' element={<Catalog />} />
                    <Route path='/' element={<Home />} />
                    <Route path="/search/:keyword" element={<MultiSearch />} />
                </Routes>
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