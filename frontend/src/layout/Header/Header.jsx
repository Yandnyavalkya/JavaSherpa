import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.scss";
import { removeUser } from "../../utils/localStorage";
import { getVariable } from "../../utils/localStorage";
import SettingsModal from "../../components/settings.modal";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    removeUser();
    navigate("/login");
  };

  useEffect(() => {
    const saved = getVariable("app_settings");
    const theme = saved?.theme === "dark" ? "dark" : "light";
    try {
      document.documentElement.setAttribute("data-bs-theme", theme);
    } catch (_) {}
  }, []);

  return (
    <>
      <nav className="navbar navbar-expand-lg header shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold fs-4 text-primary" to="/default/bot-list">
            <span className="java-icon">☕</span> JavaSherpa
          </Link>

          <button
            className="navbar-toggler border-0"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            className="collapse navbar-collapse justify-content-end"
            id="navbarNav"
          >
            <ul className="navbar-nav align-items-lg-center">
              <li className="nav-item">
                <Link
                  to="/default/bot-list"
                  className={`nav-link ${
                    location.pathname === "/" ? "active" : ""
                  }`}
                >
                  Home
                </Link>
              </li>

              <li
                className="nav-item btn btn-outline-secondary ms-lg-3"
                onClick={() => setShowSettings(true)}
              >
                Settings
              </li>

              <li
                onClick={handleLogout}
                className="nav-item btn btn-primary ms-lg-3"
              >
                Sign Out
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
};

export default Header;
