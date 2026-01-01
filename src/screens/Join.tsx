import React from "react";
import { Link } from "react-router-dom";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "auto",
    minHeight: "100vh",

    color: "white",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
  },
  title: {
    fontSize: "48px",
    fontWeight: 900,
    marginBottom: "40px",
    background:
      "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "-1px",
    textShadow: "0 4px 15px rgba(0, 0, 0, 0.2)"
  },
  buttonContainer: {
    display: "flex",
    gap: "30px"
  },
  button: {
    background:
      "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)",
    color: "white",
    fontWeight: 700,
    padding: "20px 40px",
    borderRadius: "14px",
    border: "none",
    boxShadow:
      "0 10px 30px rgba(244, 99, 30, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    fontSize: "18px",
    letterSpacing: "0.5px",
    textDecoration: "none"
  }
};

const Join: React.FC = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Join as a...</h1>
      <div style={styles.buttonContainer}>
        <Link to="/passenger-login" style={styles.button}>
          Passenger
        </Link>
        <Link to="/owner-login" style={styles.button}>
          Bus Owner
        </Link>
      </div>
    </div>
  );
};

export default Join;
