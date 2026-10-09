export function ttlCache<T>(ttlMs: number, load: () => Promise<T>) {
  let value: { v: T; at: number } | null = null;
  let inflight: Promise<T> | null = null;
  return {
    async get(force = false): Promise<T> {
      if (!force && value && Date.now() - value.at < ttlMs) return value.v;
      inflight ??= load()
        .then((v) => {
          value = { v, at: Date.now() };
          return v;
        })
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
    clear() {
      value = null;
    },
  };
}
