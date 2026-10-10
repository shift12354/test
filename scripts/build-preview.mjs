// Builds the site as one self-contained HTML file (inline CSS and JS) for
// hosts that cannot run Next.js, such as a claude.ai artifact.
//
//   npm run build:preview   ->   dist-preview/nordlys.html
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { build } from "esbuild"

const OUT_DIR = "dist-preview"
const TMP_CSS = `${OUT_DIR}/.app.css`
mkdirSync(OUT_DIR, { recursive: true })

const js = await build({
  entryPoints: ["preview/main.tsx"],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logOverride: { "unsupported-directive": "silent" },
})
const script = js.outputFiles[0].text.replaceAll("</script", "<\\/script")

execFileSync("node_modules/.bin/tailwindcss", ["-i", "src/app/globals.css", "-o", TMP_CSS, "--minify"], {
  stdio: "inherit",
})
const css = readFileSync(TMP_CSS, "utf8")
rmSync(TMP_CSS)

// next/font is not available here, so the face comes from Google Fonts instead.
const fontCss = `:root{--font-schibsted:"Schibsted Grotesk"}`
// The artifact skeleton ships an unlayered body reset; restate the page's own body styles above it.
const bodyCss = `body{background:var(--background);color:var(--foreground);font-family:var(--font-sans);font-size:1.125rem;line-height:1.55;-webkit-font-smoothing:antialiased}`
// Pick the theme before the first paint: the host's data-theme, else the stored choice, else the system.
const themeScript = `(()=>{const r=document.documentElement;let t=r.dataset.theme;try{t=t||localStorage.getItem("theme")}catch{}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;r.lang="nb"})()`

const html = `<title>Nordlys</title>
<meta name="description" content="Nordlys er et lite nettstudio i Tromsø. Vi lager nettsider for bedrifter i Nord-Norge.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..900&display=swap">
<style>${css}${fontCss}${bodyCss}</style>
<script>${themeScript}</script>
<div id="root" class="flex min-h-full flex-col"></div>
<script>${script}</script>
`
writeFileSync(`${OUT_DIR}/nordlys.html`, html)
console.log(`${OUT_DIR}/nordlys.html  ${(html.length / 1024).toFixed(0)} KB`)
