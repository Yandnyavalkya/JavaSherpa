import React, { useState } from "react";
import "./Login.scss";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { notifyApiError, notifyError, notifyInfo, notifySuccess, notifyWarning } from "../../utils/notify";
import ApiService from "../../services/Api.service";
import StarBackground from "../../components/StarBackground/StarBackground";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password / OTP reset state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [fpStep, setFpStep] = useState("email"); // 'email' | 'verify'
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpLoading, setFpLoading] = useState(false);

  let navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openForgotPassword = () => {
    setFpEmail(formData.email || "");
    setFpOtp("");
    setFpNewPassword("");
    setFpConfirmPassword("");
    setFpStep("email");
    setShowForgotModal(true);
  };

  const closeForgotPassword = () => {
    setShowForgotModal(false);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const email = fpEmail.trim();
    if (!email) {
      notifyWarning("Please enter your registered email.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      notifyWarning("Please enter a valid email address.");
      return;
    }
    setFpLoading(true);
    const { data, error } = await ApiService.requestPasswordReset(email);
    setFpLoading(false);
    if (error) {
      const message = error.response?.data?.message || "Failed to send OTP.";
      notifyApiError(error, message);
      return;
    }
    notifySuccess(data?.message || "OTP sent to your email.");
    setFpStep("verify");
  };

  const handleResetWithOtp = async (e) => {
    e.preventDefault();
    const email = fpEmail.trim();
    if (!email || !fpOtp.trim() || !fpNewPassword || !fpConfirmPassword) {
      notifyWarning("Please fill in all fields.");
      return;
    }
    if (fpNewPassword.length < 6) {
      notifyWarning("Password should be at least 6 characters.");
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      notifyWarning("New password and confirm password do not match.");
      return;
    }
    setFpLoading(true);
    const { data, error } = await ApiService.resetPasswordWithOtp({
      email,
      otp: fpOtp.trim(),
      newPassword: fpNewPassword,
      confirmPassword: fpConfirmPassword,
    });
    setFpLoading(false);
    if (error) {
      const message = error.response?.data?.message || "Failed to reset password.";
      notifyApiError(error, message);
      return;
    }
    notifySuccess(data?.message || "Password reset successfully. You can now log in.");
    setShowForgotModal(false);
    setFormData((prev) => ({ ...prev, email, password: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { email, password } = formData;

    if (!email || !password) {
      notifyWarning("Please fill in all fields.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      notifyWarning("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    let { data, error } = await ApiService.login(formData);

    setLoading(false);

    if (error) {
      const backendMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      const normalized = backendMessage.toLowerCase();

      if (normalized.includes("user not found")) {
        notifyError(
          "We couldn't find an account with this email. You can register for a new account from the Register page."
        );
      } else if (normalized.includes("password is incorrect")) {
        notifyError(
          "Incorrect password. You can reset it using 'Forgot password?' to receive an OTP on your registered email."
        );
      } else {
        notifyError(backendMessage);
      }
      return;
    }

    if (data) {
      notifySuccess(data.message || "Logged in successfully.");
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
                <button
                  type="button"
                  className="forgot-link"
                  onClick={openForgotPassword}
                >
                  Forgot password?
                </button>
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

            {showForgotModal && (
              <div className="forgot-modal-backdrop">
                <div className="forgot-modal">
                  <h3 className="forgot-modal-title">Reset Password</h3>
                  <p className="forgot-modal-subtitle">
                    {fpStep === "email"
                      ? "Enter your registered email to receive an OTP."
                      : "Enter the OTP sent to your email and choose a new password."}
                  </p>

                  <form
                    onSubmit={fpStep === "email" ? handleSendOtp : handleResetWithOtp}
                  >
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={fpEmail}
                        onChange={(e) => setFpEmail(e.target.value)}
                        disabled={fpStep === "verify"}
                        placeholder="Registered email"
                      />
                    </div>

                    {fpStep === "verify" && (
                      <>
                        <div className="form-group">
                          <label className="form-label">OTP</label>
                          <input
                            type="text"
                            className="form-control"
                            value={fpOtp}
                            onChange={(e) => setFpOtp(e.target.value)}
                            placeholder="Enter OTP from email"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">New Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={fpNewPassword}
                            onChange={(e) => setFpNewPassword(e.target.value)}
                            placeholder="New password"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Confirm New Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={fpConfirmPassword}
                            onChange={(e) => setFpConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                          />
                        </div>
                      </>
                    )}

                    <div className="forgot-modal-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={closeForgotPassword}
                        disabled={fpLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={fpLoading}
                      >
                        {fpLoading
                          ? fpStep === "email"
                            ? "Sending OTP..."
                            : "Resetting..."
                          : fpStep === "email"
                          ? "Send OTP"
                          : "Reset Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
