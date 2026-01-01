import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { loginUser } from "../authHelper";
import "./OwnerLogin.css";

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "auto",
    minHeight: "100vh",
    color: "white",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
  },
  loginBox: {
    background: "rgba(0, 0, 0, 0.25)",
    backdropFilter: "blur(30px)",
    padding: "40px",
    borderRadius: "20px",
    border: "2px solid rgba(255, 159, 0, 0.2)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    width: "400px",
    textAlign: "center" as "center"
  },
  title: {
    fontSize: "32px",
    fontWeight: 900,
    marginBottom: "30px",
    background:
      "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "-1px"
  },
  input: {
    width: "100%",
    background: "rgba(0, 0, 0, 0.3)",
    border: "2px solid rgba(255, 159, 0, 0.2)",
    borderRadius: "14px",
    padding: "14px",
    color: "white",
    fontSize: "15px",
    outline: "none",
    marginBottom: "20px",
    boxSizing: "border-box" as "border-box",
    transition: "all 0.3s"
  },
  button: {
    width: "100%",
    background:
      "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)",
    color: "white",
    fontWeight: 700,
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(244, 99, 30, 0.4)"
  },
  link: {
    color: "#FF9F00",
    textDecoration: "none",
    fontWeight: "600"
  }
};

const OwnerLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      loginUser({
        name: user.displayName || "",
        email: user.email || "",
        profileImage: user.photoURL || "",
        userType: "owner"
      });
      navigate("/owner-dashboard");
    } catch (error) {
      console.error("Error signing in:", error);
      alert("Failed to sign in. Please check your credentials.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox} className="login-box-container">
        <h1 style={styles.title} className="login-title">
          Bus Owner Login
        </h1>
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={styles.button} onClick={handleLogin}>
          Login
        </button>
        <p>
          Don't have an account?{" "}
          <Link to="/owner-signup" style={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default OwnerLogin;
