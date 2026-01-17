import React, { useState } from "react";
import "./Register.scss";
import { Link, useNavigate } from "react-router-dom";
import ApiService from "../../services/Api.service";
import { toast } from "react-toastify";
import StarBackground from "../../components/StarBackground/StarBackground";

const Register = () => {
  let navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    company_name: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone_number, company_name, password } = formData;

    if (!name || !email || !phone_number || !company_name || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone_number)) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);

    let { data, error } = await ApiService.register(formData);

    setLoading(false);

    if (error) {
      toast.error(error.response.data.error);
      return;
    }

    if (data) {
      toast.success(data.message);
      navigate("/login");
    }
  };

  return (
    <div className="register-container">
      <StarBackground />
      <div className="register-content">
        <div className="register-center">
          <div className="register-card">
            <h2 className="register-title">Create Your Account</h2>
            <p className="register-subtitle">
              Join us and start your Java interview journey today!
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {formData.email && /\S+@\S+\.\S+/.test(formData.email) && (
                    <span className="input-icon">✓</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  name="phone_number"
                  className="form-control"
                  placeholder="Enter your phone number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company</label>
                <input
                  type="text"
                  name="company_name"
                  className="form-control"
                  placeholder="Enter your company name"
                  value={formData.company_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary register-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </button>

              <div className="login-link">
                <p>
                  Already have an account?{" "}
                  <Link to="/login" className="link-primary">
                    Login here
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

export default Register;
