import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, onValue, update, remove } from "firebase/database";
import { db } from "../firebase";
import CRUD from "../CRUD";
import UserManagement from "../components/UserManagement";
import {
  LineChart,
  Line,
  Cell,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Bus,
  Building2,
  Activity,
  AlertCircle,
  TrendingUp,
  Calendar,
  Search,
  Users,
  Mail,
  Key,
  MapPin,
  Clock,
  Shield,
  Edit,
  Trash2,
  Plus,
  Route as RouteIcon,
  Navigation,
  Map,
  CheckCircle,
  XCircle
} from "lucide-react";

interface AuthUser {
  uid: string;
  email?: string;
  provider?: string;
  createdAt?: string;
  lastSignIn?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  userType: "passenger" | "owner";
  createdAt: string;
  status: "active" | "inactive";
}

interface Owner {
  id: string;
  ownerId: string;
  fullName: string;
  email: string;
  mobile?: string;
  createdAt: string;
  status: "active" | "inactive";
  busesOwned?: number;
}

interface Bus {
  id: string;
  busId: string;
  routeId: string;
  ownerId: string;
  lat?: number;
  lon?: number;
  status: "active" | "inactive" | "maintenance" | "online" | "offline";
  createdAt?: string;
}

interface Route {
  id: string;
  routeId: string;
  routeName: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  estimatedTime: string;
  busCount?: number;
  activeBuses?: number;
  status: "active" | "inactive";
  stops?: string[];
  createdAt?: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  getAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "buses"
    | "owners"
    | "manage"
    | "userManagement"
    | "routeManagement"
  >("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [routeSearchTerm, setRouteSearchTerm] = useState("");
  const [newRoute, setNewRoute] = useState({
    routeId: "",
    routeName: "",
    startLocation: "",
    endLocation: "",
    distance: "",
    estimatedTime: "",
    status: "active" as const,
    stops: [""]
  });
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [showRouteForm, setShowRouteForm] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") {
      navigate("/admin-login");
    }
  }, [navigate]);

  // Updated processRoutesData to ensure active buses are displayed for relevant routes
  const processRoutesData = useCallback(
    (routesData: any[], busesList: Bus[]) => {
      return routesData.map((route: Route) => {
        const routeBuses = busesList.filter(
          (bus) => bus.routeId === route.routeId
        );
        return {
          ...route,
          busCount: routeBuses.length,
          activeBuses: routeBuses.filter(
            (b) => b.status === "online" || b.status === "active"
          ).length
        };
      });
    },
    []
  );

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    let mounted = true;

    const fetchAuthUsers = async () => {
      try {
        const res = await fetch(
          "http://127.0.0.1:5001/ridelink-26c32/us-central1/getUsers"
        );
        if (res.ok && mounted) {
          const data = await res.json();
          setAuthUsers(data);
        }
      } catch (error) {
        console.error("Failed to fetch auth users:", error);
      }
    };
    fetchAuthUsers();

    const usersRef = ref(db, "users");
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const usersArray = data
        ? Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
            status: data[key].status || "active"
          }))
        : [];
      if (mounted) setUsers(usersArray);
    });
    unsubscribers.push(unsubUsers);

    const ownersRef = ref(db, "owners");
    const unsubOwners = onValue(ownersRef, (snapshot) => {
      const data = snapshot.val();
      const ownersArray = data
        ? Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
            status: data[key].status || "active"
          }))
        : [];
      if (mounted) setOwners(ownersArray);
    });
    unsubscribers.push(unsubOwners);

    const busesRef = ref(db, "buses");
    const unsubBuses = onValue(busesRef, (snapshot) => {
      const data = snapshot.val();
      const busesArray = data
        ? Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
            status: data[key].status || "active"
          }))
        : [];
      if (mounted) setBuses(busesArray);
    });
    unsubscribers.push(unsubBuses);

    const routesRef = ref(db, "routes");
    const unsubRoutes = onValue(routesRef, (snapshot) => {
      const data = snapshot.val();
      const routesArray = data
        ? Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
            status: data[key].status || "active"
          }))
        : [];

      if (mounted) {
        // Process routes with current buses data
        const processedRoutes = processRoutesData(routesArray, buses);
        setRoutes(processedRoutes);
        setLoading(false);
      }
    });
    unsubscribers.push(unsubRoutes);

    return () => {
      mounted = false;
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [processRoutesData]); // Removed buses from dependencies

  const stats = {
    totalOwners: owners.length,
    totalBuses: buses.length,
    totalRoutes: routes.length,
    googleLogins: authUsers.filter((u) => u.provider === "google.com").length,
    emailLogins: authUsers.filter((u) => u.provider === "password").length,
    onlineBuses: buses.filter((b) => b.status === "online").length,
    offlineBuses: buses.filter((b) => b.status === "offline").length,
    activeBuses: buses.filter((b) => b.status === "active").length,
    inactiveBuses: buses.filter((b) => b.status === "inactive").length,
    maintenanceBuses: buses.filter((b) => b.status === "maintenance").length,
    activeOwners: owners.filter((o) => o.status === "active").length,
    activeRoutes: routes.filter((r) => r.status === "active").length
  };

  const busStatusData = [
    { name: "Online", value: stats.onlineBuses, color: "#10B981" },
    { name: "Offline", value: stats.offlineBuses, color: "#EF4444" },
    { name: "Maintenance", value: stats.maintenanceBuses, color: "#F59E0B" }
  ];

  const authMethodData = [
    { name: "Google Auth", value: stats.googleLogins, color: "#EA4335" },
    { name: "Email/Password", value: stats.emailLogins, color: "#7C3AED" }
  ];

  const ownerStatusData = [
    { name: "Active Owners", value: stats.activeOwners, color: "#3B82F6" },
    {
      name: "Inactive Owners",
      value: stats.totalOwners - stats.activeOwners,
      color: "#94A3B8"
    }
  ];

  // Bus distribution by owner
  const busDistributionByOwner = owners
    .map((owner) => {
      const ownerBuses = buses.filter(
        (b) => b.ownerId === owner.ownerId
      ).length;
      return {
        name: owner.fullName?.substring(0, 15) || "Unknown",
        buses: ownerBuses,
        ownerId: owner.ownerId
      };
    })
    .filter((item) => item.buses > 0)
    .sort((a, b) => b.buses - a.buses)
    .slice(0, 10);

  // Routes distribution
  const routeDistribution = buses.reduce((acc, bus) => {
    const route = bus.routeId || "Unknown";
    acc[route] = (acc[route] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const routeData = Object.entries(routeDistribution)
    .map(([route, count]) => ({
      name: route,
      count: count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const monthlyData = generateMonthlyData(users, buses);

  const filteredBuses = buses.filter((bus) => {
    if (!searchTerm) return true;
    return (
      (bus.busId &&
        bus.busId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bus.routeId &&
        bus.routeId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const filteredOwners = owners.filter(
    (owner) =>
      (owner.fullName &&
        owner.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (owner.email &&
        owner.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredRoutes = routes.filter(
    (route) =>
      (route.routeId &&
        route.routeId.toLowerCase().includes(routeSearchTerm.toLowerCase())) ||
      (route.routeName &&
        route.routeName
          .toLowerCase()
          .includes(routeSearchTerm.toLowerCase())) ||
      (route.startLocation &&
        route.startLocation
          .toLowerCase()
          .includes(routeSearchTerm.toLowerCase())) ||
      (route.endLocation &&
        route.endLocation.toLowerCase().includes(routeSearchTerm.toLowerCase()))
  );

  const handleAddRoute = async () => {
    if (!newRoute.routeId || !newRoute.routeName) {
      alert("Please fill in all required fields.");
      return;
    }

    const routeRef = ref(db, `routes/${newRoute.routeId}`);
    await update(routeRef, newRoute);
    setShowRouteForm(false);
  };

  const handleDeleteRoute = () => {
    alert("Delete functionality has been removed.");
  };

  const handleEditRoute = () => {
    alert("Edit functionality has been removed.");
  };

  const StatCard: React.FC<{
    icon: React.ComponentType<any>;
    title: string;
    value: string | number;
    gradient: string;
    subtitle?: string;
    trend?: string;
  }> = ({ icon: Icon, title, value, gradient, subtitle, trend }) => (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100">
      <div
        className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500"
        style={{ background: gradient }}
      ></div>
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              {trend && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {trend}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {title}
            </h3>
            <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      <div
        className={`h-1 bg-gradient-to-r ${gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
      ></div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <Shield className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800 mb-1">
              Loading Dashboard
            </p>
            <p className="text-sm text-gray-500">Fetching latest data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 sm:py-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div>
                <h1 className="text-xl sm:text-xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="hidden sm:flex text-sm text-gray-500 items-center gap-2 mt-1">
                  <Clock className="w-3 h-3" />
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-gray-500">
                  Welcome back
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {localStorage.getItem("userName") || "Administrator"}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg text-sm sm:text-base">
                {(localStorage.getItem("userName") || "A")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm mb-8 p-2 border border-gray-100">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              {
                id: "owners",
                label: "Owners",
                icon: Building2,
                count: stats.totalOwners
              },
              {
                id: "buses",
                label: "Buses",
                icon: Bus,
                count: stats.totalBuses
              },
              {
                id: "routeManagement",
                label: "Routes",
                icon: RouteIcon,
                count: stats.totalRoutes
              },
              { id: "manage", label: "Manage", icon: Activity },
              { id: "userManagement", label: "Users", icon: Users }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`flex-1 min-w-fit px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <span className="flex items-center justify-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === tab.id
                          ? "bg-white/20"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Grid - Updated with Routes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Building2}
                title="Total Owners"
                value={stats.totalOwners || 0}
                gradient="from-blue-600 to-indigo-600"
                subtitle={`${stats.activeOwners || 0} active`}
              />
              <StatCard
                icon={Bus}
                title="Fleet Size"
                value={stats.totalBuses || 0}
                gradient="from-emerald-600 to-teal-600"
                subtitle={`${stats.onlineBuses || 0} online`}
              />
              <StatCard
                icon={RouteIcon}
                title="Total Routes"
                value={stats.totalRoutes || 0}
                gradient="from-orange-600 to-amber-600"
                subtitle={`${stats.activeRoutes || 0} active`}
              />
              <StatCard
                icon={Mail}
                title="Google Auth"
                value={stats.googleLogins || 0}
                gradient="from-orange-600 to-red-600"
                subtitle="OAuth users"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bus Status Pie Chart */}
              <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Fleet Status
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Current distribution
                    </p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl">
                    <Bus className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                {busStatusData.some((d) => d.value > 0) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={busStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${((percent as number) * 100).toFixed(
                              0
                            )}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {busStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <AlertCircle className="w-16 h-16 mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No data available</p>
                    <p className="text-xs mt-1">Add buses to see analytics</p>
                  </div>
                )}
              </div>

              {/* Authentication Methods Pie Chart */}
              <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Auth Methods
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Login distribution
                    </p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                {authMethodData.some((d) => d.value > 0) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={authMethodData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, value }) =>
                            `${name}: ${value} (${(
                              (percent as number) * 100
                            ).toFixed(0)}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {authMethodData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <Users className="w-16 h-16 mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No users yet</p>
                    <p className="text-xs mt-1">User data will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bus Distribution by Owner */}
              <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Top Owners
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Buses per owner
                    </p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                {busDistributionByOwner.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={busDistributionByOwner} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                          }}
                        />
                        <Bar
                          dataKey="buses"
                          fill="#3B82F6"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <Building2 className="w-16 h-16 mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No owner data</p>
                    <p className="text-xs mt-1">
                      Add owners and buses to see distribution
                    </p>
                  </div>
                )}
              </div>

              {/* Routes Distribution */}
              <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Route Analytics
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Buses per route
                    </p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl">
                    <Activity className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                {routeData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={routeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#F59E0B"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <Activity className="w-16 h-16 mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No route data</p>
                    <p className="text-xs mt-1">
                      Add routes to buses to see analytics
                    </p>
                  </div>
                )}
              </div>

              {/* Owner Status Distribution */}
              <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Owner Status
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Active vs Inactive
                    </p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl">
                    <Building2 className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
                {ownerStatusData.some((d) => d.value > 0) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ownerStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, value }) =>
                            `${name}: ${value} (${(
                              (percent as number) * 100
                            ).toFixed(0)}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          innerRadius={40}
                        >
                          {ownerStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <Building2 className="w-16 h-16 mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No owner data</p>
                    <p className="text-xs mt-1">
                      Add owners to see status distribution
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Status Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Bus className="w-6 h-6" />
                    </div>
                    <TrendingUp className="w-5 h-5 opacity-70" />
                  </div>
                  <p className="text-sm font-medium opacity-90 mb-1">
                    Online Buses
                  </p>
                  <p className="text-4xl font-bold">{stats.onlineBuses || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <Activity className="w-5 h-5 opacity-70" />
                  </div>
                  <p className="text-sm font-medium opacity-90 mb-1">
                    Maintenance
                  </p>
                  <p className="text-4xl font-bold">
                    {stats.maintenanceBuses || 0}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Bus className="w-6 h-6" />
                    </div>
                    <AlertCircle className="w-5 h-5 opacity-70" />
                  </div>
                  <p className="text-sm font-medium opacity-90 mb-1">
                    Offline Buses
                  </p>
                  <p className="text-4xl font-bold">
                    {stats.offlineBuses || 0}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <Users className="w-5 h-5 opacity-70" />
                  </div>
                  <p className="text-sm font-medium opacity-90 mb-1">
                    Active Owners
                  </p>
                  <p className="text-4xl font-bold">
                    {stats.activeOwners || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Growth Trends */}
            <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Growth Trends
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Last 6 months overview
                  </p>
                </div>
                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              {monthlyData.length > 0 &&
              monthlyData.some((d) => d.buses > 0 || d.owners > 0) ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        dataKey="buses"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ fill: "#10B981", r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="owners"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ fill: "#3B82F6", r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <Calendar className="w-16 h-16 mb-3 opacity-50" />
                  <p className="text-sm font-semibold">No trend data yet</p>
                  <p className="text-xs mt-1">
                    Data will appear as records are added
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Owners Tab */}
        {activeTab === "owners" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Building2 className="w-7 h-7 text-blue-600" />
                    Bus Owners
                  </h2>
                  <p className="text-sm text-gray-600 mt-2">
                    Manage and monitor all registered owners
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search owners..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>

            {filteredOwners.length > 0 ? (
              <div>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Mobile
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Fleet
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredOwners.map((owner) => {
                        const ownerBuses = buses.filter(
                          (b) => b.ownerId === owner.ownerId
                        ).length;
                        return (
                          <tr
                            key={owner.id}
                            className="hover:bg-blue-50/50 transition-colors duration-200"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                                  <span className="text-white font-bold text-lg">
                                    {owner.fullName?.charAt(0).toUpperCase() ||
                                      "?"}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {owner.fullName || "N/A"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {owner.ownerId}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {owner.email || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {owner.mobile || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                                  owner.status === "active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {owner.status || "active"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                  <Bus className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                  {ownerBuses}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {owner.createdAt
                                ? new Date(owner.createdAt).toLocaleDateString()
                                : "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-4 bg-gray-50">
                  {filteredOwners.map((owner) => {
                    const ownerBuses = buses.filter(
                      (b) => b.ownerId === owner.ownerId
                    ).length;
                    return (
                      <div
                        key={owner.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                              <span className="text-white font-bold">
                                {owner.fullName?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {owner.fullName || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {owner.ownerId}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              owner.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {owner.status || "active"}
                          </span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Email</span>
                            <span className="font-medium text-gray-800">
                              {owner.email || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Mobile</span>
                            <span className="font-medium text-gray-800">
                              {owner.mobile || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Fleet Size</span>
                            <span className="font-bold text-blue-600">
                              {ownerBuses} buses
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Joined</span>
                            <span className="font-medium text-gray-800">
                              {owner.createdAt
                                ? new Date(owner.createdAt).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-20 flex flex-col items-center justify-center text-gray-400">
                <Building2 className="w-20 h-20 mb-4 opacity-50" />
                <p className="text-lg font-semibold text-gray-600">
                  No owners found
                </p>
                <p className="text-sm mt-2 text-gray-500">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Add owners to get started"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Buses Tab */}
        {activeTab === "buses" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Bus className="w-7 h-7 text-emerald-600" />
                    Fleet Management
                  </h2>
                  <p className="text-sm text-gray-600 mt-2">
                    Monitor all buses and their locations
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Bus ID or Route..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-sm bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>

            {filteredBuses.length > 0 ? (
              <div>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Bus ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredBuses.map((bus) => {
                        const owner = owners.find(
                          (o) => o.ownerId === bus.ownerId
                        );
                        return (
                          <tr
                            key={bus.id}
                            className="hover:bg-emerald-50/50 transition-colors duration-200"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                                  <Bus className="w-6 h-6 text-white" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-bold text-gray-900">
                                    {bus.busId || "N/A"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                {bus.routeId || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {owner?.fullName || "Unknown"}
                              </div>
                              {owner?.email && (
                                <div className="text-xs text-gray-500">
                                  {owner.email}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {bus.lat && bus.lon ? (
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
                                  <div className="text-xs">
                                    <div className="font-mono text-gray-700">
                                      {bus.lat.toFixed(4)}, {bus.lon.toFixed(4)}
                                    </div>
                                    <div className="text-gray-500">
                                      Coordinates
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  No location
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                                  bus.status === "online"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : bus.status === "offline"
                                    ? "bg-red-100 text-red-700"
                                    : bus.status === "maintenance"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {bus.status || "offline"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-4 bg-gray-50">
                  {filteredBuses.map((bus) => {
                    const owner = owners.find((o) => o.ownerId === bus.ownerId);
                    return (
                      <div
                        key={bus.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                              <Bus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {bus.busId || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Route: {bus.routeId || "N/A"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              bus.status === "online"
                                ? "bg-emerald-100 text-emerald-700"
                                : bus.status === "offline"
                                ? "bg-red-100 text-red-700"
                                : bus.status === "maintenance"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {bus.status || "offline"}
                          </span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Owner</span>
                            <span className="font-medium text-gray-800">
                              {owner?.fullName || "Unknown"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Location</span>
                            <span className="font-mono text-xs text-gray-800">
                              {bus.lat && bus.lon
                                ? `${bus.lat.toFixed(4)}, ${bus.lon.toFixed(4)}`
                                : "No location"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-20 flex flex-col items-center justify-center text-gray-400">
                <Bus className="w-20 h-20 mb-4 opacity-50" />
                <p className="text-lg font-semibold text-gray-600">
                  No buses found
                </p>
                <p className="text-sm mt-2 text-gray-500">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Add buses to get started"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Route Management Tab */}
        {activeTab === "routeManagement" && (
          <div className="space-y-6">
            {/* Header and Search */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <RouteIcon className="w-7 h-7 text-orange-600" />
                      Route Management
                    </h2>
                    <p className="text-sm text-gray-600 mt-2">
                      Manage and monitor all bus routes
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search routes..."
                        value={routeSearchTerm}
                        onChange={(e) => setRouteSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm bg-white shadow-sm"
                      />
                    </div>
                    <button
                      onClick={() => setShowRouteForm(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Route
                    </button>
                  </div>
                </div>
              </div>

              {/* Add/Edit Route Form */}
              {(showRouteForm || editingRoute) && (
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="max-w-4xl mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {editingRoute ? "Edit Route" : "Add New Route"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Route ID *
                        </label>
                        <input
                          type="text"
                          value={
                            editingRoute
                              ? editingRoute.routeId
                              : newRoute.routeId
                          }
                          onChange={(e) =>
                            editingRoute
                              ? setEditingRoute({
                                  ...editingRoute,
                                  routeId: e.target.value
                                })
                              : setNewRoute({
                                  ...newRoute,
                                  routeId: e.target.value
                                })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="RT001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Route Name *
                        </label>
                        <input
                          type="text"
                          value={
                            editingRoute
                              ? editingRoute.routeName
                              : newRoute.routeName
                          }
                          onChange={(e) =>
                            editingRoute
                              ? setEditingRoute({
                                  ...editingRoute,
                                  routeName: e.target.value
                                })
                              : setNewRoute({
                                  ...newRoute,
                                  routeName: e.target.value
                                })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Downtown Express"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Location *
                        </label>
                        <input
                          type="text"
                          value={
                            editingRoute
                              ? editingRoute.startLocation
                              : newRoute.startLocation
                          }
                          onChange={(e) =>
                            editingRoute
                              ? setEditingRoute({
                                  ...editingRoute,
                                  startLocation: e.target.value
                                })
                              : setNewRoute({
                                  ...newRoute,
                                  startLocation: e.target.value
                                })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Central Station"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Location *
                        </label>
                        <input
                          type="text"
                          value={
                            editingRoute
                              ? editingRoute.endLocation
                              : newRoute.endLocation
                          }
                          onChange={(e) =>
                            editingRoute
                              ? setEditingRoute({
                                  ...editingRoute,
                                  endLocation: e.target.value
                                })
                              : setNewRoute({
                                  ...newRoute,
                                  endLocation: e.target.value
                                })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Airport Terminal"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Distance (km)
                        </label>
                        <input
                          type="number"
                          value={
                            editingRoute
                              ? editingRoute.distance
                              : newRoute.distance
                          }
                          onChange={(e) =>
                            editingRoute
                              ? setEditingRoute({
                                  ...editingRoute,
                                  distance: e.target.value
                                })
                              : setNewRoute({
                                  ...newRoute,
                                  distance: e.target.value
                                })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="25.5"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estimated Time
                        </label>
                        <input
                          type="text"
                          value={
                            editingRoute
                              ? editingRoute.estimatedTime
                              : newRoute.estimatedTime
                          }
                          onChange={(e) =>
                            editingRoute
                              ? setEditingRoute({
                                  ...editingRoute,
                                  estimatedTime: e.target.value
                                })
                              : setNewRoute({
                                  ...newRoute,
                                  estimatedTime: e.target.value
                                })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="45 minutes"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={
                            editingRoute ? editingRoute.status : newRoute.status
                          }
                          onChange={(e) =>
                            editingRoute
                              ? setEditingRoute({
                                  ...editingRoute,
                                  status: e.target.value as
                                    | "active"
                                    | "inactive"
                                })
                              : setNewRoute({
                                  ...newRoute,
                                  status: e.target.value as
                                    | "active"
                                    | "inactive"
                                })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    {/* Stops Section */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bus Stops
                      </label>
                      {(!editingRoute
                        ? newRoute.stops
                        : editingRoute.stops || [""]
                      ).map((stop, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={stop}
                            onChange={(e) => {
                              if (editingRoute) {
                                const newStops = [
                                  ...(editingRoute.stops || [])
                                ];
                                newStops[index] = e.target.value;
                                setEditingRoute({
                                  ...editingRoute,
                                  stops: newStops
                                });
                              } else {
                                const newStops = [...newRoute.stops];
                                newStops[index] = e.target.value;
                                setNewRoute({ ...newRoute, stops: newStops });
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder={`Stop ${index + 1}`}
                          />
                          <button
                            onClick={() => {
                              if (editingRoute) {
                                const newStops =
                                  editingRoute.stops?.filter(
                                    (_, i) => i !== index
                                  ) || [];
                                setEditingRoute({
                                  ...editingRoute,
                                  stops: newStops
                                });
                              } else {
                                const newStops = newRoute.stops.filter(
                                  (_, i) => i !== index
                                );
                                setNewRoute({ ...newRoute, stops: newStops });
                              }
                            }}
                            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          if (editingRoute) {
                            setEditingRoute({
                              ...editingRoute,
                              stops: [...(editingRoute.stops || []), ""]
                            });
                          } else {
                            setNewRoute({
                              ...newRoute,
                              stops: [...newRoute.stops, ""]
                            });
                          }
                        }}
                        className="mt-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Add Stop
                      </button>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={
                          editingRoute ? handleEditRoute : handleAddRoute
                        }
                        className="px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                      >
                        {editingRoute ? "Update Route" : "Add Route"}
                      </button>
                      <button
                        onClick={() => {
                          setShowRouteForm(false);
                          setEditingRoute(null);
                          setNewRoute({
                            routeId: "",
                            routeName: "",
                            startLocation: "",
                            endLocation: "",
                            distance: "",
                            estimatedTime: "",
                            status: "active",
                            stops: [""]
                          });
                        }}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Routes List */}
              {filteredRoutes.length > 0 ? (
                <div>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Route Details
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Distance & Time
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Buses
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredRoutes.map((route) => (
                          <tr
                            key={route.id}
                            className="hover:bg-orange-50/30 transition-colors duration-200"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-start">
                                <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                                  <RouteIcon className="w-6 h-6 text-white" />
                                </div>
                                <div className="ml-4">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-bold text-gray-900">
                                      {route.routeId}
                                    </div>
                                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                                      ID
                                    </span>
                                  </div>
                                  <div className="text-lg font-semibold text-gray-900 mt-1">
                                    {route.routeName}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                      <Navigation className="w-3 h-3" />
                                      {route.startLocation}
                                    </div>
                                    <div className="text-gray-400">→</div>
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                      <MapPin className="w-3 h-3" />
                                      {route.endLocation}
                                    </div>
                                  </div>
                                  {route.stops && route.stops.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs text-gray-500 font-medium">
                                        Stops: {route.stops.length}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate max-w-xs">
                                        {route.stops.slice(0, 3).join(", ")}
                                        {route.stops.length > 3 && "..."}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                {route.distance > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Map className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm font-medium text-gray-900">
                                      {route.distance} km
                                    </span>
                                  </div>
                                )}
                                {route.estimatedTime && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm text-gray-700">
                                      {route.estimatedTime}
                                    </span>
                                  </div>
                                )}
                                {route.createdAt && (
                                  <div className="text-xs text-gray-500 mt-3">
                                    Created:{" "}
                                    {new Date(
                                      route.createdAt
                                    ).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-100 rounded-lg">
                                    <Bus className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-gray-900">
                                      {route.busCount || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Total Buses
                                    </div>
                                  </div>
                                </div>
                                {route.activeBuses !== undefined && (
                                  <div className="text-sm text-emerald-600 font-medium">
                                    {route.activeBuses} active
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden p-4 space-y-4 bg-gray-50">
                    {filteredRoutes.map((route) => (
                      <div
                        key={route.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-orange-600 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                              <RouteIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900">
                                  {route.routeName}
                                </p>
                                <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                                  {route.routeId}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                <span>{route.startLocation}</span>
                                <span>→</span>
                                <span>{route.endLocation}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-500">
                                Distance
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {route.distance || "N/A"} km
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Time</div>
                              <div className="text-sm font-medium text-gray-900">
                                {route.estimatedTime || "N/A"}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-blue-100 rounded">
                                <Bus className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-900">
                                  {route.busCount || 0} buses
                                </div>
                                {route.activeBuses !== undefined && (
                                  <div className="text-xs text-emerald-600">
                                    {route.activeBuses} active
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-20 flex flex-col items-center justify-center text-gray-400">
                  <RouteIcon className="w-20 h-20 mb-4 opacity-50" />
                  <p className="text-lg font-semibold text-gray-600">
                    No routes found
                  </p>
                  <p className="text-sm mt-2 text-gray-500">
                    {routeSearchTerm
                      ? "Try adjusting your search"
                      : "Add routes to get started"}
                  </p>
                  <button
                    onClick={() => setShowRouteForm(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Route
                  </button>
                </div>
              )}
            </div>

            {/* Route Statistics */}
            {routes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Route Statistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-700">
                      {stats.totalRoutes}
                    </div>
                    <div className="text-sm text-orange-600">Total Routes</div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-700">
                      {stats.activeRoutes}
                    </div>
                    <div className="text-sm text-emerald-600">
                      Active Routes
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {routes.reduce(
                        (sum, route) => sum + (route.busCount || 0),
                        0
                      )}
                    </div>
                    <div className="text-sm text-blue-600">
                      Total Buses on Routes
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">
                      {routes.filter((r) => (r.busCount || 0) > 0).length}
                    </div>
                    <div className="text-sm text-purple-600">
                      Routes with Buses
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === "manage" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="w-7 h-7 text-blue-600" />
                Data Management
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                Create, update, and manage all system records
              </p>
            </div>
            <CRUD />
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === "userManagement" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-7 h-7 text-purple-600" />
                User Management
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                Manage authenticated users and permissions
              </p>
            </div>
            <UserManagement />
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to generate monthly data
function generateMonthlyData(users: User[], buses: Bus[]) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const currentDate = new Date();

  return months.map((month, index) => {
    const monthDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - (5 - index),
      1
    );
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - (5 - index) + 1,
      1
    );

    const busesCount = buses.filter((b) => {
      if (!b.createdAt) return false;
      const date = new Date(b.createdAt);
      return date >= monthDate && date < nextMonth;
    }).length;

    const ownersCount = users.filter((u) => {
      if (!u.createdAt || u.userType !== "owner") return false;
      const date = new Date(u.createdAt);
      return date >= monthDate && date < nextMonth;
    }).length;

    return {
      month,
      buses: busesCount,
      owners: ownersCount
    };
  });
}

export default AdminDashboard;
