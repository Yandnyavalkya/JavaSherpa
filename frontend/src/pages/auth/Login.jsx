import React, { useState } from "react";
import "./Login.scss";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ApiService from "../../services/Api.service";
import StarBackground from "../../components/StarBackground/StarBackground";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  let navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { email, password } = formData;

    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    let { data, error } = await ApiService.login(formData);

    setLoading(false);

    if (error) {
      toast.error(error.response.data.message);
      return;
    }

    if (data) {
      toast.success(data.message);
      navigate("/default");
    }
  };

  return (
    <div className="login-container">
      <StarBackground />
      <div className="theme-toggle-wrapper">
        <ThemeToggle />
      </div>
      <div className="login-content">
        <div className="login-center">
          <div className="login-card">
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Sign in to continue your Java interview journey</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {formData.email && /\S+@\S+\.\S+/.test(formData.email) && (
                    <span className="input-icon">✓</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="form-control"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="forgot-password">
                <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="btn btn-primary login-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Login...
                  </>
                ) : (
                  "Login"
                )}
              </button>

              <div className="signup-link">
                <p>
                  Don't have an account?{" "}
                  <Link to="/register" className="link-primary">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
            <div className="back-to-home">
              <Link to="/" className="back-link">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
