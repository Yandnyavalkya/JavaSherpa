import React from "react";
import { Link } from "react-router-dom";
import "./Home.scss";
import StarBackground from "../../components/StarBackground/StarBackground";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import Logo from "../../components/Logo/Logo";
import {
  FaRocket,
  FaMicrophone,
  FaRobot,
  FaBook,
  FaStar,
  FaArrowRight,
  FaEnvelope,
  FaMobileAlt,
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaInstagram,
} from "react-icons/fa";

const Home = () => {
  return (
    <div className="home-container">
      <StarBackground />
      
      <nav className="home-header">
        <div className="home-header-container">
          <Link to="/" className="home-logo">
            <Logo size="medium" />
          </Link>
          <div className="home-nav-buttons">
            <ThemeToggle />
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
            <div className="hero-logo">
              <Logo size="large" showText={false} />
            </div>
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

        <div className="home-cards-section">
          <div className="home-cards-grid">
            <div className="profile-card home-feature-card">
              <div className="profile-photo home-feature-photo" aria-hidden="true">
                <FaMicrophone />
              </div>
              <div className="profile-body">
                <div className="profile-role">Voice-Powered Practice</div>
                <div className="profile-name">Speak like you mean it</div>
                <p className="home-card-description">
                  Practice Java interviews with voice commands and real-time simulation.
                </p>

                <div className="home-highlights">
                  <div className="highlight-item">
                    <FaMicrophone className="highlight-icon" />
                    <span>Voice-Powered Practice</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-card home-feature-card">
              <div className="profile-photo home-feature-photo" aria-hidden="true">
                <FaRobot />
              </div>
              <div className="profile-body">
                <div className="profile-role">AI Interview Agent</div>
                <div className="profile-name">Get actionable feedback</div>
                <p className="home-card-description">
                  Receive structured improvements so your answers get stronger every attempt.
                </p>

                <div className="home-highlights">
                  <div className="highlight-item">
                    <FaRobot className="highlight-icon" />
                    <span>AI-Powered Feedback</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-card home-feature-card">
              <div className="profile-photo home-feature-photo" aria-hidden="true">
                <FaBook />
              </div>
              <div className="profile-body">
                <div className="profile-role">Comprehensive Prep</div>
                <div className="profile-name">Learn patterns + best practices</div>
                <p className="home-card-description">
                  Access guided interview prep focused on Java concepts and communication clarity.
                </p>

                <div className="home-highlights">
                  <div className="highlight-item">
                    <FaBook className="highlight-icon" />
                    <span>Comprehensive Prep</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-card home-feature-card home-why-card">
              <div className="profile-photo home-feature-photo" aria-hidden="true">
                <FaStar />
              </div>
              <div className="profile-body home-why-body">
                <div className="profile-role">Why JavaSherpa?</div>
                <div className="profile-name">Commit. Contribute. Grow.</div>
                <p className="home-card-description home-card-description--left">
                  JavaSherpa is for students ready to practice with purpose—not just memorize answers.
                </p>

                <div className="home-cta">
                  <Link to="/about" className="btn btn-primary home-cta-btn">
                    <FaArrowRight className="me-2" /> About Us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="home-footer">
        <div className="footer-container">
          <div className="footer-section">
            <div className="footer-logo">
              <Logo size="small" />
            </div>
            <p className="footer-description">
              JavaSherpa is a platform focused on hands-on learning, collaboration, 
              and real-world interview preparation.
            </p>
            <p className="footer-email">
              <FaEnvelope className="me-2" /> javasherpa247@gmail.com
            </p>
            <p className="footer-email">
              <FaMobileAlt className="me-2" /> +91 9359882005
            </p>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Connect With Us</h4>
            <div className="social-icons">
              <a
                href="https://github.com/Yandnyavalkya"
                className="social-icon"
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaGithub />
              </a>
              <a
                href="https://www.linkedin.com/in/yadnyavalkya-dakhore-119a3b258/"
                className="social-icon"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaLinkedin />
              </a>
              <a
                href="https://x.com/yadnya2004?t=8e1G3J9JYv90PaK6X50L6w&s=09"
                className="social-icon"
                aria-label="X (Twitter)"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTwitter />
              </a>
              <a
                href="https://www.instagram.com/yadnya_2004?igsh=MXRyaWwyNGptM203Zg=="
                className="social-icon"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaInstagram />
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
