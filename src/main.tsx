import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx - React import check:', React);

// Adicionar script do OneSignal (verificar se já existe)
if (!document.querySelector('script[src*="OneSignalSDK"]')) {
  const oneSignalScript = document.createElement('script')
  oneSignalScript.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js'
  oneSignalScript.async = true
  oneSignalScript.defer = true
  oneSignalScript.onload = () => console.log('[OneSignal] SDK loaded successfully')
  oneSignalScript.onerror = () => console.error('[OneSignal] SDK failed to load')
  document.head.appendChild(oneSignalScript)
} else {
  console.log('[OneSignal] SDK already loaded, skipping')
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(<App />);
