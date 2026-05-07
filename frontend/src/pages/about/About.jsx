import React from "react";
import { Link } from "react-router-dom";
import "./About.scss";
import StarBackground from "../../components/StarBackground/StarBackground";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import Logo from "../../components/Logo/Logo";
import {
  FaEnvelope,
  FaMobileAlt,
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaInstagram,
  FaArrowLeft,
  FaHandshake,
  FaGraduationCap,
} from "react-icons/fa";

import guideSatish from "../../assets/about/guide_satish.png";
import yadnyavalkyaImg from "../../assets/about/yadnyavalkya.png";
import pranayImg from "../../assets/about/pranay.png";
import gauravImg from "../../assets/about/gaurav.png";
import maheshImg from "../../assets/about/mahesh.png";

const ProfileCard = ({ photo, name, designation, email, phone, socials = {} }) => {
  const socialItems = [
    { key: "linkedin", icon: <FaLinkedin />, label: "LinkedIn" },
    { key: "github", icon: <FaGithub />, label: "GitHub" },
    { key: "twitter", icon: <FaTwitter />, label: "X" },
    { key: "instagram", icon: <FaInstagram />, label: "Instagram" },
  ];

  return (
    <div className="profile-card">
      <div className="profile-photo">
        <img src={photo} alt={name} loading="lazy" />
      </div>

      <div className="profile-body">
        <div className="profile-role">{designation}</div>
        <div className="profile-name">{name}</div>

        {(email || phone) && (
          <div className="profile-meta">
            {email && (
              <a className="meta-item" href={`mailto:${email}`} aria-label={`Email ${name}`}>
                <FaEnvelope />
                <span>{email}</span>
              </a>
            )}
            {phone && (
              <a className="meta-item" href={`tel:${phone}`} aria-label={`Call ${name}`}>
                <FaMobileAlt />
                <span>{phone}</span>
              </a>
            )}
          </div>
        )}

        <div className="profile-socials">
          {socialItems.map(({ key, icon, label }) => {
            const url = socials[key];
            if (url) {
              return (
                <a
                  key={key}
                  href={url}
                  className="social"
                  aria-label={`${name} ${label}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {icon}
                </a>
              );
            }

            return (
              <span
                key={key}
                className="social social-disabled"
                aria-label={`${name} ${label} not provided`}
                title={`${label} not provided`}
              >
                {icon}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const About = () => {
  const team = [
    {
      name: "Yadnyavalkya Kailas Dakhore",
      designation: "Project Team Member",
      photo: yadnyavalkyaImg,
      email: "yadnyavalkyakd.a04@gmail.com",
      phone: "+91 9359882005",
      socials: {
        github: "https://github.com/Yandnyavalkya",
        linkedin: "https://www.linkedin.com/in/yadnyavalkya-dakhore-119a3b258/",
        twitter: "https://x.com/yadnya2004?t=8e1G3J9JYv90PaK6X50L6w&s=09",
        instagram: "https://www.instagram.com/yadnya_2004?igsh=MXRyaWwyNGptM203Zg==",
      },
    },
    {
      name: "Pranay Somsing Rathod",
      designation: "Project Team Member",
      photo: pranayImg,
      email: "rpranay238@gmail.com",
      phone: "+91 9322413469",
    },
    {
      name: "Gaurav Arvind Chakkarwar",
      designation: "Project Team Member",
      photo: gauravImg,
      email: "chakkarwargaurav@gmail.com",
      phone: "+91 9322306196",
    },
    {
      name: "Mahesh Vilas Suryawanshi",
      designation: "Project Team Member",
      photo: maheshImg,
      email: "surywanshim786@gmail.com",
      phone: "+91 7218547798",
    },
  ];

  return (
    <div className="about-container">
      <StarBackground />

      <nav className="about-header">
        <div className="about-header-container">
          <Link to="/" className="about-logo" aria-label="Go to home">
            <Logo size="medium" />
          </Link>
          <div className="about-header-actions">
            <ThemeToggle />
            <Link to="/" className="btn btn-outline-primary">
              <FaArrowLeft className="me-2" />
              Back
            </Link>
          </div>
        </div>
      </nav>

      <div className="about-content">
        <header className="about-hero">
          <div className="about-hero-badge">
            <FaGraduationCap className="me-2" />
            Final Year Project
          </div>
          <h1 className="about-title">About JavaSherpa</h1>
          <p className="about-subtitle">
            JavaSherpa is a final year project guided and sponsored by <strong>S2P</strong>. We
            sincerely thank S2P for their guidance and support throughout the project journey.
          </p>
          <div className="about-thanks">
            <FaHandshake className="me-2" />
            Thank you, S2P — for the mentorship, guidance, and sponsorship.
          </div>
        </header>

        <section className="about-section">
          <h2 className="section-title">Project Guide</h2>
          <div className="cards-grid single">
            <ProfileCard
              photo={guideSatish}
              name="Dr. Satish R. Jadhao"
              designation="Assistant Professor (CSE), BNCOE, Pusad"
              email="satishjadhao@rediffmail.com"
              phone="+91 9764996768"
            />
          </div>
        </section>

        <section className="about-section">
          <h2 className="section-title">Project Team</h2>
          <div className="cards-grid">
            {team.map((m) => (
              <ProfileCard key={m.email || m.name} {...m} />
            ))}
          </div>
        </section>
      </div>

      <footer className="about-footer">
        <div className="about-footer-inner">
          <p>© 2026 JavaSherpa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default About;

