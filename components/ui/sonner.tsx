"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-emerald-500" />
        ),
        info: (
          <InfoIcon className="size-4 text-blue-500" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-500" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-red-500" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-blue-500" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--glass-bg)",
          "--normal-text": "hsl(var(--foreground))",
          "--normal-border": "var(--glass-border-soft)",
          "--success-bg": "hsla(142, 71%, 45%, 0.15)",
          "--success-text": "hsl(var(--foreground))",
          "--success-border": "hsla(142, 71%, 45%, 0.3)",
          "--error-bg": "hsla(0, 84.2%, 60.2%, 0.15)",
          "--error-text": "hsl(var(--foreground))",
          "--error-border": "hsla(0, 84.2%, 60.2%, 0.3)",
          "--warning-bg": "hsla(38, 92%, 50%, 0.15)",
          "--warning-text": "hsl(var(--foreground))",
          "--warning-border": "hsla(38, 92%, 50%, 0.3)",
          "--info-bg": "hsla(199, 89%, 48%, 0.15)",
          "--info-text": "hsl(var(--foreground))",
          "--info-border": "hsla(199, 89%, 48%, 0.3)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "glass-card group toast group-[.toaster]:rounded-2xl group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-md group-[.toaster]:p-4 group-[.toaster]:text-sm group-[.toaster]:text-foreground group-[.toaster]:border-white/10",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
