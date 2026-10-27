import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./Global.css";
import "./styles/system-forms.css";

import { ToastProvider } from "./context/ToastContext.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
)
