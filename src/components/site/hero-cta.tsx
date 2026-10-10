"use client"

import { ShimmerButton } from "@/components/ui/shimmer-button"

// Jumps to the contact form and puts the cursor in the email field.
function focusContactForm() {
  const input = document.getElementById("kontakt-epost")
  if (!input) return
  input.scrollIntoView({ behavior: "smooth", block: "center" })
  input.focus({ preventScroll: true })
}

export function HeroCta() {
  return (
    <ShimmerButton
      type="button"
      onClick={focusContactForm}
      className="focus-visible:ring-ring/50 h-12 px-7 text-base font-medium shadow-2xl outline-none focus-visible:ring-[3px]"
      shimmerColor="#a7f3d0"
      background="oklch(0.17 0.03 265)"
    >
      Start et prosjekt
    </ShimmerButton>
  )
}
