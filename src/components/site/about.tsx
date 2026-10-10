import { Section } from "@/components/site/section"

export function About() {
  return (
    <Section id="om-oss" title="Om oss">
      <div className="type-lead max-w-[36ch] space-y-5 font-normal text-pretty">
        <p>
          Nordlys er Sara og Jonas. Vi har laget nettsider i Tromsø siden 2016, mest for reiseliv,
          sjømat og kultur.
        </p>
        <p>
          Kontoret ligger i Storgata. I desember er det mørkt både når vi kommer og når vi går, så
          vi vet hvordan en nettside ser ut på en mobil med lav lysstyrke klokka tre om
          ettermiddagen.
        </p>
      </div>
    </Section>
  )
}
