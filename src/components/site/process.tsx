import { Section } from "@/components/site/section"

const STEPS = [
  {
    when: "Uke 1",
    text: "Vi kommer på besøk, eller tar en videosamtale hvis dere holder til langt unna. Vi vil se hvordan dere jobber og høre hva kundene spør om.",
  },
  {
    when: "Uke 2 til 4",
    text: "Vi lager en prototype med ekte tekst og bilder. Dere prøver den på mobilen og sier fra om det som skurrer.",
  },
  {
    when: "Uke 5",
    text: "Siden går ut. Den første måneden følger vi med og retter det som dukker opp.",
  },
  {
    when: "Før hver sesong",
    text: "Før vinteren og før sommeren går vi gjennom siden med dere og bytter ut priser, bilder og tekster som har gått ut på dato.",
  },
]

export function Process() {
  return (
    <Section id="prosess" title="Slik jobber vi" intro="En vanlig nettside tar rundt fem uker fra første møte til den er ute.">
      <ol className="border-l-2 border-current/15">
        {STEPS.map((step) => (
          <li key={step.when} className="relative pb-10 pl-8 last:pb-0">
            <span aria-hidden="true" className="bg-lavsol absolute top-2 -left-[7px] size-3 rounded-full" />
            <h3 className="type-small font-bold">{step.when}</h3>
            <p className="mt-1 max-w-[56ch] text-pretty">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
