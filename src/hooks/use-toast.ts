"use client"

import { toast as sonnerToast } from "sonner"

export const useToast = () => {
  return {
    toast: (opts: {
      title?: string
      description?: string
      variant?: "default" | "destructive"
      action?: React.ReactNode
    }) => {
      const { title, description, variant } = opts

      if (variant === "destructive") {
        sonnerToast.error(title || "Error", {
          description,
        })
      } else {
        sonnerToast.success(title || "Success", {
          description,
        })
      }
    },
  }
}

export { sonnerToast as toast }
