"use client"

import { useRef } from "react"
import { GitHubLogoIcon } from "@radix-ui/react-icons"
import {
  BarChart3,
  CreditCard,
  Database,
  Mail,
  MessageSquare,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { LogoMark } from "@/components/site/logo"

function Node({
  ref,
  className,
  Icon,
  label,
}: {
  ref: React.Ref<HTMLDivElement>
  className?: string
  Icon?: React.ElementType
  label: string
}) {
  return (
    <div
      ref={ref}
      title={label}
      className={cn(
        "bg-background z-10 flex size-12 items-center justify-center rounded-full border-2 p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-5" /> : null}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function IntegrationsBeam({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const left1 = useRef<HTMLDivElement>(null)
  const left2 = useRef<HTMLDivElement>(null)
  const left3 = useRef<HTMLDivElement>(null)
  const center = useRef<HTMLDivElement>(null)
  const right1 = useRef<HTMLDivElement>(null)
  const right2 = useRef<HTMLDivElement>(null)
  const right3 = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full max-w-lg items-center justify-between px-6 py-10",
        className
      )}
    >
      <div className="flex flex-col justify-center gap-6">
        <Node ref={left1} Icon={GitHubLogoIcon} label="GitHub" />
        <Node ref={left2} Icon={Database} label="Database" />
        <Node ref={left3} Icon={CreditCard} label="Betaling" />
      </div>
      <div
        ref={center}
        className="bg-background z-10 flex size-16 items-center justify-center rounded-2xl border-2 shadow-[0_0_40px_-12px_var(--aurora-1)]"
      >
        <LogoMark className="size-8" />
        <span className="sr-only">Nordlys</span>
      </div>
      <div className="flex flex-col justify-center gap-6">
        <Node ref={right1} Icon={Mail} label="E-post" />
        <Node ref={right2} Icon={MessageSquare} label="Chat" />
        <Node ref={right3} Icon={BarChart3} label="Analyse" />
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={left1}
        toRef={center}
        curvature={40}
        gradientStartColor="#34d399"
        gradientStopColor="#22d3ee"
        delay={0}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={left2}
        toRef={center}
        curvature={0}
        gradientStartColor="#34d399"
        gradientStopColor="#22d3ee"
        delay={0.4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={left3}
        toRef={center}
        curvature={-40}
        gradientStartColor="#34d399"
        gradientStopColor="#22d3ee"
        delay={0.8}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={center}
        toRef={right1}
        curvature={40}
        gradientStartColor="#818cf8"
        gradientStopColor="#e879f9"
        delay={0.2}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={center}
        toRef={right2}
        curvature={0}
        gradientStartColor="#818cf8"
        gradientStopColor="#e879f9"
        delay={0.6}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={center}
        toRef={right3}
        curvature={-40}
        gradientStartColor="#818cf8"
        gradientStopColor="#e879f9"
        delay={1}
      />
    </div>
  )
}
