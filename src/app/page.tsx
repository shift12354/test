import { ScrollProgress } from "@/components/ui/scroll-progress"
import { Contact } from "@/components/site/contact"
import { Features } from "@/components/site/features"
import { Hero } from "@/components/site/hero"
import { LogoCloud } from "@/components/site/logo-cloud"
import { Pricing } from "@/components/site/pricing"
import { Process } from "@/components/site/process"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { Stats } from "@/components/site/stats"
import { Testimonials } from "@/components/site/testimonials"

export default function Home() {
  return (
    <>
      <a
        href="#innhold"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-full px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Hopp til innhold
      </a>
      <ScrollProgress className="from-aurora-1 via-aurora-2 to-aurora-3 h-0.5" />
      <SiteHeader />
      <main id="innhold" className="flex-1 overflow-x-clip">
        <Hero />
        <LogoCloud />
        <Features />
        <Stats />
        <Process />
        <Testimonials />
        <Pricing />
        <Contact />
      </main>
      <SiteFooter />
    </>
  )
}
