import React from 'react';

// Safety net for lazy-chunk failures that survive the one-time reload in
// lazyWithRetry. Catches the render-time throw and offers a manual reload
// instead of leaving a blank screen.
class ChunkErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    handleReload = () => {
        window.sessionStorage.removeItem('chunk-reload-attempted');
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="chunk-error">
                    <h2>Something went wrong loading this page</h2>
                    <p>A new version may be available. Please reload to continue.</p>
                    <button type="button" onClick={this.handleReload}>Reload</button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ChunkErrorBoundary;
