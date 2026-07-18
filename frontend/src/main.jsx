import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./global.css";

import { ToastProvider } from "./context/ToastContext.jsx";

import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="1057629123787-gskt2kvcok51e44dqtin4jkd93ks311q.apps.googleusercontent.com">
      <ToastProvider>
        <App />
      </ToastProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
