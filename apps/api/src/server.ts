import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const cfg = loadConfig();
process.env.TZ = cfg.tz;

try {
  const app = await buildApp({ cfg });
  await app.listen({ port: cfg.port, host: cfg.host });

  // Varsler-agenten sjekker hvert 5. minutt om noe nytt haster.
  if (cfg.push.enabled) {
    setInterval(() => void app.agents.runNotifier(), 5 * 60_000).unref();
  }

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error(`\n✖ ${(err as Error).message}\n`);
  process.exit(1);
}
