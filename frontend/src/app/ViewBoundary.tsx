import { Component } from 'react'
import type { ReactNode } from 'react'
import { ErrorState } from '../components/States'

interface State {
  error: unknown
}

/** Keeps the shell and filters alive when a single view fails to render. */
export class ViewBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  render() {
    if (this.state.error) return <ErrorState error={this.state.error} onRetry={() => this.setState({ error: null })} />
    return this.props.children
  }
}
