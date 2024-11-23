import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// PWA Service Worker registration
import { registerSW } from 'virtual:pwa-register';


const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, refresh the page!');
  },
  onOfflineReady() {
    console.log('App is ready to work offline!');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)