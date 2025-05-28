import React from 'react';
import './style/ErrorMessage.css';

function ErrorMessage({ message }) {
  return <div className="error-message">Error: {message}</div>;
}

export default ErrorMessage;