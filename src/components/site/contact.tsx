import { CodeIcon, LightningBoltIcon, MixIcon, RocketIcon } from "@radix-ui/react-icons"

import { BlurFade } from "@/components/ui/blur-fade"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { OrbitingCircles } from "@/components/ui/orbiting-circles"
import { ContactForm } from "@/components/site/contact-form"
import { LogoMark } from "@/components/site/logo"

export function Contact() {
  return (
    <section aria-labelledby="kontakt" className="px-4 pt-12 pb-28">
      <div className="bg-card relative isolate mx-auto flex max-w-6xl flex-col items-center overflow-hidden rounded-[2rem] border px-6 py-20 text-center">
        <FlickeringGrid
          aria-hidden="true"
          className="absolute inset-0 -z-10 [mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
          squareSize={4}
          gridGap={6}
          color="#34d399"
          maxOpacity={0.25}
          flickerChance={0.1}
        />

        <div aria-hidden="true" className="relative flex size-64 items-center justify-center">
          <LogoMark className="size-14 rounded-2xl" />
          <OrbitingCircles iconSize={36} radius={100} duration={24}>
            <RocketIcon className="size-5" />
            <CodeIcon className="size-5" />
            <MixIcon className="size-5" />
            <LightningBoltIcon className="size-5" />
          </OrbitingCircles>
        </div>

        <BlurFade inView>
          <h2
            id="kontakt"
            className="mt-4 text-4xl font-semibold tracking-tighter text-balance sm:text-6xl"
          >
            Klar for å{" "}
            <span className="font-serif font-normal italic">lyse opp</span>{" "}
            nettet?
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-lg text-pretty">
            Legg igjen e-posten din, så tar vi en uforpliktende prat om
            prosjektet ditt.
          </p>
        </BlurFade>

        <BlurFade inView delay={0.15} className="mt-8 flex w-full justify-center">
          <ContactForm />
        </BlurFade>
      </div>
    </section>
  )
}
