import { BorderBeam } from "@/components/ui/border-beam"
import { BlurFade } from "@/components/ui/blur-fade"
import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "@/components/ui/terminal"
import { SectionHeading } from "@/components/site/section-heading"

const STEPS = [
  {
    title: "Idé",
    body: "Vi starter med en prat om hva du vil oppnå — ikke hvilke knapper du vil ha.",
  },
  {
    title: "Design",
    body: "Skisser, prototyper og ekte innhold. Du ser fremgangen hver uke.",
  },
  {
    title: "Lansering",
    body: "Én kommando, og siden er ute i hele verden. Vi følger med etterpå også.",
  },
]

export function Process() {
  return (
    <section aria-labelledby="prosess" className="px-4 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="prosess"
          eyebrow="Prosess"
          title="Fra første idé til lansering på uker, ikke måneder"
        />
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <ol className="flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <BlurFade
                  inView
                  delay={0.1 + i * 0.1}
                  className="hover:bg-accent/50 flex gap-5 rounded-2xl border p-6 transition-colors"
                >
                  <span
                    aria-hidden="true"
                    className="text-aurora-1 font-mono text-sm tabular-nums"
                  >
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground mt-1 text-pretty">{step.body}</p>
                  </div>
                </BlurFade>
              </li>
            ))}
          </ol>

          <BlurFade inView delay={0.2} className="relative mx-auto w-full max-w-lg">
            <div className="relative overflow-hidden rounded-xl">
              <Terminal className="max-w-none font-mono text-sm">
                <TypingAnimation>&gt; npx nordlys@latest deploy</TypingAnimation>
                <AnimatedSpan className="text-emerald-500">✔ Leser nordlys.config.ts</AnimatedSpan>
                <AnimatedSpan className="text-emerald-500">✔ Optimaliserer 214 bilder</AnimatedSpan>
                <AnimatedSpan className="text-emerald-500">✔ Bygger 38 sider</AnimatedSpan>
                <AnimatedSpan className="text-emerald-500">✔ Sjekker tilgjengelighet (WCAG AA)</AnimatedSpan>
                <AnimatedSpan className="text-emerald-500">✔ Distribuerer til 112 byer</AnimatedSpan>
                <AnimatedSpan className="text-sky-500">
                  <span>ℹ Lighthouse: 100 · 100 · 100 · 100</span>
                </AnimatedSpan>
                <TypingAnimation className="text-muted-foreground">
                  Ferdig på 38 s. Siden din lyser nå på https://nordlys.no
                </TypingAnimation>
              </Terminal>
              <BorderBeam duration={8} size={140} colorFrom="#34d399" colorTo="#818cf8" />
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}
