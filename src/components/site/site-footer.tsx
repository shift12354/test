import { Logo } from "@/components/site/logo"

export function SiteFooter() {
  return (
    <footer className="border-t px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
        <Logo className="text-foreground" />
        <p>Laget med Magic UI og Next.js · Et fiktivt studio for demo</p>
      </div>
    </footer>
  )
}
