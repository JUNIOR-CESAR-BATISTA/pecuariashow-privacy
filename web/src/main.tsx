import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import "./estilos.css";
import { App } from "./interface/App.js";
import { ProvedorApp } from "./interface/estado.js";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Elemento raiz não encontrado");

// Guarda os arquivos do aplicativo para ele abrir sem internet, e troca por
// uma versão nova assim que ela existir.
registerSW({ immediate: true });

createRoot(raiz).render(
  <StrictMode>
    <ProvedorApp>
      <App />
    </ProvedorApp>
  </StrictMode>,
);
