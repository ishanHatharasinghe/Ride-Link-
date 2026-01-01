import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import "./Navbar.css";
import logo from "../assets/logo.png";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeBuses, setActiveBuses] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<
    "passenger" | "owner" | "admin" | null
  >(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    profileImage: ""
  });

  // Function to check and update login state
  const checkLoginState = () => {
    const owner = localStorage.getItem("isOwner") === "true";
    const passenger = localStorage.getItem("isPassenger") === "true";
    const admin = localStorage.getItem("isAdmin") === "true";
    const storedName = localStorage.getItem("userName") || "";
    const storedEmail = localStorage.getItem("userEmail") || "";
    const storedImage = localStorage.getItem("userProfileImage") || "";

    if (owner) {
      setIsLoggedIn(true);
      setUserType("owner");
      setUserData({
        name: storedName,
        email: storedEmail,
        profileImage: storedImage
      });
    } else if (passenger) {
      setIsLoggedIn(true);
      setUserType("passenger");
      setUserData({
        name: storedName,
        email: storedEmail,
        profileImage: storedImage
      });
    } else if (admin) {
      setIsLoggedIn(true);
      setUserType("admin");
      setUserData({
        name: storedName,
        email: storedEmail,
        profileImage: storedImage
      });
    } else {
      setIsLoggedIn(false);
      setUserType(null);
      setUserData({ name: "", email: "", profileImage: "" });
    }
  };

  useEffect(() => {
    // Fetch active buses count
    const busesRef = ref(db, "buses");
    const unsubscribeBuses = onValue(busesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const onlineBuses = Object.values(data).filter(
          (bus: any) => bus.status === "online"
        );
        setActiveBuses(onlineBuses.length);
      } else {
        setActiveBuses(0);
      }
    });

    // Fetch active routes count
    const routesRef = ref(db, "routes");
    const unsubscribeRoutes = onValue(routesRef, (snapshot) => {
      const data = snapshot.val();
      setActiveRoutes(data ? Object.keys(data).length : 0);
    });

    // Check login state on component mount
    checkLoginState();

    // Listen for storage changes (when user logs in from another tab or window)
    const handleStorageChange = () => {
      checkLoginState();
    };
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom login event
    const handleLoginEvent = () => {
      checkLoginState();
    };
    window.addEventListener("userLoggedIn", handleLoginEvent);

    return () => {
      unsubscribeBuses();
      unsubscribeRoutes();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userLoggedIn", handleLoginEvent);
    };
  }, []);

  // Re-check login state whenever location changes (navigation)
  useEffect(() => {
    checkLoginState();
  }, [location]);

  const handleLogout = () => {
    // Clear all user data from localStorage
    localStorage.removeItem("isOwner");
    localStorage.removeItem("isPassenger");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userProfileImage");

    setIsLoggedIn(false);
    setUserType(null);
    setDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setUserData({ name: "", email: "", profileImage: "" });

    // Dispatch custom event for logout
    window.dispatchEvent(new Event("userLoggedOut"));

    // Navigate to home page
    navigate("/");
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (dropdownOpen && !target.closest(".profile-section")) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const renderProfileSection = () => {
    // Get first letter of name or email for default avatar
    const displayName = userData.name || userData.email;
    const avatarLetter = displayName
      ? displayName.charAt(0).toUpperCase()
      : "U";

    return (
      <div className="profile-section">
        <button onClick={toggleDropdown} className="profile-button">
          {userData.profileImage ? (
            <img
              src={userData.profileImage}
              alt="Profile"
              className="profile-image"
            />
          ) : (
            <div className="profile-image-default">{avatarLetter}</div>
          )}
          <span className="profile-name">{displayName}</span>
          <svg
            className={`dropdown-arrow ${dropdownOpen ? "open" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="dropdown-menu">
            {userType === "owner" && (
              <>
                <Link
                  to="/owner-dashboard"
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className="dropdown-item"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 8h4V2H2v6zm0 6h4v-4H2v4zm6 0h4V8H8v6zm0-14v4h4V0H8z"
                      fill="currentColor"
                    />
                  </svg>
                  Dashboard
                </Link>
                <div className="dropdown-divider"></div>
              </>
            )}
            {userType === "admin" && (
              <>
                <Link
                  to="/admin-dashboard"
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className="dropdown-item"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 8h4V2H2v6zm0 6h4v-4H2v4zm6 0h4V8H8v6zm0-14v4h4V0H8z"
                      fill="currentColor"
                    />
                  </svg>
                  Dashboard
                </Link>
                <div className="dropdown-divider"></div>
              </>
            )}
            <button onClick={handleLogout} className="dropdown-item logout-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 14H3.33C2.6 14 2 13.4 2 12.67V3.33C2 2.6 2.6 2 3.33 2H6M10.67 11.33L14 8M14 8L10.67 4.67M14 8H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="logo-container">
          <div className="logo-circle">
            <img src={logo} alt="RideLink Logo" />
          </div>
          <div className="logo-name">RideLink</div>
        </Link>
      </div>
      <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </div>
      <div className={`navbar-right ${isMobileMenuOpen ? "mobile-open" : ""}`}>
        <ul className="nav-links">
          <li>
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </Link>
          </li>
          <li>
            <div className="nav-stat">
              <span className="stat-label">●</span>
              {activeBuses} Buses Online
            </div>
          </li>
          <li>
            <div className="nav-stat">
              <span className="stat-label">●</span>
              {activeRoutes} Routes Online
            </div>
          </li>
        </ul>
        {isLoggedIn ? (
          renderProfileSection()
        ) : (
          <Link
            to="/join"
            className="join-button"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Join
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
