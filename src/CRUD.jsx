import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, set, remove, onValue } from "firebase/database";
import { Users, MapPin, Bus, Edit2, Trash2, Plus, X } from "lucide-react";
import {
  generateOwnerId,
  generatePermitId,
  generateRouteId,
  generateBusId
} from "./idGenerator";

export default function CRUD() {
  const [owners, setOwners] = useState({});
  const [routes, setRoutes] = useState({});
  const [buses, setBuses] = useState({});

  // ---------- FORM STATES ----------
  const [ownerForm, setOwnerForm] = useState({
    ownerId: "",
    fullName: "",
    address: "",
    mobile: "",
    nic: "",
    permitId: "",
    email: "",
    password: ""
  });

  const [routeForm, setRouteForm] = useState({
    routeId: "",
    place1: "",
    place2: ""
  });

  const [busForm, setBusForm] = useState({
    busId: "",
    routeId: "",
    ownerId: "",
    lat: "",
    lon: "",
    status: "offline"
  });

  // ---------- EDIT FLAGS ----------
  const [editingOwner, setEditingOwner] = useState(false);
  const [editingRoute, setEditingRoute] = useState(false);
  const [editingBus, setEditingBus] = useState(false);
  const [originalOwnerId, setOriginalOwnerId] = useState(null);
  const [originalRouteId, setOriginalRouteId] = useState(null);
  const [originalBusId, setOriginalBusId] = useState(null);

  // ---------- LOAD DATA ----------
  useEffect(() => {
    onValue(ref(db, "owners"), (snap) => setOwners(snap.val() || {}));
    onValue(ref(db, "routes"), (snap) => setRoutes(snap.val() || {}));
    onValue(ref(db, "buses"), (snap) => setBuses(snap.val() || {}));

    // Pre-fill IDs for new entries
    prepareNewOwner();
    prepareNewRoute();
    prepareNewBus();
  }, []);

  const prepareNewOwner = async () => {
    const newOwnerId = await generateOwnerId();
    const newPermitId = await generatePermitId();
    setOwnerForm((prev) => ({
      ...prev,
      ownerId: newOwnerId,
      permitId: newPermitId
    }));
  };

  // ---------- OWNER CRUD ----------
  const saveOwner = async () => {
    if (!ownerForm.fullName) return alert("Enter Full Name");

    let ownerDataToSave = { ...ownerForm };

    if (!editingOwner) {
      ownerDataToSave.ownerId = await generateOwnerId();
      ownerDataToSave.permitId = await generatePermitId();
    }

    if (
      editingOwner &&
      originalOwnerId &&
      originalOwnerId !== ownerDataToSave.ownerId
    ) {
      await remove(ref(db, `owners/${originalOwnerId}`));
    }

    const ownerRef = ref(db, `owners/${ownerDataToSave.ownerId}`);
    const { email, password, ...finalOwnerData } = ownerDataToSave;
    await set(ownerRef, finalOwnerData);
    alert(editingOwner ? "✅ Owner updated!" : "✅ Owner added!");

    // Clear form and prepare for next entry
    setOwnerForm({
      fullName: "",
      address: "",
      mobile: "",
      nic: "",
      email: "",
      password: ""
    });
    setEditingOwner(false);
    setOriginalOwnerId(null);
    prepareNewOwner();
  };

  const editOwner = (o) => {
    setOwnerForm(o);
    setEditingOwner(true);
    setOriginalOwnerId(o.ownerId);
  };

  const deleteOwner = async (id) => {
    if (window.confirm("Delete this owner?")) {
      await remove(ref(db, `owners/${id}`));
      setEditingOwner(false);
    }
  };

  const prepareNewRoute = async () => {
    const newRouteId = await generateRouteId();
    setRouteForm((prev) => ({ ...prev, routeId: newRouteId }));
  };

  // ---------- ROUTE CRUD ----------
  const saveRoute = async () => {
    if (!routeForm.place1 || !routeForm.place2)
      return alert("Enter both places");

    let routeDataToSave = { ...routeForm };

    if (!editingRoute) {
      routeDataToSave.routeId = await generateRouteId();
    }

    if (
      editingRoute &&
      originalRouteId &&
      originalRouteId !== routeDataToSave.routeId
    ) {
      await remove(ref(db, `routes/${originalRouteId}`));
    }

    const routeRef = ref(db, `routes/${routeDataToSave.routeId}`);
    await set(routeRef, routeDataToSave);
    alert(editingRoute ? "✅ Route updated!" : "✅ Route added!");
    setRouteForm({ place1: "", place2: "" });
    setEditingRoute(false);
    setOriginalRouteId(null);
    prepareNewRoute();
  };

  const editRoute = (r) => {
    setRouteForm(r);
    setEditingRoute(true);
    setOriginalRouteId(r.routeId);
  };

  const deleteRoute = async (id) => {
    if (window.confirm("Delete this route?")) {
      await remove(ref(db, `routes/${id}`));
      setEditingRoute(false);
    }
  };

  const prepareNewBus = async () => {
    const newBusId = await generateBusId();
    setBusForm((prev) => ({ ...prev, busId: newBusId }));
  };

  // ---------- BUS CRUD ----------
  const saveBus = async () => {
    if (!busForm.routeId || !busForm.ownerId)
      return alert("Select valid Route ID and Owner ID");

    let busDataToSave = { ...busForm };

    if (!editingBus) {
      busDataToSave.busId = await generateBusId();
    }

    if (editingBus && originalBusId && originalBusId !== busDataToSave.busId) {
      await remove(ref(db, `buses/${originalBusId}`));
    }

    const busRef = ref(db, `buses/${busDataToSave.busId}`);
    await set(busRef, {
      busId: busDataToSave.busId,
      routeId: busDataToSave.routeId,
      ownerId: busDataToSave.ownerId,
      lat: parseFloat(busDataToSave.lat) || 0,
      lon: parseFloat(busDataToSave.lon) || 0,
      passengers: 0, // Initialize passengers
      status: busDataToSave.status,
      lastUpdated: Date.now() // Add timestamp
    });
    alert(editingBus ? "✅ Bus updated!" : "✅ Bus added!");
    setBusForm({
      routeId: "",
      ownerId: "",
      lat: "",
      lon: "",
      status: "offline"
    });
    setEditingBus(false);
    setOriginalBusId(null);
    prepareNewBus();
  };

  const editBus = (b) => {
    setBusForm(b);
    setEditingBus(true);
    setOriginalBusId(b.busId);
  };

  const deleteBus = async (id) => {
    if (window.confirm("Delete this bus?")) {
      await remove(ref(db, `buses/${id}`));
      setEditingBus(false);
    }
  };

  const toggleBusStatus = async (bus) => {
    const newStatus = bus.status === "online" ? "offline" : "online";

    // Optimistically update the UI
    setBuses((prevBuses) => ({
      ...prevBuses,
      [bus.busId]: {
        ...prevBuses[bus.busId],
        status: newStatus
      }
    }));

    try {
      const response = await fetch(
        "http://localhost:4002/api/update-bus-status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ busId: bus.busId, status: newStatus })
        }
      );
      const data = await response.json();
      if (!data.success) {
        // Revert the change if the API call fails
        setBuses((prevBuses) => ({
          ...prevBuses,
          [bus.busId]: {
            ...prevBuses[bus.busId],
            status: bus.status
          }
        }));
        alert("Failed to update bus status");
      }
    } catch (error) {
      // Revert the change if there's an error
      setBuses((prevBuses) => ({
        ...prevBuses,
        [bus.busId]: {
          ...prevBuses[bus.busId],
          status: bus.status
        }
      }));
      console.error("Error toggling bus status:", error);
      alert("An error occurred while updating bus status.");
    }
  };

  // ---------- ADD PASSENGER COUNT ----------
  const addPassengerCount = async (busId, count) => {
    if (!count) return;
    const timestamp = new Date().toISOString().replace(/[.#$[\]:]/g, "_");
    await set(ref(db, `buses/${busId}/passengers/${timestamp}`), count);
    alert(`🧍 Added passenger count ${count} to ${busId}`);
  };

  // =============================================================
  return (
    <div className="space-y-8">
      {/* ---------- OWNER CRUD ---------- */}
      <section className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-[#0B7285] to-[#0d8fa3] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Manage Owners</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              ["Owner ID", "ownerId"],
              ["Full Name", "fullName"],
              ["Address", "address"],
              ["Mobile", "mobile"],
              ["NIC", "nic"],
              ["Permit ID", "permitId"]
            ].map(([ph, key]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ph}
                </label>
                <input
                  type="text"
                  placeholder={ph}
                  readOnly={
                    (key === "ownerId" || key === "permitId") && !editingOwner
                  }
                  className={`text-black w-full px-4 py-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent ${
                    (key === "ownerId" || key === "permitId") && !editingOwner
                      ? "bg-gray-100 cursor-not-allowed"
                      : key === "ownerId" && editingOwner
                      ? "bg-yellow-50 border-yellow-300"
                      : "border-gray-300 hover:border-[#0B7285]"
                  }`}
                  value={ownerForm[key]}
                  onChange={(e) =>
                    setOwnerForm({ ...ownerForm, [key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveOwner}
              className="flex items-center gap-2 bg-gradient-to-r from-[#0B7285] to-[#0d8fa3] hover:from-[#0d8fa3] hover:to-[#0B7285] text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {editingOwner ? (
                <Edit2 className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editingOwner ? "Update Owner" : "Save Owner"}
            </button>
            <button
              onClick={() => {
                setEditingOwner(false);
                setOwnerForm({
                  fullName: "",
                  address: "",
                  mobile: "",
                  nic: "",
                  email: "",
                  password: ""
                });
                prepareNewOwner();
              }}
              className="flex items-center gap-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-2.5 rounded-lg font-semibold transition-all duration-200"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Existing Owners
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Owner ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(owners).map((o) => (
                    <tr
                      key={o.ownerId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {o.ownerId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {o.fullName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {o.mobile}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="inline-flex items-center gap-1 text-[#0B7285] hover:text-[#0d8fa3] font-medium text-sm transition-colors"
                            onClick={() => editOwner(o)}
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                            onClick={() => deleteOwner(o.ownerId)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- ROUTE CRUD ---------- */}
      <section className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-[#0B7285] to-[#0d8fa3] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Manage Routes</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route ID
              </label>
              <input
                placeholder="Route ID"
                readOnly={!editingRoute}
                className={`text-black w-full px-4 py-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent ${
                  !editingRoute
                    ? "bg-gray-100 cursor-not-allowed"
                    : editingRoute
                    ? "bg-yellow-50 border-yellow-300"
                    : "border-gray-300 hover:border-[#0B7285]"
                }`}
                value={routeForm.routeId}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, routeId: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Place 1
              </label>
              <input
                placeholder="Place 1"
                className="text-black w-full px-4 py-2.5 border border-gray-300 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent hover:border-[#0B7285]"
                value={routeForm.place1}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, place1: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Place 2
              </label>
              <input
                placeholder="Place 2"
                className="text-black w-full px-4 py-2.5 border border-gray-300 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent hover:border-[#0B7285]"
                value={routeForm.place2}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, place2: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveRoute}
              className="flex items-center gap-2 bg-gradient-to-r from-[#0B7285] to-[#0d8fa3] hover:from-[#0d8fa3] hover:to-[#0B7285] text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {editingRoute ? (
                <Edit2 className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editingRoute ? "Update Route" : "Save Route"}
            </button>
            <button
              onClick={() => {
                setEditingRoute(false);
                setRouteForm({ place1: "", place2: "" });
                prepareNewRoute();
              }}
              className="flex items-center gap-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-2.5 rounded-lg font-semibold transition-all duration-200"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Existing Routes
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Route ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Place 1
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Place 2
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(routes).map((r) => (
                    <tr
                      key={r.routeId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {r.routeId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {r.place1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {r.place2}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="inline-flex items-center gap-1 text-[#0B7285] hover:text-[#0d8fa3] font-medium text-sm transition-colors"
                            onClick={() => editRoute(r)}
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                            onClick={() => deleteRoute(r.routeId)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- BUS CRUD ---------- */}
      <section className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-[#0B7285] to-[#0d8fa3] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Manage Buses</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bus ID
              </label>
              <input
                placeholder="Bus ID"
                readOnly={!editingBus}
                className={`text-black w-full px-4 py-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent ${
                  !editingBus
                    ? "bg-gray-100 cursor-not-allowed"
                    : editingBus
                    ? "bg-yellow-50 border-yellow-300"
                    : "border-gray-300 hover:border-[#0B7285]"
                }`}
                value={busForm.busId}
                onChange={(e) =>
                  setBusForm({ ...busForm, busId: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route
              </label>
              <select
                className="text-black w-full px-4 py-2.5 border border-gray-300 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent hover:border-[#0B7285]"
                value={busForm.routeId}
                onChange={(e) =>
                  setBusForm({ ...busForm, routeId: e.target.value })
                }
              >
                <option value="">Select Route</option>
                {Object.values(routes).map((r) => (
                  <option key={r.routeId} value={r.routeId}>
                    {r.place1} - {r.place2}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner
              </label>
              <select
                className="text-black w-full px-4 py-2.5 border border-gray-300 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent hover:border-[#0B7285]"
                value={busForm.ownerId}
                onChange={(e) =>
                  setBusForm({ ...busForm, ownerId: e.target.value })
                }
              >
                <option value="">Select Owner</option>
                {Object.values(owners).map((o) => (
                  <option key={o.ownerId} value={o.ownerId}>
                    {o.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                placeholder="Latitude"
                className="text-black w-full px-4 py-2.5 border border-gray-300 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent hover:border-[#0B7285]"
                value={busForm.lat}
                onChange={(e) =>
                  setBusForm({ ...busForm, lat: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                placeholder="Longitude"
                className="text-black w-full px-4 py-2.5 border border-gray-300 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent hover:border-[#0B7285]"
                value={busForm.lon}
                onChange={(e) =>
                  setBusForm({ ...busForm, lon: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="text-black w-full px-4 py-2.5 border border-gray-300 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#0B7285] focus:border-transparent hover:border-[#0B7285]"
                value={busForm.status}
                onChange={(e) =>
                  setBusForm({ ...busForm, status: e.target.value })
                }
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveBus}
              className="flex items-center gap-2 bg-gradient-to-r from-[#0B7285] to-[#0d8fa3] hover:from-[#0d8fa3] hover:to-[#0B7285] text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {editingBus ? (
                <Edit2 className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editingBus ? "Update Bus" : "Save Bus"}
            </button>
            <button
              onClick={() => {
                setEditingBus(false);
                setBusForm({
                  routeId: "",
                  ownerId: "",
                  lat: "",
                  lon: "",
                  status: "offline"
                });
                prepareNewBus();
              }}
              className="flex items-center gap-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-2.5 rounded-lg font-semibold transition-all duration-200"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Existing Buses
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Bus ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Latitude
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Longitude
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Passengers
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(buses).map((b) => {
                    const passengerEntries = b.passengers
                      ? Object.entries(b.passengers)
                      : [];
                    const latestCount =
                      passengerEntries.length > 0
                        ? passengerEntries.sort(
                            ([a], [b]) => new Date(b) - new Date(a)
                          )[0][1]
                        : 0;

                    return (
                      <tr
                        key={b.busId}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {b.busId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {b.routeId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {b.ownerId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {b.lat}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {b.lon}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#0B7285]/10 text-[#0B7285]">
                            {latestCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleBusStatus(b)}
                            className={`w-24 inline-flex items-center justify-center gap-1 font-medium text-sm transition-colors rounded-full py-1 px-2 ${
                              b.status === "online"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {b.status === "online" ? "Online" : "Offline"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="inline-flex items-center gap-1 text-[#0B7285] hover:text-[#0d8fa3] font-medium text-sm transition-colors"
                              onClick={() => editBus(b)}
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                              onClick={() => deleteBus(b.busId)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                            <button
                              className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                              onClick={() =>
                                addPassengerCount(
                                  b.busId,
                                  parseInt(prompt("Enter passenger count:")) ||
                                    0
                                )
                              }
                            >
                              <Plus className="w-4 h-4" />
                              Passenger
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
