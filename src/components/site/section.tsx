import { cn } from "@/lib/utils"

/** Heading in the left column, content on the right; stacked on small screens. */
export function Section({
  id,
  title,
  intro,
  className,
  children,
}: {
  id: string
  title: string
  intro?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className={cn("border-t py-20 sm:py-28", className)}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
        <div>
          <h2 id={id} className="type-headline text-balance">
            {title}
          </h2>
          {intro ? <p className="text-muted-foreground mt-4 max-w-[40ch] text-pretty">{intro}</p> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}
