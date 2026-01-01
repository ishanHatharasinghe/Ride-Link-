import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { AlertCircle, Users } from "lucide-react";

interface GoogleUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

const GoogleAuthUsers: React.FC = () => {
  const [googleUsers, setGoogleUsers] = useState<GoogleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoogleUsers = async () => {
      try {
        const functions = getFunctions();
        const listGoogleUsers = httpsCallable(functions, "listgoogleusers");
        const result = await listGoogleUsers();
        const users = (result.data as { users: GoogleUser[] }).users;
        setGoogleUsers(users);
      } catch (err) {
        console.error("Error fetching google users:", err);
        setError("Failed to fetch users. See console for details.");
      } finally {
        setLoading(false);
      }
    };

    fetchGoogleUsers();
  }, []);

  if (loading) {
    return (
      <div className="text-center p-4">
        <p>Loading Google users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Google Authenticated Users
        </h2>
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Users className="w-5 h-5 text-blue-500" />
        </div>
      </div>
      {googleUsers.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {googleUsers.map((user) => (
            <li
              key={user.uid}
              className="py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  className="w-10 h-10 rounded-full"
                  src={
                    user.photoURL ||
                    `https://ui-avatars.com/api/?name=${user.displayName}&background=random`
                  }
                  alt={user.displayName || "User"}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-10 text-gray-500">
          <p>No users found with Google authentication.</p>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthUsers;
