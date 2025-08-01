import React, { useState } from "react";
import {
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
} from "@mui/material";
import { PersonAdd as RegisterIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import styles from "./styles/Register.module.css";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { register } = useAppContext();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    const result = await register(formData.name, formData.email, formData.password);
    
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <Paper elevation={2} className={styles.formPaper}>
          <div className={styles.header}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/")}
              className={styles.backButton}
            >
              Back to Home
            </Button>
            
            <Typography variant="h4" component="h1" className={styles.title}>
              Create Account
            </Typography>
            
            <Typography variant="body2" className={styles.subtitle}>
              Join us and start creating amazing things
            </Typography>
          </div>

          {error && (
            <Alert severity="error" className={styles.alert}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
              size="small"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              size="small"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              size="small"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              size="small"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="medium"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RegisterIcon />}
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            
            <div className={styles.linkContainer}>
              <Typography variant="body2" className={styles.linkText}>
                Already have an account?{" "}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate("/login")}
                  className={styles.link}
                >
                  Sign in
                </Link>
              </Typography>
            </div>
          </form>
        </Paper>
      </div>
    </div>
  );
};

export default Register; 