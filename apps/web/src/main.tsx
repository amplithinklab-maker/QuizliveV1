import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import Home from './pages/Home';
import Create from './pages/Create';
import Host from './pages/Host';
import Join from './pages/Join';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/host/:roomCode" element={<Host />} />
        <Route path="/join/:roomCode" element={<Join />} />
      </Routes>
    </HashRouter>
  </StrictMode>
);
