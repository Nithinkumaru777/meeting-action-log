import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Masthead } from '../ui/primitives';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="view enter" role="alert">
          <Masthead
            eyebrow="Unexpected error"
            title={this.props.fallbackTitle ?? 'Something slipped on this page'}
            dek={
              this.state.error?.message ||
              'An unexpected rendering error occurred. You can reset this view and continue.'
            }
            side={
              <Button variant="primary" icon="undo" onClick={this.handleReset}>
                Try again
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
