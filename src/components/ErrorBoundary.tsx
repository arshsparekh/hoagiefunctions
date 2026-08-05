import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Changing this (e.g. the route path) resets the boundary so navigation recovers. */
  resetKey?: string
}
interface State {
  error: Error | null
  lastKey?: string
}

/**
 * Catches render/runtime errors in the routed page and shows a friendly fallback
 * instead of a blank screen. Resets automatically when the route changes (a new
 * `resetKey`), via getDerivedStateFromProps so no setState-in-lifecycle is needed.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, lastKey: undefined }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.lastKey) {
      return { error: null, lastKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In a real deployment this is where we'd report to Sentry/console.
    console.error('Page error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 pt-16 text-center sm:px-6">
          <h1 className="font-brand text-[22px] font-bold text-pink-900">Something went wrong</h1>
          <p className="mt-2 text-[14px] text-muted">
            This page hit an unexpected error. Try again, or head back to the feed.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-md bg-pink-500 px-4 py-2 text-[14px] font-semibold text-white shadow-hoagie transition-colors hover:bg-pink-600"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-md border border-border bg-white px-4 py-2 text-[14px] font-semibold text-text transition-colors hover:bg-surface"
            >
              Back to feed
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
