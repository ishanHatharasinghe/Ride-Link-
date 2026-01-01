import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import PreloaderScreen from "./screens/PreloaderScreen";
import Navbar from "./components/Navbar";
import MainScreen from "./mainScreen";
import Join from "./screens/Join";
import PassengerLogin from "./screens/PassengerLogin";
import PassengerSignup from "./screens/PassengerSignup";
import OwnerLogin from "./screens/OwnerLogin";
import OwnerSignup from "./screens/OwnerSignup";
import OwnerDashboard from "./screens/OwnerDashboard";
import PassengerDashboard from "./screens/PassengerDashboard";
import AdminLogin from "./screens/AdminLogin";
import AdminDashboard from "./screens/AdminDashboard";
import Crud from "./CRUD";
import "./App.css";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a network request or some initial loading time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // Adjust time as needed

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <PreloaderScreen onComplete={() => setLoading(false)} />;
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <MainScreen />
            </>
          }
        />
        <Route path="/join" element={<Join />} />
        <Route path="/passenger-login" element={<PassengerLogin />} />
        <Route path="/passenger-signup" element={<PassengerSignup />} />
        <Route path="/owner-login" element={<OwnerLogin />} />
        <Route path="/owner-signup" element={<OwnerSignup />} />
        <Route
          path="/owner-dashboard"
          element={
            <div className="content-container">
              <OwnerDashboard />
            </div>
          }
        />
        <Route path="/passenger-dashboard" element={<PassengerDashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        {/* optional: keep CRUD standalone if needed */}
        <Route path="/crud" element={<Crud />} />
      </Routes>
    </>
  );
}

export default App;
