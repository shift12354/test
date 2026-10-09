import { mkdir, readFile, rename, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Alarm, type AlarmInput } from '@life/shared';
import { z } from 'zod';

const StoreShape = z.object({
  alarms: z.array(Alarm),
  pushTokens: z.array(z.string()),
});
type StoreShape = z.infer<typeof StoreShape>;

const DEFAULTS: StoreShape = {
  alarms: [
    { id: 'hverdag', time: '07:00', days: [1, 2, 3, 4, 5], label: 'Jobb', enabled: true, briefing: true },
    { id: 'helg', time: '09:00', days: [0, 6], label: 'Sovemorgen', enabled: false, briefing: true },
  ],
  pushTokens: [],
};

/** Liten JSON-fil-lagring. Filen får rettighet 600 (bare eieren kan lese). */
export class Store {
  private data: StoreShape | null = null;
  private writing: Promise<void> = Promise.resolve();
  private readonly file: string;

  constructor(dir: string) {
    this.file = path.join(dir, 'store.json');
  }

  private async load(): Promise<StoreShape> {
    if (this.data) return this.data;
    try {
      this.data = StoreShape.parse(JSON.parse(await readFile(this.file, 'utf8')));
    } catch {
      this.data = structuredClone(DEFAULTS);
    }
    return this.data;
  }

  private async save(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.writing = this.writing.then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await writeFile(tmp, snapshot, { mode: 0o600 });
      await rename(tmp, this.file);
      await chmod(this.file, 0o600);
    });
    return this.writing;
  }

  async listAlarms(): Promise<Alarm[]> {
    return [...(await this.load()).alarms].sort((a, b) => a.time.localeCompare(b.time));
  }

  async createAlarm(input: AlarmInput): Promise<Alarm> {
    const d = await this.load();
    if (d.alarms.length >= 50) throw new Error('For mange alarmer');
    const alarm = { ...input, id: randomUUID() };
    d.alarms.push(alarm);
    await this.save();
    return alarm;
  }

  async updateAlarm(id: string, input: AlarmInput): Promise<Alarm | null> {
    const d = await this.load();
    const i = d.alarms.findIndex((a) => a.id === id);
    if (i < 0) return null;
    const alarm = { ...input, id };
    d.alarms[i] = alarm;
    await this.save();
    return alarm;
  }

  async deleteAlarm(id: string): Promise<boolean> {
    const d = await this.load();
    const before = d.alarms.length;
    d.alarms = d.alarms.filter((a) => a.id !== id);
    if (d.alarms.length === before) return false;
    await this.save();
    return true;
  }

  async pushTokens(): Promise<string[]> {
    return [...(await this.load()).pushTokens];
  }

  async addPushToken(token: string): Promise<void> {
    const d = await this.load();
    if (!d.pushTokens.includes(token)) {
      d.pushTokens = [...d.pushTokens, token].slice(-10);
      await this.save();
    }
  }

  async removePushToken(token: string): Promise<void> {
    const d = await this.load();
    d.pushTokens = d.pushTokens.filter((t) => t !== token);
    await this.save();
  }
}
