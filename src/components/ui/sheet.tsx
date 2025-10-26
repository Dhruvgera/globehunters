"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const easing = [0.22, 1, 0.36, 1] as const
  return (
    <SheetPrimitive.Overlay asChild {...props}>
      <motion.div
        ref={ref as unknown as React.Ref<HTMLDivElement>}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: easing }}
        className={cn("fixed inset-0 z-50 bg-black/70", className)}
        data-lenis-prevent
      />
    </SheetPrimitive.Overlay>
  )
})
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: "top" | "bottom" | "left" | "right"
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const getAnimationProps = () => {
    const easing = [0.22, 1, 0.36, 1] as const
    switch (side) {
      case "bottom":
        return {
          initial: { opacity: 0, y: "100%" },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: "100%" },
          transition: { duration: 0.3, ease: easing },
          className: "inset-x-0 bottom-0 border-t",
        }
      case "top":
        return {
          initial: { opacity: 0, y: "-100%" },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: "-100%" },
          transition: { duration: 0.3, ease: easing },
          className: "inset-x-0 top-0 border-b",
        }
      case "left":
        return {
          initial: { opacity: 0, x: "-100%" },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: "-100%" },
          transition: { duration: 0.3, ease: easing },
          className: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        }
      case "right":
        return {
          initial: { opacity: 0, x: "100%" },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: "100%" },
          transition: { duration: 0.3, ease: easing },
          className: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
        }
    }
  }

  const animationProps = getAnimationProps()

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content asChild {...props}>
        <motion.div
          ref={ref as unknown as React.Ref<HTMLDivElement>}
          initial={animationProps.initial}
          animate={animationProps.animate}
          exit={animationProps.exit}
          transition={animationProps.transition}
          className={cn(
            "fixed z-50 gap-4 bg-white p-6 shadow-lg",
            animationProps.className,
            className
          )}
          data-lenis-prevent
        >
          {children}
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </motion.div>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-gray-950", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
