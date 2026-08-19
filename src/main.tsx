import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';

// Configure Monaco Editor to use a highly reliable domestic CDN to prevent loading hangs
// and avoid Vite worker bundling complexity/crashes in Tauri WebView2
import { loader } from '@monaco-editor/react';

loader.config({
  paths: {
    vs: '/vs'
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
