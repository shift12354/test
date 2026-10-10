import { ChevronRight } from "lucide-react"

import { LogoMark } from "@/components/site/logo"
import { OpenSheetButton } from "@/components/site/contact-sheet"
import { PillLink } from "@/components/site/pill"
import { Reveal } from "@/components/site/reveal"

export function Closing() {
  return (
    <section aria-labelledby="kontakt" className="px-4 pt-8 pb-24 sm:px-6 sm:pb-32">
      <Reveal className="bg-tile mx-auto flex max-w-5xl flex-col items-center rounded-[2rem] px-6 py-20 text-center sm:py-28">
        <LogoMark className="size-14 rounded-2xl" />
        <h2 id="kontakt" className="type-headline mt-8 text-balance">
          Klar når du er.
        </h2>
        <p className="text-muted-foreground type-subhead mt-4 max-w-xl font-normal text-pretty">
          En uforpliktende prat, så vet du hva det koster og når det kan være klart.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <OpenSheetButton size="lg">Book en prat</OpenSheetButton>
          <PillLink href="#priser" variant="link" className="type-body">
            Se priser
            <ChevronRight aria-hidden="true" />
          </PillLink>
        </div>
      </Reveal>
    </section>
  )
}
