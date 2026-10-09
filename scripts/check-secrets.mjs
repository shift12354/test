#!/usr/bin/env node
// Enkel hemmelighetssjekk av filer som spores av git. Kjøres før push (se docs/SECURITY.md).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patterns = [
  [/AKIA[0-9A-Z]{16}/, 'AWS-nøkkel'],
  [/xox[abprs]-[0-9A-Za-z-]{10,}/, 'Slack-token'],
  [/gh[pousr]_[0-9A-Za-z]{30,}/, 'GitHub-token'],
  [/github_pat_[0-9A-Za-z_]{30,}/, 'GitHub fine-grained token'],
  [/ya29\.[0-9A-Za-z_-]{20,}/, 'Google access token'],
  [/1\/\/0[0-9A-Za-z_-]{30,}/, 'Google refresh token'],
  [/GOCSPX-[0-9A-Za-z_-]{20,}/, 'Google client secret'],
  [/sk-ant-[0-9A-Za-z_-]{20,}/, 'Anthropic-nøkkel'],
  [/\b\d{8,10}:[0-9A-Za-z_-]{35}\b/, 'Telegram bot-token'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'Privat nøkkel'],
  [/^DASHBOARD_TOKEN=.{8,}$/m, 'DASHBOARD_TOKEN med verdi'],
];

const files = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8' }).split('\n').filter(Boolean);
let found = 0;
for (const f of files) {
  if (/\.(png|jpe?g|gif|ico|woff2?|ttf)$/i.test(f) || f.includes('node_modules/') || f.endsWith('package-lock.json')) continue;
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  for (const [re, label] of patterns) {
    if (re.test(text)) {
      console.error(`✖ ${f}: mulig ${label}`);
      found++;
    }
  }
  if (/^\.env($|\.)/.test(f.split('/').pop()) && !f.endsWith('.env.example')) {
    console.error(`✖ ${f}: .env-fil skal ikke spores av git`);
    found++;
  }
}
if (found) {
  console.error(`\n${found} mulige hemmeligheter funnet. Fjern dem før du pusher.`);
  process.exit(1);
}
console.log(`✔ Ingen hemmeligheter funnet i ${files.length} filer.`);
