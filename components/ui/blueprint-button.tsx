"use client"

import Link from "next/link"
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "outline" | "ghost"
type Size = "sm" | "md"

interface BaseProps {
  variant?: Variant
  size?: Size
  /** Show a small orange particle dot before the label — for primary CTAs that "launch" something. */
  particle?: boolean
  children: ReactNode
}

/** Engineering-style button: hard edges, mono caps, particle-orange when primary. */
export const BlueprintButton = forwardRef<
  HTMLButtonElement,
  BaseProps & ButtonHTMLAttributes<HTMLButtonElement>
>(function BlueprintButton(
  { variant = "outline", size = "md", particle = false, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonClasses(variant, size), className)}
      style={buttonStyle(size)}
      {...props}
    >
      {particle && (
        <span aria-hidden className="inline-block size-2" style={{ backgroundColor: "#E8711A" }} />
      )}
      {children}
    </button>
  )
})

/** Same look as BlueprintButton, but renders as a Link. */
export function BlueprintLink({
  href,
  variant = "outline",
  size = "md",
  particle = false,
  className,
  children,
}: BaseProps & { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(buttonClasses(variant, size), className)}
      style={buttonStyle(size)}
    >
      {particle && (
        <span aria-hidden className="inline-block size-2" style={{ backgroundColor: "#E8711A" }} />
      )}
      {children}
    </Link>
  )
}

function buttonClasses(variant: Variant, size: Size): string {
  const base =
    "inline-flex items-center gap-2.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
  const sizing = size === "sm" ? "px-3.5 py-2" : "px-5 py-2.5"
  const v =
    variant === "primary"
      ? "border border-[#E8711A] bg-[#E8711A] text-white hover:bg-[#D9651A] hover:border-[#D9651A]"
      : variant === "outline"
        ? "border border-[#0F0F0F] bg-white text-[#0F0F0F] hover:bg-[#FAFAFA]"
        : "border border-transparent bg-transparent text-[#666] hover:text-[#0F0F0F] hover:bg-[#FAFAFA]"
  return `${base} ${sizing} ${v}`
}

function buttonStyle(size: Size): React.CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: size === "sm" ? 10 : 11,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  }
}
