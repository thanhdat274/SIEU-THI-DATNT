import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ArtLab } from './components/ArtLab';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {import.meta.env.DEV && new URLSearchParams(window.location.search).has('art-lab') ? <ArtLab /> : <App />}
  </React.StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
