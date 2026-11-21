// Saving files. Inside the claude.ai viewer pages may not start downloads themselves,
// so we go through the `downloads` capability there and fall back to a plain link elsewhere.
type Downloads = { save: (r: { filename: string; data: string | Blob }) => Promise<unknown> }
type ClaudeWindow = { claude?: { use: (name: string) => Promise<unknown> } }

let downloads: Promise<Downloads | null> | null = null
function getDownloads() {
  if (!downloads) {
    const c = (window as unknown as ClaudeWindow).claude
    downloads = c?.use ? (c.use("downloads") as Promise<Downloads | null>).catch(() => null) : Promise.resolve(null)
  }
  return downloads
}

function dataUrlToBlob(url: string) {
  const [head, body] = url.split(",")
  const mime = head.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream"
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** Returns a short message for the user when the save did not happen, else null. */
export async function saveFile(filename: string, data: string | Blob, opts: { dataUrl?: boolean } = {}): Promise<string | null> {
  const payload = opts.dataUrl && typeof data === "string" ? dataUrlToBlob(data) : data
  const d = await getDownloads()
  if (d) {
    try {
      await d.save({ filename, data: payload })
      return null
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code === "declined") return null
      if (code !== "unavailable" && code !== "not_granted") return "Kunne ikke lagre filen her. Bruk «Kopier prosjektet som tekst» i Fil-menyen."
    }
  }
  const blob = typeof payload === "string" ? new Blob([payload], { type: "text/plain;charset=utf-8" }) : payload
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  return null
}
