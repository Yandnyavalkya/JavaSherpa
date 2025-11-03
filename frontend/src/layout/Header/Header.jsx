import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.scss";
import { removeUser } from "../../utils/localStorage";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    removeUser();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg header shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold fs-4 text-primary" to="/">
          S2P
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
              onClick={handleLogout}
              className="nav-item btn btn-primary ms-lg-3"
            >
              Sign Out
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;
