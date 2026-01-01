import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { loginUser } from "../authHelper";
import { generateOwnerId, generatePermitId } from "../idGenerator";
import "./OwnerSignup.css";

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "auto",
    minHeight: "100vh",
    padding: "40px 0",
    color: "white",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
  },
  signupBox: {
    background: "rgba(0, 0, 0, 0.25)",
    backdropFilter: "blur(30px)",
    padding: "40px",
    borderRadius: "20px",
    border: "2px solid rgba(255, 159, 0, 0.2)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    width: "500px",
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
    background: "rgba(0, 0, 0, 0.3)",
    border: "2px solid rgba(255, 159, 0, 0.2)",
    borderRadius: "14px",
    padding: "14px",
    color: "white",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box" as "border-box",
    transition: "all 0.3s"
  },
  fullWidth: {
    gridColumn: "1 / -1"
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
    marginTop: "10px",
    boxShadow: "0 10px 30px rgba(244, 99, 30, 0.4)"
  },
  link: {
    color: "#FF9F00",
    textDecoration: "none",
    fontWeight: "600",
    marginTop: "20px",
    display: "block"
  }
};

const OwnerSignup: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    ownerId: "",
    email: "",
    mobile: "",
    address: "",
    nic: "",
    permitId: "",
    password: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNewIds = async () => {
      const newOwnerId = await generateOwnerId();
      const newPermitId = await generatePermitId();
      setFormData((prev) => ({
        ...prev,
        ownerId: newOwnerId,
        permitId: newPermitId
      }));
    };
    fetchNewIds();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    const auth = getAuth();
    const db = getDatabase();
    try {
      await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      await set(ref(db, "owners/" + formData.ownerId), {
        fullName: formData.fullName,
        ownerId: formData.ownerId,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        nic: formData.nic,
        permitId: formData.permitId,
        password: formData.password // Note: Storing plain text passwords is not recommended
      });
      loginUser({
        name: formData.fullName,
        email: formData.email,
        userType: "owner"
      });
      navigate("/owner-dashboard");
    } catch (error) {
      console.error("Error signing up:", error);
      alert("Failed to sign up. Please check your details and try again.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.signupBox} className="signup-box-container">
        <h1 style={styles.title} className="signup-title">
          Bus Owner Sign Up
        </h1>
        <div style={styles.form} className="signup-form">
          <input
            style={styles.input}
            name="fullName"
            type="text"
            placeholder="Full Name"
            onChange={handleChange}
          />
          <input
            style={{ ...styles.input, backgroundColor: "rgba(0,0,0,0.5)" }}
            name="ownerId"
            type="text"
            placeholder="Owner ID"
            value={formData.ownerId}
            readOnly
          />
          <input
            style={styles.input}
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
          />
          <input
            style={styles.input}
            name="mobile"
            type="text"
            placeholder="Mobile"
            onChange={handleChange}
          />
          <input
            style={{ ...styles.input, ...styles.fullWidth }}
            name="address"
            type="text"
            placeholder="Address"
            onChange={handleChange}
          />
          <input
            style={styles.input}
            name="nic"
            type="text"
            placeholder="NIC"
            onChange={handleChange}
          />
          <input
            style={{ ...styles.input, backgroundColor: "rgba(0,0,0,0.5)" }}
            name="permitId"
            type="text"
            placeholder="Permit ID"
            value={formData.permitId}
            readOnly
          />
          <input
            style={{ ...styles.input, ...styles.fullWidth }}
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
          />
        </div>
        <button
          style={{ ...styles.button, ...styles.fullWidth }}
          onClick={handleSignup}
        >
          Sign Up
        </button>

        <p>
          Already have an account?{" "}
          <Link to="/owner-login" style={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default OwnerSignup;
