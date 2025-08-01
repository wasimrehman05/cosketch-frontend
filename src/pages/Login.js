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
import { Login as LoginIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import styles from "./styles/Login.module.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAppContext();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
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
              Welcome Back
            </Typography>
            
            <Typography variant="body2" className={styles.subtitle}>
              Sign in to your account to continue
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
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
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
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              size="small"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="medium"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
            
            <div className={styles.linkContainer}>
              <Typography variant="body2" className={styles.linkText}>
                Don't have an account?{" "}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate("/register")}
                  className={styles.link}
                >
                  Sign up
                </Link>
              </Typography>
            </div>
          </form>
        </Paper>
      </div>
    </div>
  );
};

export default Login; 