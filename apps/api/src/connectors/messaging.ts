import type { MessageItem } from '@life/shared';
import type { Config } from '../config.js';
import { fetchJson, UpstreamError } from '../lib/http.js';
import { demoDiscord, demoSlack, demoTelegram } from './demo.js';
import type { Connector } from './types.js';
import { truncate } from './util.js';

const mentions = (text: string, handles: string[]) => {
  const t = text.toLowerCase();
  return handles.some((h) => t.includes(`@${h.replace(/^@/, '')}`));
};

/** Slack: user-token med search:read. Henter meldinger som nevner deg det siste døgnet. */
export function slackConnector(cfg: Config): Connector<'messages'> {
  type AuthTest = { ok: boolean; user_id?: string; error?: string };
  type Search = {
    ok: boolean; error?: string;
    messages?: { matches: { iid?: string; ts: string; text: string; username?: string; permalink?: string; channel?: { name?: string; is_im?: boolean } }[] };
  };
  const get = <T>(path: string) =>
    fetchJson<T>('Slack', `https://slack.com/api/${path}`, { headers: { authorization: `Bearer ${cfg.slackToken}` } });

  return {
    id: 'slack', name: 'Slack', kind: 'messages',
    configured: () => Boolean(cfg.slackToken),
    demo: demoSlack,
    async fetchLive() {
      const me = await get<AuthTest>('auth.test');
      if (!me.ok || !me.user_id) throw new UpstreamError('Slack', 401);
      const yesterday = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
      const q = encodeURIComponent(`<@${me.user_id}> after:${yesterday}`);
      const res = await get<Search>(`search.messages?query=${q}&count=20&sort=timestamp`);
      if (!res.ok) throw new UpstreamError('Slack', 502);
      return (res.messages?.matches ?? []).map((m): MessageItem => ({
        id: `slack-${m.iid ?? m.ts}`, source: 'slack',
        channel: m.channel?.is_im ? 'DM' : `#${m.channel?.name ?? 'ukjent'}`,
        from: m.username ?? 'ukjent', text: truncate(m.text), sentAt: new Date(Number(m.ts) * 1000).toISOString(),
        unread: true, mentionsMe: true, url: m.permalink,
      }));
    },
  };
}

/** Discord: bot-token. Leser de siste meldingene i kanalene i DISCORD_CHANNEL_IDS. */
export function discordConnector(cfg: Config): Connector<'messages'> {
  type DMsg = { id: string; content: string; timestamp: string; author: { username: string; global_name?: string } };
  type DChannel = { id: string; name?: string; guild_id?: string };
  return {
    id: 'discord', name: 'Discord', kind: 'messages',
    configured: () => Boolean(cfg.discord.token && cfg.discord.channelIds.length),
    demo: demoDiscord,
    async fetchLive() {
      const headers = { authorization: `Bot ${cfg.discord.token}` };
      const since = Date.now() - 86400_000;
      const perChannel = await Promise.all(
        cfg.discord.channelIds.slice(0, 10).map(async (cid) => {
          const id = encodeURIComponent(cid);
          const [ch, msgs] = await Promise.all([
            fetchJson<DChannel>('Discord', `https://discord.com/api/v10/channels/${id}`, { headers }),
            fetchJson<DMsg[]>('Discord', `https://discord.com/api/v10/channels/${id}/messages?limit=20`, { headers }),
          ]);
          return msgs
            .filter((m) => new Date(m.timestamp).getTime() > since)
            .map((m): MessageItem => ({
              id: `discord-${m.id}`, source: 'discord', channel: `#${ch.name ?? cid}`,
              from: m.author.global_name ?? m.author.username, text: truncate(m.content || '(vedlegg)'),
              sentAt: new Date(m.timestamp).toISOString(), unread: true,
              mentionsMe: mentions(m.content, cfg.myHandles),
              url: ch.guild_id ? `https://discord.com/channels/${ch.guild_id}/${ch.id}/${m.id}` : undefined,
            }));
        }),
      );
      return perChannel.flat();
    },
  };
}

/** Telegram: meldinger sendt til boten din (eller i grupper den er med i) det siste døgnet. */
export function telegramConnector(cfg: Config): Connector<'messages'> {
  type Update = {
    update_id: number;
    message?: { message_id: number; date: number; text?: string; caption?: string; from?: { first_name?: string; username?: string }; chat: { id: number; title?: string; first_name?: string; type: string } };
  };
  return {
    id: 'telegram', name: 'Telegram', kind: 'messages',
    configured: () => Boolean(cfg.telegramToken),
    demo: demoTelegram,
    async fetchLive() {
      // Tokenet er en del av URL-en hos Telegram, så vi logger aldri URL-en. UpstreamError inneholder kun status.
      const res = await fetchJson<{ ok: boolean; result: Update[] }>(
        'Telegram',
        `https://api.telegram.org/bot${cfg.telegramToken}/getUpdates?limit=50&allowed_updates=${encodeURIComponent('["message"]')}`,
      );
      return res.result
        .filter((u) => u.message)
        .map((u): MessageItem => {
          const m = u.message!;
          const text = m.text ?? m.caption ?? '(vedlegg)';
          return {
            id: `telegram-${m.chat.id}-${m.message_id}`, source: 'telegram',
            channel: m.chat.title ?? m.chat.first_name ?? 'Privat',
            from: m.from?.first_name ?? m.from?.username ?? 'ukjent', text: truncate(text),
            sentAt: new Date(m.date * 1000).toISOString(), unread: true,
            mentionsMe: m.chat.type === 'private' || mentions(text, cfg.myHandles),
          };
        });
    },
  };
}
