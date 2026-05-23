import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

function renderApp() {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error('root element not found. public/index.html 안에 <div id="root"></div> 필요');
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

renderApp();