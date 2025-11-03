import React, { useState } from "react";
import "./Register.scss";
import { Link, useNavigate } from "react-router-dom";
import ApiService from "../../services/Api.service";
import { toast } from "react-toastify";
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
    <div className="register-container d-flex align-items-center justify-content-center vh-100">
      <div className="register-card shadow-lg p-4 rounded-4">
        <h3 className="text-center fw-bold mb-2">Create Your Account 🚀</h3>
        <p className="text-center text-muted mb-4">
          Join us and start your journey today!
        </p>

        <form>
          <div className="mb-3">
            <label className="form-label fw-semibold">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-control form-control-lg"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              name="email"
              className="form-control form-control-lg"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Phone</label>
            <input
              type="number"
              name="phone_number"
              className="form-control form-control-lg"
              placeholder="Enter your phone number"
              value={formData.phone_number}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Company</label>
            <input
              type="text"
              name="company_name"
              className="form-control form-control-lg"
              placeholder="Enter your company name"
              value={formData.company_name}
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
            onClick={handleSubmit}
            type="submit"
            className="btn btn-primary w-100 py-2 mt-2 d-flex align-items-center justify-content-center"
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

          <div className="text-center mt-3">
            <p className="small text-muted">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-decoration-none fw-bold text-primary"
              >
                Login here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
