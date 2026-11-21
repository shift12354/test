import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import { useStore } from "./store/store"
import "./styles.css"

// Pick the theme before the first paint.
document.documentElement.dataset.theme = useStore.getState().settings.theme

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
