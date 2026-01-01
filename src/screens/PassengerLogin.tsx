import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { loginUser } from "../authHelper";
import "./PassengerLogin.css";

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
  googleButton: {
    width: "100%",
    background: "#fff",
    color: "#333",
    fontWeight: 700,
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px"
  },
  link: {
    color: "#FF9F00",
    textDecoration: "none",
    fontWeight: "600"
  }
};

const PassengerLogin: React.FC = () => {
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
        userType: "passenger"
      });
      navigate("/");
    } catch (error) {
      console.error("Error signing in:", error);
      alert("Failed to sign in. Please check your credentials.");
    }
  };

  const handleGoogleSignIn = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email === "ridelinkplus@gmail.com") {
        loginUser({
          name: user.displayName || "Admin",
          email: user.email,
          profileImage: user.photoURL || undefined,
          userType: "admin"
        });
        navigate("/admin-dashboard");
      } else {
        loginUser({
          name: user.displayName || "",
          email: user.email || "",
          profileImage: user.photoURL || "",
          userType: "passenger"
        });
        navigate("/");
      }
    } catch (error) {
      console.error("Error with Google sign-in:", error);
      alert("Failed to sign in with Google.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox} className="login-box-container">
        <h1 style={styles.title} className="login-title">
          Passenger Login
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
        <button style={styles.googleButton} onClick={handleGoogleSignIn}>
          <img
            src="https://img.icons8.com/color/16/000000/google-logo.png"
            alt="Google icon"
          />
          Sign in with Google
        </button>
        <p>
          Don't have an account?{" "}
          <Link to="/passenger-signup" style={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PassengerLogin;
