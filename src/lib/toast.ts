import { create } from 'zustand'

export type ToastVariant = 'success' | 'neutral' | 'danger'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, variant?: ToastVariant) => void
  dismiss: (id: number) => void
}

let nextId = 0

/** App-wide toast queue. Toasts auto-dismiss; `<Toaster/>` (in AppShell) renders them. */
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = 'neutral') => {
    const id = ++nextId
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
