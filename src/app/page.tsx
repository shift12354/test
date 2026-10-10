import { Closing } from "@/components/site/closing"
import { Hero } from "@/components/site/hero"
import { Highlights } from "@/components/site/highlights"
import { Pricing } from "@/components/site/pricing"
import { Process } from "@/components/site/process"
import { Quote } from "@/components/site/quote"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { Work } from "@/components/site/work"

export default function Home() {
  return (
    <>
      <a
        href="#innhold"
        className="bg-accent text-accent-foreground sr-only z-50 rounded-full px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Hopp til innhold
      </a>
      <SiteHeader />
      <main id="innhold" className="flex-1">
        <Hero />
        <Work />
        <Highlights />
        <Process />
        <Quote />
        <Pricing />
        <Closing />
      </main>
      <SiteFooter />
    </>
  )
}
