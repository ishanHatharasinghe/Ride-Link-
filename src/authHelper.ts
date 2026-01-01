// authHelper.ts
// Helper functions for managing user authentication state

export interface UserData {
  name: string;
  email: string;
  profileImage?: string;
  userType: "owner" | "passenger" | "admin";
}

/**
 * Log in a user and save their data to localStorage
 * This will trigger the navbar to update across all screens
 */
export const loginUser = (userData: UserData): void => {
  const { name, email, profileImage, userType } = userData;

  // Save user data to localStorage
  localStorage.setItem("userName", name);
  localStorage.setItem("userEmail", email);
  
  if (profileImage) {
    localStorage.setItem("userProfileImage", profileImage);
  }

  // Set user type
  if (userType === "owner") {
    localStorage.setItem("isOwner", "true");
    localStorage.removeItem("isPassenger");
    localStorage.removeItem("isAdmin");
  } else if (userType === "passenger") {
    localStorage.setItem("isPassenger", "true");
    localStorage.removeItem("isOwner");
    localStorage.removeItem("isAdmin");
  } else if (userType === "admin") {
    localStorage.setItem("isAdmin", "true");
    localStorage.removeItem("isOwner");
    localStorage.removeItem("isPassenger");
  }

  // Dispatch custom event to notify navbar and other components
  window.dispatchEvent(new Event("userLoggedIn"));
};

/**
 * Log out the current user
 */
export const logoutUser = (): void => {
  // Clear all user data
  localStorage.removeItem("isOwner");
  localStorage.removeItem("isPassenger");
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userProfileImage");

  // Dispatch custom event
  window.dispatchEvent(new Event("userLoggedOut"));
};

/**
 * Check if user is logged in
 */
export const isUserLoggedIn = (): boolean => {
  const isOwner = localStorage.getItem("isOwner") === "true";
  const isPassenger = localStorage.getItem("isPassenger") === "true";
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  return isOwner || isPassenger || isAdmin;
};

/**
 * Get current user type
 */
export const getUserType = (): "owner" | "passenger" | "admin" | null => {
  const isOwner = localStorage.getItem("isOwner") === "true";
  const isPassenger = localStorage.getItem("isPassenger") === "true";
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  
  if (isAdmin) return "admin";
  if (isOwner) return "owner";
  if (isPassenger) return "passenger";
  return null;
};

/**
 * Get current user data
 */
export const getCurrentUser = (): UserData | null => {
  const userType = getUserType();
  if (!userType) return null;

  return {
    name: localStorage.getItem("userName") || "",
    email: localStorage.getItem("userEmail") || "",
    profileImage: localStorage.getItem("userProfileImage") || "",
    userType
  };
};
