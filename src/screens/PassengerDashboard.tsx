import React from "react";

const PassengerDashboard: React.FC = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "auto",
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #007E7E 0%, #309898 50%, #007E7E 100%)",
        color: "white",
        padding: "24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
      }}
    >
      <h1
        style={{
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
        }}
      >
        Passenger Dashboard
      </h1>
    </div>
  );
};

export default PassengerDashboard;
