import React, { useState } from "react";
import "./Login.scss";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ApiService from "../../services/Api.service";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

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
    <div className="login-container d-flex align-items-center justify-content-center vh-100">
      <div className="login-card shadow-lg p-4 rounded-4">
        <h3 className="text-center mb-4 fw-bold">Welcome Back 👋</h3>
        <form>
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              name="email"
              className="form-control form-control-lg"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              name="password"
              className="form-control form-control-lg"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 mt-2"
            onClick={handleSubmit}
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

          <div className="text-center mt-3">
           
            <p className="text-decoration-none small text-muted mb-0">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-decoration-none fw-bold text-primary"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
