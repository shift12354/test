import type { UpdateItem, Weather } from '@life/shared';
import type { Config } from '../config.js';
import { fetchJson, fetchText } from '../lib/http.js';
import { demoGithub, demoNews, demoWeather } from './demo.js';
import type { Connector } from './types.js';
import { truncate } from './util.js';

/** GitHub-varsler. Fine-grained token med kun "notifications: read". */
export function githubConnector(cfg: Config): Connector<'updates'> {
  type Notif = { id: string; reason: string; updated_at: string; subject: { title: string; type: string }; repository: { full_name: string; html_url: string } };
  return {
    id: 'github', name: 'GitHub', kind: 'updates',
    configured: () => Boolean(cfg.githubToken),
    demo: demoGithub,
    async fetchLive() {
      const list = await fetchJson<Notif[]>('GitHub', 'https://api.github.com/notifications?per_page=25', {
        headers: {
          authorization: `Bearer ${cfg.githubToken}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          'user-agent': 'life-dashboard',
        },
      });
      return list.map((n): UpdateItem => ({
        id: `github-${n.id}`, source: 'github', title: n.subject.title, summary: n.repository.full_name,
        url: n.repository.html_url, publishedAt: new Date(n.updated_at).toISOString(), reason: n.reason,
      }));
    },
  };
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();

export function parseRss(xml: string, max = 8): { title: string; link?: string; pubDate?: string; description?: string }[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, max).map((item) => {
    const tag = (t: string) => {
      const m = item.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`));
      return m?.[1] ? decode(m[1]) : undefined;
    };
    return { title: tag('title') ?? '', link: tag('link'), pubDate: tag('pubDate'), description: tag('description') };
  });
}

const safeUrl = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

/** Nyheter fra RSS (standard: NRK toppsaker). Ingen nøkkel trengs. */
export function newsConnector(cfg: Config): Connector<'updates'> {
  return {
    id: 'news', name: 'Nyheter', kind: 'updates',
    // RSS er offentlig, men vi henter kun hvis feeds er satt eksplisitt i .env.
    configured: () => Boolean(process.env.NEWS_FEEDS) && cfg.newsFeeds.length > 0,
    demo: demoNews,
    async fetchLive() {
      const feeds = await Promise.all(cfg.newsFeeds.slice(0, 5).map((f) => fetchText('Nyheter', f)));
      return feeds
        .flatMap((xml, fi) =>
          parseRss(xml).map((it, i): UpdateItem => ({
            id: `news-${fi}-${i}`, source: 'news', title: truncate(it.title, 160),
            summary: it.description ? truncate(it.description, 240) : undefined, url: safeUrl(it.link),
            publishedAt: it.pubDate && !Number.isNaN(Date.parse(it.pubDate)) ? new Date(it.pubDate).toISOString() : new Date().toISOString(),
          })),
        )
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 8);
    },
  };
}

const SYMBOLS: [string, string][] = [
  ['clearsky', 'klarvær'], ['fair', 'lettskyet'], ['partlycloudy', 'delvis skyet'], ['cloudy', 'skyet'],
  ['fog', 'tåke'], ['lightrainshowers', 'lette regnbyger'], ['heavyrainshowers', 'kraftige regnbyger'], ['rainshowers', 'regnbyger'],
  ['lightrain', 'lett regn'], ['heavyrain', 'kraftig regn'], ['rain', 'regn'], ['lightsleet', 'lett sludd'], ['sleet', 'sludd'],
  ['lightsnow', 'lett snø'], ['heavysnow', 'kraftig snø'], ['snow', 'snø'], ['thunder', 'torden'],
];
export const describeSymbol = (code: string) => SYMBOLS.find(([k]) => code.startsWith(k) || code.includes(k))?.[1] ?? code;

/** Vær fra MET Norway (yr). Gratis, krever kun identifiserende User-Agent. */
export function weatherConnector(cfg: Config): Connector<'weather'> {
  type Ts = { time: string; data: { instant: { details: { air_temperature: number } }; next_1_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } }; next_6_hours?: { summary: { symbol_code: string } } } };
  const w = cfg.weather;
  return {
    id: 'weather', name: 'Vær (MET)', kind: 'weather',
    configured: () => Boolean(w.lat && w.lon && w.contact),
    demo: (now) => demoWeather(now, w.place),
    async fetchLive() {
      const lat = Number(w.lat).toFixed(4);
      const lon = Number(w.lon).toFixed(4);
      const res = await fetchJson<{ properties: { timeseries: Ts[] } }>(
        'MET',
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
        { headers: { 'user-agent': `life-dashboard/0.1 ${w.contact}` } },
      );
      const ts = res.properties.timeseries;
      const now = ts[0];
      if (!now) return null;
      const next24 = ts.slice(0, 24);
      const temps = next24.map((t) => t.data.instant.details.air_temperature);
      const symbol = now.data.next_1_hours?.summary.symbol_code ?? now.data.next_6_hours?.summary.symbol_code ?? 'cloudy';
      const precip = ts.slice(0, 12).reduce((s, t) => s + (t.data.next_1_hours?.details.precipitation_amount ?? 0), 0);
      const weather: Weather = {
        place: w.place, temperature: Math.round(now.data.instant.details.air_temperature),
        high: Math.round(Math.max(...temps)), low: Math.round(Math.min(...temps)),
        precipitationMm: Math.round(precip * 10) / 10, symbol, description: describeSymbol(symbol), updatedAt: now.time,
      };
      return weather;
    },
  };
}
