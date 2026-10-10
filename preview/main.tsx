// Client-only entry for the single-file preview (see scripts/build-preview.mjs).
// It renders the same page as src/app/page.tsx, without the Next.js server.
import { createRoot } from "react-dom/client"

import Home from "@/app/page"
import { Providers } from "@/components/site/providers"

createRoot(document.getElementById("root")!).render(
  <Providers>
    <Home />
  </Providers>
)
