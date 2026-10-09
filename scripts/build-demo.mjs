#!/usr/bin/env node
// Bygger web-appen i demo-modus og pakker alt inn i én HTML-fil: apps/web/dist-demo/life-dashboard-demo.html
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dir = 'apps/web/dist-demo';
execSync('npx vite build --mode demo', { cwd: 'apps/web', stdio: 'inherit' });

const html = readFileSync(path.join(dir, 'index.html'), 'utf8');
const asset = (re) => {
  const m = html.match(re);
  if (!m) throw new Error(`Fant ikke ${re}`);
  return readFileSync(path.join(dir, m[1]), 'utf8');
};
const js = asset(/<script type="module" crossorigin src="\/?([^"]+)"/).replace(/<\/script/gi, '<\\/script');
const css = asset(/<link rel="stylesheet" crossorigin href="\/?([^"]+)"/);

const out = `<title>Life Dashboard</title>
<meta name="robots" content="noindex, nofollow">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
const file = path.join(dir, 'life-dashboard-demo.html');
writeFileSync(file, out);
console.log(`✔ ${file} (${Math.round(out.length / 1024)} kB)`);
