import React from "react";
import { useNavigate } from "react-router-dom";
import "./ErrorPage.css";

const ErrorPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate("/");
  };

  return (
    <div className="error-page">
      <div className="error-container">
        <div className="error-code">
          <span>4</span>
          <div className="globe"></div>
          <span>4</span>
        </div>
        <h2 className="error-title">Page Not Found</h2>
        <p className="error-message">The page you're looking for doesn't exist or has been moved.</p>
        <button className="back-button" onClick={handleGoBack}>
          <span className="button-text">Back to Home</span>
          <span className="button-icon">→</span>
        </button>
      </div>
    </div>
  );
};

export default ErrorPage;
