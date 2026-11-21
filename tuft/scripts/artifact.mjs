// Turns the single-file build into the body-only HTML the claude.ai artifact host expects
// (the host adds its own doctype, <html>, <head> and <body>).
//   npm run build:artifact  ->  dist-single/tuft.html
import { readFileSync, writeFileSync } from "node:fs"

const html = readFileSync("dist-single/index.html", "utf8")
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? ""
const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ""
const keep = head
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .trim()
const page = `${keep}\n<style>html,body,#root{height:100%}</style>\n${body.trim()}\n`
writeFileSync("dist-single/tuft.html", page)
console.log(`dist-single/tuft.html  ${(page.length / 1024).toFixed(0)} KB`)
