// src/components/ErrorMessage.js
import React from 'react';
import './style/ErrorMessage.css';

const ErrorMessage = ({ message }) => (
  <div className="error-message">{message}</div>
);

export default ErrorMessage;