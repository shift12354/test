import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import { initCloud } from "./cloud/cloud"
import { useStore } from "./store/store"
import "./styles.css"

// Handy for debugging in the console.
;(window as unknown as { __tuft: typeof useStore }).__tuft = useStore

// Pick the theme before the first paint.
document.documentElement.dataset.theme = useStore.getState().settings.theme

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void initCloud()
