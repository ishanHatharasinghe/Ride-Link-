import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  RotateCw,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Mail,
  Key,
  Calendar,
  LogIn
} from "lucide-react";

interface User {
  uid: string;
  email?: string;
  provider?: string;
  createdAt?: string;
  lastSignIn?: string;
}

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "http://127.0.0.1:5001/ridelink-26c32/us-central1/getUsers"
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch users");
      }

      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.provider?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const googleUsersCount = useMemo(
    () => users.filter((u) => u.provider === "google.com").length,
    [users]
  );
  const emailPasswordUsersCount = useMemo(
    () => users.filter((u) => u.provider === "password").length,
    [users]
  );

  const handleAddUser = async () => {
    const email = prompt("Enter email:");
    const password = prompt("Enter password:");
    const displayName = prompt("Enter display name:");

    if (email && password && displayName) {
      try {
        await fetch(
          "http://127.0.0.1:5001/ridelink-26c32/us-central1/createUser",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, displayName })
          }
        );
        fetchUsers();
      } catch (error) {
        console.error("Error creating user:", error);
        setError("Failed to create user.");
      }
    }
  };

  const handleEditUser = async (uid: string) => {
    const displayName = prompt("Enter new display name:");
    if (displayName) {
      try {
        await fetch(
          "http://127.0.0.1:5001/ridelink-26c32/us-central1/updateUser",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid, displayName })
          }
        );
        fetchUsers();
      } catch (error) {
        console.error("Error updating user:", error);
        setError("Failed to update user.");
      }
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await fetch(
          "http://127.0.0.1:5001/ridelink-26c32/us-central1/deleteUser",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid })
          }
        );
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        setError("Failed to delete user.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-[#0B7285] text-white hover:bg-[#085a6b] transition text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add User</span>
            </button>
            <button
              onClick={fetchUsers}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              title="Refresh list"
            >
              <RotateCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B7285] focus:border-transparent transition-all duration-200 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Google Sign-In
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {googleUsersCount}
              </p>
            </div>
            <div className="p-2 bg-blue-200 rounded-full">
              <Mail className="w-5 h-5 text-blue-800" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-green-800 font-medium">
                Email/Password
              </p>
              <p className="text-2xl font-bold text-green-900">
                {emailPasswordUsersCount}
              </p>
            </div>
            <div className="p-2 bg-green-200 rounded-full">
              <Key className="w-5 h-5 text-green-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Last Sign-In
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((u) => (
              <tr key={u.uid} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {u.email || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {u.provider || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {u.createdAt || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {u.lastSignIn || "—"}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditUser(u.uid)}
                      className="p-2 text-gray-500 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.uid)}
                      className="p-2 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden p-4 space-y-4 bg-gray-50">
        {filteredUsers.map((user) => (
          <div
            key={user.uid}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800 truncate">
                {user.email || "No Email"}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEditUser(user.uid)}
                  className="p-2 text-gray-500 hover:text-blue-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteUser(user.uid)}
                  className="p-2 text-gray-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-2">
                  <Key className="w-4 h-4" /> Provider
                </span>
                <span className="font-medium text-gray-800">
                  {user.provider || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Created
                </span>
                <span className="font-medium text-gray-800">
                  {user.createdAt || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Last Sign-In
                </span>
                <span className="font-medium text-gray-800">
                  {user.lastSignIn || "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersList;
