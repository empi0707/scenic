import React from "react";
import "./inline-error.scss";

const InlineError = ({ message = "Couldn't load this content.", onRetry }) => (
  <div className="inline-error" role="alert">
    <i className="bx bx-error-circle inline-error__icon" />
    <span className="inline-error__text">{message}</span>
    {onRetry && (
      <button type="button" className="inline-error__retry" onClick={onRetry}>
        <i className="bx bx-refresh" />
        Retry
      </button>
    )}
  </div>
);

export default InlineError;
