import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Window } from '@tauri-apps/api/window';
import App from './App';
import './index.css';

const initTauri = async () => {
  try {
    if (window.__TAURI__) {
      const appWindow = Window.getCurrent();
      await appWindow.listen('tauri://close-requested', () => {
        appWindow.close();
      });
    }
  } catch (error) {
    console.warn('Tauri initialization failed:', error);
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

initTauri().then(() => {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});