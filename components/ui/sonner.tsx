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
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "hsl(142.1, 76.2%, 36.3%)",
          "--success-text": "hsl(0, 0%, 98%)",
          "--success-border": "hsl(142.1, 76.2%, 36.3%)",
          "--error-bg": "hsl(0, 84.2%, 60.2%)",
          "--error-text": "hsl(0, 0%, 98%)",
          "--error-border": "hsl(0, 84.2%, 60.2%)",
          "--warning-bg": "hsl(38, 92%, 50%)",
          "--warning-text": "hsl(0, 0%, 98%)",
          "--warning-border": "hsl(38, 92%, 50%)",
          "--info-bg": "hsl(217, 91%, 60%)",
          "--info-text": "hsl(0, 0%, 98%)",
          "--info-border": "hsl(217, 91%, 60%)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          description: "cn-toast-description",
          actionButton: "cn-toast-action-button",
          cancelButton: "cn-toast-cancel-button",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
