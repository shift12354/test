import { OpenSheetButton } from "@/components/site/contact-sheet"
import { Section } from "@/components/site/section"

export function Contact() {
  return (
    <Section id="kontakt" title="Ta kontakt">
      <p className="type-lead max-w-[36ch] font-normal text-pretty">
        Skriv til{" "}
        <a
          href="mailto:hei@nordlys.example"
          className="text-link focus-visible:ring-ring rounded-sm font-semibold underline decoration-2 underline-offset-4 outline-none focus-visible:ring-4"
        >
          hei@nordlys.example
        </a>
        , eller book en prat her. Vi svarer innen én arbeidsdag.
      </p>
      <OpenSheetButton size="lg" className="mt-8">
        Book en prat
      </OpenSheetButton>
    </Section>
  )
}
