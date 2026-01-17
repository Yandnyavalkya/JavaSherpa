import React from "react";
import { Link } from "react-router-dom";
import "./AuthHeader.scss";
import { FaJava } from "react-icons/fa";

const AuthHeader = () => {
  return (
    <nav className="auth-header">
      <div className="auth-header-container">
        <Link to="/" className="auth-logo">
          <FaJava className="java-icon" />
          <span className="logo-text">JavaSherpa</span>
        </Link>
        <div className="auth-nav-buttons">
          <Link to="/login" className="btn btn-outline-primary">
            Login
          </Link>
          <Link to="/register" className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default AuthHeader;

