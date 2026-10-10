import { About } from "@/components/site/about"
import { Contact } from "@/components/site/contact"
import { DaylightHero } from "@/components/site/daylight-hero"
import { Pricing } from "@/components/site/pricing"
import { Process } from "@/components/site/process"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { Work } from "@/components/site/work"

export default function Home() {
  return (
    <>
      <a
        href="#innhold"
        className="bg-accent text-accent-foreground sr-only z-50 rounded-full px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Hopp til innhold
      </a>
      <SiteHeader />
      <main id="innhold" className="flex-1">
        <DaylightHero />
        <Work />
        <Process />
        <Pricing />
        <About />
        <Contact />
      </main>
      <SiteFooter />
    </>
  )
}
