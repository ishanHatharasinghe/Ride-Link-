import React, { useEffect, useState } from "react";
import "./OwnerDashboard.css";
import ReportsSection from "./ReportsSection";
import { useNavigate } from "react-router-dom";
import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";
import { getDatabase, ref, onValue, update } from "firebase/database";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Bus, TrendingUp, Users, DollarSign, Activity } from "lucide-react";

interface OwnerData {
  ownerId: string;
  fullName: string;
  email: string;
  mobile: string;
  address: string;
  nic: string;
  permitId: string;
}

interface BusData {
  busId: string;
  routeId: string;
  ownerId: string;
  status?: string;
  passengers?: { [key: string]: number };
}

interface TripData {
  day: string;
  trips: number;
  completed: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
}

interface PassengerData {
  busId: string;
  timestamp: string;
  originalTimestamp: string;
  count: number;
}

const AdvancedOwnerDashboard: React.FC = () => {
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [buses, setBuses] = useState<BusData[]>([]);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [passengers, setPassengers] = useState<PassengerData[]>([]);
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<string | "all">("all");
  const [selectedDay, setSelectedDay] = useState<string | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<string | "all">("all");
  const [selectedYear, setSelectedYear] = useState<string | "all">("all");
  const [busSearchTerm, setBusSearchTerm] = useState("");
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editableOwnerData, setEditableOwnerData] = useState<OwnerData | null>(
    null
  );
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    if (isEditProfileModalOpen && ownerData) {
      setEditableOwnerData(ownerData);
    }
  }, [isEditProfileModalOpen, ownerData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchDashboardData(user.email);
      } else {
        navigate("/owner-login");
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  useEffect(() => {
    const db = getDatabase();
    const liveLocationsRef = ref(db, "liveLocations");
    onValue(liveLocationsRef, (snapshot) => {
      const locations = snapshot.val() || {};
      setLiveLocations(Object.values(locations));
    });
  }, []);

  // Helper function to parse custom timestamp
  const parseCustomTimestamp = (timestamp: string): Date | null => {
    try {
      // Convert from format "2025-12-19T22_43_15_586Z" to "2025-12-19T22:43:15.586Z"
      const formattedTimestamp = timestamp.replace(/_/g, ":");
      const date = new Date(formattedTimestamp);

      // If the above doesn't work, try manual parsing
      if (isNaN(date.getTime())) {
        // Extract parts from "2025-12-19T22_43_15_586Z"
        const match = timestamp.match(
          /^(\d{4})-(\d{2})-(\d{2})T(\d{2})_(\d{2})_(\d{2})_(\d{3})Z$/
        );
        if (match) {
          const [_, year, month, day, hour, minute, second, millisecond] =
            match;
          return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second),
            parseInt(millisecond)
          );
        }
      }
      return date;
    } catch (error) {
      console.error("Error parsing timestamp:", timestamp, error);
      return null;
    }
  };

  const fetchDashboardData = (userEmail: string | null) => {
    const db = getDatabase();

    const ownersRef = ref(db, "owners");
    onValue(ownersRef, (snapshot) => {
      const owners = snapshot.val();
      const currentOwner = Object.values(owners || {}).find(
        (owner: any) => owner.email === userEmail
      ) as OwnerData;

      if (currentOwner) {
        setOwnerData(currentOwner);

        const busesRef = ref(db, "buses");
        onValue(busesRef, (busSnapshot) => {
          const allBuses = busSnapshot.val() || {};
          const ownerBuses = Object.values(allBuses).filter(
            (bus: any) => bus.ownerId === currentOwner.ownerId
          ) as BusData[];
          setBuses(ownerBuses);

          let allPassengersData: PassengerData[] = [];
          ownerBuses.forEach((bus) => {
            if (bus.passengers) {
              const busPassengers = Object.entries(bus.passengers).map(
                ([timestamp, count]) => ({
                  busId: bus.busId,
                  timestamp: timestamp.replace(/_/g, ":"),
                  originalTimestamp: timestamp,
                  count: count as number
                })
              );
              allPassengersData.push(...busPassengers);
            }
          });
          setPassengers(allPassengersData);
        });

        const routesRef = ref(db, "routes");
        onValue(routesRef, (routeSnapshot) => {
          // Handle routes data if needed
        });

        setLoading(false);
      }
    });
  };

  const handleProfileUpdate = () => {
    if (editableOwnerData) {
      const db = getDatabase();
      const ownerRef = ref(db, `owners/${editableOwnerData.ownerId}`);
      update(ownerRef, editableOwnerData)
        .then(() => {
          setOwnerData(editableOwnerData);
          setIsEditProfileModalOpen(false);
          alert("Profile updated successfully!");
        })
        .catch((error) => {
          console.error("Error updating profile: ", error);
          alert("Failed to update profile.");
        });
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password should be at least 6 characters long.");
      return;
    }

    const user = auth.currentUser;
    if (user && user.email) {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      reauthenticateWithCredential(user, credential)
        .then(() => {
          updatePassword(user, newPassword)
            .then(() => {
              setIsChangePasswordModalOpen(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              alert("Password updated successfully!");
            })
            .catch((error) => {
              console.error("Error updating password: ", error);
              alert("Failed to update password.");
            });
        })
        .catch((error) => {
          console.error("Error re-authenticating: ", error);
          alert("Incorrect current password.");
        });
    }
  };

  const calculateStats = () => {
    const totalBuses = buses.length;
    const onlineBuses = buses.filter((bus) => bus.status === "online").length;
    const offlineBuses = totalBuses - onlineBuses;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthPassengers = passengers
      .filter((p) => {
        const date = parseCustomTimestamp(p.originalTimestamp);
        if (!date) return false;
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      })
      .reduce((sum, p) => sum + p.count, 0);

    return { totalBuses, onlineBuses, offlineBuses, currentMonthPassengers };
  };

  const getBusStatusData = () => {
    const online = buses.filter((b) => b.status === "online").length;
    const offline = buses.length - online;

    return [
      { name: "Online", value: online, color: "#10b981" },
      { name: "Offline", value: offline, color: "#ef4444" }
    ];
  };

  const getFilteredPassengers = () => {
    return passengers.filter((passenger) => {
      const date = parseCustomTimestamp(passenger.originalTimestamp);
      if (!date) return false;

      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      if (selectedDay !== "all" && day !== parseInt(selectedDay)) {
        return false;
      }
      if (selectedMonth !== "all" && month !== parseInt(selectedMonth)) {
        return false;
      }
      if (selectedYear !== "all" && year !== parseInt(selectedYear)) {
        return false;
      }
      return true;
    });
  };

  const getRoutePerformance = () => {
    const routeMap: { [key: string]: number } = {};
    buses.forEach((bus) => {
      if (bus.routeId) {
        routeMap[bus.routeId] = (routeMap[bus.routeId] || 0) + 1;
      }
    });

    return Object.entries(routeMap).map(([routeId, count]) => ({
      route: `Route ${routeId}`,
      buses: count,
      passengers: Math.floor(Math.random() * 500) + 100
    }));
  };

  const getPassengerChartData = () => {
    const passengerCounts = new Map<string, number>();
    getFilteredPassengers().forEach((p) => {
      const date = parseCustomTimestamp(p.originalTimestamp);
      if (date) {
        const day = date.getDate().toString();
        passengerCounts.set(day, (passengerCounts.get(day) || 0) + p.count);
      }
    });

    // Convert to array and sort by day
    const data = Array.from(passengerCounts, ([day, passengers]) => ({
      day,
      passengers
    })).sort((a, b) => parseInt(a.day) - parseInt(b.day));

    return data;
  };

  const getFilteredData = () => {
    return passengers.filter((passenger) => {
      const date = parseCustomTimestamp(passenger.originalTimestamp);
      if (!date) return false;

      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const dayMatch = selectedDay === "all" || day === parseInt(selectedDay);
      const monthMatch =
        selectedMonth === "all" || month === parseInt(selectedMonth);
      const yearMatch =
        selectedYear === "all" || year === parseInt(selectedYear);

      return dayMatch && monthMatch && yearMatch;
    });
  };

  const stats = calculateStats();
  const busStatusData = getBusStatusData();
  const routePerformance = getRoutePerformance();
  const filteredPassengers = getFilteredPassengers();
  const passengerChartData = getPassengerChartData();
  const filteredBuses = buses.filter((bus) =>
    bus.busId.toLowerCase().includes(busSearchTerm.toLowerCase())
  );

  const StatCard: React.FC<{
    icon: React.ComponentType<any>;
    title: string;
    value: string | number;
    change?: number;
    color: string;
  }> = ({ icon: Icon, title, value, change, color }) => (
    <div className="stat-card">
      <h3 className="stat-card-title">{title}</h3>
      <p className="stat-card-value">{value}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-container flex items-center justify-center">
        <div className="text-2xl">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Owner Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back, {ownerData?.fullName || "Owner"}
            </p>
          </div>

          <div className="header-buttons">
            <button onClick={() => setIsEditProfileModalOpen(true)}>
              Edit Profile
            </button>
            <button onClick={() => setIsChangePasswordModalOpen(true)}>
              Change Password
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard
            icon={Bus}
            title="Total Buses"
            value={stats.totalBuses}
            change={12}
            color="from-blue-500 to-blue-600"
          />
          <StatCard
            icon={Activity}
            title="Online Buses"
            value={stats.onlineBuses}
            color="from-green-500 to-green-600"
          />
          <StatCard
            icon={Bus}
            title="Offline Buses"
            value={stats.offlineBuses}
            color="from-red-500 to-red-600"
          />
          <StatCard
            icon={Users}
            title="Current Month Passengers"
            value={stats.currentMonthPassengers}
            color="from-indigo-500 to-purple-600"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="charts-grid">
          {/* Bus Status */}
          <div className="chart-container">
            <div className="flex justify-between items-center mb-4">
              <h2 className="chart-title">Bus Status Distribution</h2>
              <select
                value={selectedBus}
                onChange={(e) => setSelectedBus(e.target.value)}
                className="modal-input"
              >
                <option value="all">All Buses</option>
                {buses.map((bus) => (
                  <option key={bus.busId} value={bus.busId}>
                    {bus.busId}
                  </option>
                ))}
              </select>
            </div>
            <ResponsiveContainer
              width="100%"
              height={250}
              className="md:h-[300px]"
            >
              <PieChart>
                <Pie
                  data={busStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {busStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "14px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="charts-grid">
          {/* Passenger Count */}
          <div className="chart-container">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
              <h2 className="chart-title">Passenger Count</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium mr-2">
                  Filter by Date:
                </span>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="modal-input"
                >
                  <option value="all">All Days</option>
                  {[...Array(31)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="modal-input"
                >
                  <option value="all">All Months</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("default", {
                        month: "long"
                      })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="modal-input"
                >
                  <option value="all">All Years</option>
                  {[...Array(5)].map((_, i) => (
                    <option
                      key={new Date().getFullYear() - i}
                      value={new Date().getFullYear() - i}
                    >
                      {new Date().getFullYear() - i}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ResponsiveContainer
              width="100%"
              height={250}
              className="md:h-[300px]"
            >
              <BarChart data={passengerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "14px" }} />
                <Bar
                  dataKey="passengers"
                  fill="var(--medium-teal)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Route Performance */}
          <div className="chart-container">
            <h2 className="chart-title">Route Performance</h2>
            <ResponsiveContainer
              width="100%"
              height={250}
              className="md:h-[300px]"
            >
              <LineChart data={routePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="route"
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "14px" }} />
                <Line
                  type="monotone"
                  dataKey="buses"
                  stroke="var(--medium-teal)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="passengers"
                  stroke="var(--yellow-gold)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bus List Table */}
        <div className="table-container">
          <div className="table-header">
            <h2 className="table-title">My Buses</h2>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search by Bus ID..."
                value={busSearchTerm}
                onChange={(e) => setBusSearchTerm(e.target.value)}
                className="search-input"
              />
              <button
                onClick={() => setBusSearchTerm("")}
                className="header-buttons"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Bus ID</th>
                  <th>Route ID</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuses.length > 0 ? (
                  filteredBuses.map((bus, index) => (
                    <tr key={index}>
                      <td>{bus.busId}</td>
                      <td>{bus.routeId}</td>
                      <td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            bus.status === "online"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {bus.status || "offline"}
                        </span>
                      </td>
                      <td>{new Date().toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center">
                      No buses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Reports Section */}
        <ReportsSection
          passengers={passengers}
          buses={buses}
          ownerData={ownerData}
        />
        {/* Bus Details Table */}
        <div className="table-container">
          <div className="table-header">
            <h2 className="table-title">Bus Details</h2>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search by Bus ID..."
                value={busSearchTerm}
                onChange={(e) => setBusSearchTerm(e.target.value)}
                className="modal-input"
              />
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="modal-input"
              >
                <option value="all">All Days</option>
                {[...Array(31)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="modal-input"
              >
                <option value="all">All Months</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("default", {
                      month: "long"
                    })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="modal-input"
              >
                <option value="all">All Years</option>
                {[...Array(5)].map((_, i) => (
                  <option
                    key={new Date().getFullYear() - i}
                    value={new Date().getFullYear() - i}
                  >
                    {new Date().getFullYear() - i}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Bus ID</th>
                  <th>Passenger Count</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Live Location</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredData()
                  .filter(
                    (data) =>
                      busSearchTerm === "" ||
                      data.busId
                        .toLowerCase()
                        .includes(busSearchTerm.toLowerCase())
                  )
                  .map((data, index) => {
                    const date = parseCustomTimestamp(data.originalTimestamp);
                    if (!date) return null;

                    return (
                      <tr key={index}>
                        <td>{data.busId}</td>
                        <td>{data.count}</td>
                        <td>{date.toLocaleDateString()}</td>
                        <td>{date.toLocaleTimeString()}</td>
                        <td>
                          {liveLocations.find((loc) => loc.busId === data.busId)
                            ?.location || "Unknown"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {isEditProfileModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="modal-title">Edit Profile</h2>
              {editableOwnerData && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editableOwnerData.fullName}
                      onChange={(e) =>
                        setEditableOwnerData({
                          ...editableOwnerData,
                          fullName: e.target.value
                        })
                      }
                      className="modal-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Mobile
                    </label>
                    <input
                      type="text"
                      value={editableOwnerData.mobile}
                      onChange={(e) =>
                        setEditableOwnerData({
                          ...editableOwnerData,
                          mobile: e.target.value
                        })
                      }
                      className="modal-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editableOwnerData.address}
                      onChange={(e) =>
                        setEditableOwnerData({
                          ...editableOwnerData,
                          address: e.target.value
                        })
                      }
                      className="modal-input"
                    />
                  </div>
                </div>
              )}
              <div className="modal-buttons">
                <button
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="header-buttons"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileUpdate}
                  className="header-buttons"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {isChangePasswordModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="modal-title">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="modal-input"
                  />
                </div>
              </div>
              <div className="modal-buttons">
                <button
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="header-buttons"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="header-buttons"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedOwnerDashboard;
