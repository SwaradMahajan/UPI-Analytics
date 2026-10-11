import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { SimulationProvider } from "./app/SimulationContext";

createRoot(document.getElementById("root")!).render(
  <SimulationProvider>
    <App />
  </SimulationProvider>
);