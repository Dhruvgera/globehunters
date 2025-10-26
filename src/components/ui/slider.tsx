"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  const thumbCount = Array.isArray(value)
    ? value.length
    : Array.isArray(defaultValue)
    ? defaultValue.length
    : 1

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      value={value as number[] | undefined}
      defaultValue={defaultValue as number[] | undefined}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-5 w-full grow overflow-hidden rounded-lg bg-[#F5F5F5]">
        <SliderPrimitive.Range className="absolute h-full bg-[rgba(55,84,237,0.12)]" />
      </SliderPrimitive.Track>
      {Array.from({ length: Math.max(1, thumbCount) }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block h-5 w-1.5 rounded-md bg-[#3754ED] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3754ED]/30 disabled:pointer-events-none disabled:opacity-50"
          aria-label={thumbCount > 1 ? (i === 0 ? "Minimum" : "Maximum") : "Value"}
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

