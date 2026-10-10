import { ArrowRightIcon } from "@radix-ui/react-icons"

import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { AuroraText } from "@/components/ui/aurora-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Particles } from "@/components/ui/particles"
import { WordRotate } from "@/components/ui/word-rotate"
import { HeroCta } from "@/components/site/hero-cta"

const AURORA_COLORS = ["#34d399", "#22d3ee", "#818cf8", "#e879f9"]
const ROTATING_WORDS = ["raske", "vakre", "tilgjengelige", "levende"]

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh items-center overflow-hidden px-4 pt-32 pb-24"
    >
      {/* Aurora glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[36rem] max-w-5xl opacity-60 blur-3xl dark:opacity-40"
      >
        <div className="bg-aurora-1 absolute top-10 left-[15%] size-80 rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="bg-aurora-2 absolute top-24 left-[40%] size-96 rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="bg-aurora-3 absolute top-4 right-[12%] size-80 rounded-full mix-blend-multiply dark:mix-blend-screen" />
      </div>
      <Particles
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        quantity={90}
        ease={80}
        color="#9ca3af"
        refresh
      />

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <BlurFade delay={0.1} inView>
          <a
            href="#prosess"
            className="group bg-background/60 hover:bg-accent focus-visible:ring-ring/50 inline-flex rounded-full border text-sm backdrop-blur transition-colors outline-none focus-visible:ring-[3px]"
          >
            <AnimatedShinyText className="inline-flex items-center justify-center gap-1 px-4 py-1.5">
              <span aria-hidden="true">✨</span> Nytt: Nordlys&nbsp;2.0 er her
              <ArrowRightIcon
                aria-hidden="true"
                className="ms-1 size-3 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </AnimatedShinyText>
          </a>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <h1
            id="hero-title"
            className="mt-8 text-5xl font-semibold tracking-tighter text-balance sm:text-7xl md:text-8xl"
          >
            Nettsider som lyser som{" "}
            <AuroraText colors={AURORA_COLORS} className="font-serif font-normal italic">
              nordlys
            </AuroraText>
          </h1>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <p className="text-muted-foreground mt-4 max-w-xl text-lg text-pretty sm:text-xl">
            Vi bygger{" "}
            <WordRotate
              words={ROTATING_WORDS}
              duration={2600}
              className="text-foreground font-medium"
            />{" "}
            nettsider
            <br />
            for team som bryr seg om detaljene.
          </p>
        </BlurFade>

        <BlurFade delay={0.4} inView>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <HeroCta />
            <Button asChild variant="ghost" size="lg" className="h-12 rounded-full px-6 text-base">
              <a href="#funksjoner">
                Se hva vi gjør
                <ArrowRightIcon aria-hidden="true" />
              </a>
            </Button>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
