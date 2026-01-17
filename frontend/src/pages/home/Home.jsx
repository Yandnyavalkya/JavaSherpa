import React from "react";
import { Link } from "react-router-dom";
import "./Home.scss";
import FeaturesSection from "../../components/FeaturesSection/FeaturesSection";
import StarBackground from "../../components/StarBackground/StarBackground";
import { 
  FaJava, 
  FaRocket, 
  FaBullseye, 
  FaMicrophone, 
  FaRobot, 
  FaBook, 
  FaStar,
  FaArrowRight,
  FaEnvelope,
  FaMobileAlt,
  FaBriefcase,
  FaTwitter
} from "react-icons/fa";

const Home = () => {
  return (
    <div className="home-container">
      <StarBackground />
      
      <nav className="home-header">
        <div className="home-header-container">
          <Link to="/" className="home-logo">
            <FaJava className="java-icon" />
            <span className="logo-text">JavaSherpa</span>
          </Link>
          <div className="home-nav-buttons">
            <Link to="/login" className="btn btn-outline-primary">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div className="home-content">
        <div className="home-hero">
          <h1 className="hero-title">
            <span className="gradient-text">JavaSherpa</span>
            <br />
            <span className="hero-subtitle">Your AI-Powered Java Interview Guide</span>
          </h1>
          <p className="hero-description">
            Master Java interviews with our intelligent AI agent. Practice with voice commands, 
            get personalized feedback, and ace your next interview.
          </p>
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary btn-hero">
              <FaRocket className="me-2" /> Start Your Journey
            </Link>
            <Link to="/login" className="btn btn-outline-primary btn-hero">
              Sign In
            </Link>
          </div>
        </div>

        <div className="home-features">
          <FeaturesSection />
        </div>

        <div className="home-info-card">
          <div className="info-card-content">
            <h2 className="info-title">
              <FaStar className="me-2" /> Why Choose JavaSherpa?
            </h2>
            <p className="info-text">
              We're building a platform for students who are ready to <strong>commit, contribute, and grow</strong> — 
              not just add a line to their resume.
            </p>
            <p className="info-text">
              <FaBullseye className="me-2" /> If you want to learn, lead, and be part of something impactful, this is your chance!
            </p>
            <div className="info-highlights">
              <div className="highlight-item">
                <FaMicrophone className="highlight-icon" />
                <span>Voice-Powered Practice</span>
              </div>
              <div className="highlight-item">
                <FaRobot className="highlight-icon" />
                <span>AI-Powered Feedback</span>
              </div>
              <div className="highlight-item">
                <FaBook className="highlight-icon" />
                <span>Comprehensive Prep</span>
              </div>
            </div>
            <Link to="/register" className="btn btn-primary btn-apply">
              <FaArrowRight className="me-2" /> Apply Now
            </Link>
          </div>
        </div>
      </div>

      <footer className="home-footer">
        <div className="footer-container">
          <div className="footer-section">
            <div className="footer-logo">
              <FaJava className="java-icon" />
              <span className="logo-text">JavaSherpa</span>
            </div>
            <p className="footer-description">
              JavaSherpa is a platform focused on hands-on learning, collaboration, 
              and real-world interview preparation.
            </p>
            <p className="footer-email">
              <FaEnvelope className="me-2" /> support@javasherpa.com
            </p>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Connect With Us</h4>
            <div className="social-icons">
              <a href="#" className="social-icon" aria-label="GitHub">
                <FaMobileAlt />
              </a>
              <a href="#" className="social-icon" aria-label="LinkedIn">
                <FaBriefcase />
              </a>
              <a href="#" className="social-icon" aria-label="Twitter">
                <FaTwitter />
              </a>
            </div>
            <Link to="/register" className="btn btn-primary btn-footer">
              Register Now
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 JavaSherpa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
