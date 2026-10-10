"use client"

import { useState } from "react"

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"

export function ContactForm() {
  const [sent, setSent] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Demo only: no backend — just confirm to the visitor.
    setSent(true)
  }

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        className="bg-background/70 focus-within:ring-ring/40 flex flex-col gap-2 rounded-3xl border p-2 backdrop-blur transition-shadow focus-within:ring-[3px] sm:flex-row sm:rounded-full"
      >
        <label htmlFor="kontakt-epost" className="sr-only">
          E-postadresse
        </label>
        <input
          id="kontakt-epost"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          placeholder="deg@firma.no…"
          className="placeholder:text-muted-foreground min-w-0 flex-1 rounded-full bg-transparent px-4 py-2.5 text-base outline-none"
        />
        <InteractiveHoverButton type="submit" className="shrink-0 py-2.5">
          Book en prat
        </InteractiveHoverButton>
      </form>
      <p aria-live="polite" className="text-muted-foreground mt-3 min-h-5 text-center text-sm">
        {sent ? "Takk! Vi svarer innen én arbeidsdag." : ""}
      </p>
    </div>
  )
}
