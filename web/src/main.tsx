import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./estilos.css";
import { App } from "./interface/App.js";
import { ProvedorApp } from "./interface/estado.js";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Elemento raiz não encontrado");

createRoot(raiz).render(
  <StrictMode>
    <ProvedorApp>
      <App />
    </ProvedorApp>
  </StrictMode>,
);
