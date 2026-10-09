#!/usr/bin/env node
// Lager .env fra .env.example med en tilfeldig DASHBOARD_TOKEN. Overskriver aldri en eksisterende .env.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) {
  console.log('.env finnes allerede. Lar den være i fred.');
  process.exit(0);
}
const token = randomBytes(32).toString('base64url');
const env = readFileSync('.env.example', 'utf8').replace(/^DASHBOARD_TOKEN=.*$/m, `DASHBOARD_TOKEN=${token}`);
writeFileSync('.env', env, { mode: 0o600 });
console.log('✔ Laget .env med en ny tilfeldig DASHBOARD_TOKEN.');
console.log('  Tokenet står i .env. Bruk det for å logge inn i web- og mobilappen.');
