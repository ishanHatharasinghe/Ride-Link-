import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, set, remove, onValue } from "firebase/database";

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
    lon: ""
  });

  // ---------- EDIT FLAGS ----------
  const [editingOwner, setEditingOwner] = useState(false);
  const [editingRoute, setEditingRoute] = useState(false);
  const [editingBus, setEditingBus] = useState(false);

  // ---------- LOAD DATA ----------
  useEffect(() => {
    onValue(ref(db, "owners"), (snap) => setOwners(snap.val() || {}));
    onValue(ref(db, "routes"), (snap) => setRoutes(snap.val() || {}));
    onValue(ref(db, "buses"), (snap) => setBuses(snap.val() || {}));
  }, []);

  // ---------- OWNER CRUD ----------
  const saveOwner = async () => {
    if (!ownerForm.ownerId) return alert("Enter Owner ID");
    const ownerRef = ref(db, `owners/${ownerForm.ownerId}`);
    await set(ownerRef, ownerForm);
    alert(editingOwner ? "✅ Owner updated!" : "✅ Owner added!");
    setOwnerForm({
      ownerId: "",
      fullName: "",
      address: "",
      mobile: "",
      nic: "",
      permitId: "",
      email: "",
      password: ""
    });
    setEditingOwner(false);
  };

  const editOwner = (o) => {
    setOwnerForm(o);
    setEditingOwner(true);
  };

  const deleteOwner = async (id) => {
    if (window.confirm("Delete this owner?")) {
      await remove(ref(db, `owners/${id}`));
      setEditingOwner(false);
    }
  };

  // ---------- ROUTE CRUD ----------
  const saveRoute = async () => {
    if (!routeForm.routeId) return alert("Enter Route ID");
    const routeRef = ref(db, `routes/${routeForm.routeId}`);
    await set(routeRef, routeForm);
    alert(editingRoute ? "✅ Route updated!" : "✅ Route added!");
    setRouteForm({ routeId: "", place1: "", place2: "" });
    setEditingRoute(false);
  };

  const editRoute = (r) => {
    setRouteForm(r);
    setEditingRoute(true);
  };

  const deleteRoute = async (id) => {
    if (window.confirm("Delete this route?")) {
      await remove(ref(db, `routes/${id}`));
      setEditingRoute(false);
    }
  };

  // ---------- BUS CRUD ----------
  const saveBus = async () => {
    if (!busForm.busId) return alert("Enter Bus ID");
    if (!busForm.routeId || !busForm.ownerId)
      return alert("Select valid Route ID and Owner ID");

    const busRef = ref(db, `buses/${busForm.busId}`);
    await set(busRef, {
      busId: busForm.busId,
      routeId: busForm.routeId,
      ownerId: busForm.ownerId,
      lat: parseFloat(busForm.lat),
      lon: parseFloat(busForm.lon)
    });
    alert(editingBus ? "✅ Bus updated!" : "✅ Bus added!");
    setBusForm({ busId: "", routeId: "", ownerId: "", lat: "", lon: "" });
    setEditingBus(false);
  };

  const editBus = (b) => {
    setBusForm(b);
    setEditingBus(true);
  };

  const deleteBus = async (id) => {
    if (window.confirm("Delete this bus?")) {
      await remove(ref(db, `buses/${id}`));
      setEditingBus(false);
    }
  };

  // ---------- ADD PASSENGER COUNT ----------
  const addPassengerCount = async (busId, count) => {
    if (!count) return;
    const timestamp = new Date().toISOString().replace(/[.#$[\]:]/g, "_"); // ✅ sanitize
    await set(ref(db, `buses/${busId}/passengers/${timestamp}`), count);
    alert(`🧍 Added passenger count ${count} to ${busId}`);
  };

  // =============================================================
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col gap-10">
      <h1 className="text-3xl font-bold text-center text-indigo-500">
        🚌 RideLink Firebase CRUD Manager
      </h1>

      {/* ---------- OWNER CRUD ---------- */}
      <section className="bg-gray-900 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-indigo-400">
          Manage Owners
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["Owner ID", "ownerId"],
            ["Full Name", "fullName"],
            ["Address", "address"],
            ["Mobile", "mobile"],
            ["NIC", "nic"],
            ["Permit ID", "permitId"],
            ["Email", "email"],
            ["Password", "password"]
          ].map(([ph, key]) => (
            <input
              key={key}
              type={key === "password" ? "password" : "text"}
              placeholder={ph}
              className={`border p-2 rounded text-black ${
                key === "ownerId" && editingOwner ? "bg-yellow-100" : ""
              }`}
              value={ownerForm[key]}
              onChange={(e) =>
                setOwnerForm({ ...ownerForm, [key]: e.target.value })
              }
              disabled={key === "ownerId" && editingOwner}
            />
          ))}
        </div>

        <div className="mt-3">
          <button
            onClick={saveOwner}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded mr-2"
          >
            {editingOwner ? "Update Owner" : "Save Owner"}
          </button>
          <button
            onClick={() => {
              setOwnerForm({
                ownerId: "",
                fullName: "",
                address: "",
                mobile: "",
                nic: "",
                permitId: "",
                email: "",
                password: ""
              });
              setEditingOwner(false);
            }}
            className="border border-gray-500 px-4 py-2 rounded"
          >
            Clear
          </button>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2 text-indigo-300">
            Existing Owners
          </h3>
          <table className="w-full text-sm border border-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="border p-1">Owner ID</th>
                <th className="border p-1">Full Name</th>
                <th className="border p-1">Mobile</th>
                <th className="border p-1">Email</th>
                <th className="border p-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(owners).map((o) => (
                <tr key={o.ownerId} className="text-center">
                  <td className="border p-1">{o.ownerId}</td>
                  <td className="border p-1">{o.fullName}</td>
                  <td className="border p-1">{o.mobile}</td>
                  <td className="border p-1">{o.email}</td>
                  <td className="border p-1 space-x-2">
                    <button
                      className="text-yellow-400"
                      onClick={() => editOwner(o)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500"
                      onClick={() => deleteOwner(o.ownerId)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- ROUTE CRUD ---------- */}
      <section className="bg-gray-900 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-indigo-400">
          Manage Routes
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <input
            placeholder="Route ID"
            className={`border p-2 rounded text-black ${
              editingRoute ? "bg-yellow-100" : ""
            }`}
            value={routeForm.routeId}
            onChange={(e) =>
              setRouteForm({ ...routeForm, routeId: e.target.value })
            }
            disabled={editingRoute}
          />
          <input
            placeholder="Place 1"
            className="border p-2 rounded text-black"
            value={routeForm.place1}
            onChange={(e) =>
              setRouteForm({ ...routeForm, place1: e.target.value })
            }
          />
          <input
            placeholder="Place 2"
            className="border p-2 rounded text-black"
            value={routeForm.place2}
            onChange={(e) =>
              setRouteForm({ ...routeForm, place2: e.target.value })
            }
          />
        </div>

        <div className="mt-3">
          <button
            onClick={saveRoute}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded mr-2"
          >
            {editingRoute ? "Update Route" : "Save Route"}
          </button>
          <button
            onClick={() => {
              setRouteForm({ routeId: "", place1: "", place2: "" });
              setEditingRoute(false);
            }}
            className="border border-gray-500 px-4 py-2 rounded"
          >
            Clear
          </button>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2 text-indigo-300">
            Existing Routes
          </h3>
          <table className="w-full text-sm border border-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="border p-1">Route ID</th>
                <th className="border p-1">Place 1</th>
                <th className="border p-1">Place 2</th>
                <th className="border p-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(routes).map((r) => (
                <tr key={r.routeId} className="text-center">
                  <td className="border p-1">{r.routeId}</td>
                  <td className="border p-1">{r.place1}</td>
                  <td className="border p-1">{r.place2}</td>
                  <td className="border p-1 space-x-2">
                    <button
                      className="text-yellow-400"
                      onClick={() => editRoute(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500"
                      onClick={() => deleteRoute(r.routeId)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- BUS CRUD ---------- */}
      <section className="bg-gray-900 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-indigo-400">
          Manage Buses
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <input
            placeholder="Bus ID"
            className={`border p-2 rounded text-black ${
              editingBus ? "bg-yellow-100" : ""
            }`}
            value={busForm.busId}
            onChange={(e) => setBusForm({ ...busForm, busId: e.target.value })}
            disabled={editingBus}
          />

          <select
            className="border p-2 rounded text-black"
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

          <select
            className="border p-2 rounded text-black"
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

          <input
            placeholder="Latitude"
            className="border p-2 rounded text-black"
            value={busForm.lat}
            onChange={(e) => setBusForm({ ...busForm, lat: e.target.value })}
          />
          <input
            placeholder="Longitude"
            className="border p-2 rounded text-black"
            value={busForm.lon}
            onChange={(e) => setBusForm({ ...busForm, lon: e.target.value })}
          />
        </div>

        <div className="mt-3">
          <button
            onClick={saveBus}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded mr-2"
          >
            {editingBus ? "Update Bus" : "Save Bus"}
          </button>
          <button
            onClick={() => {
              setBusForm({
                busId: "",
                routeId: "",
                ownerId: "",
                lat: "",
                lon: ""
              });
              setEditingBus(false);
            }}
            className="border border-gray-500 px-4 py-2 rounded"
          >
            Clear
          </button>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2 text-indigo-300">Existing Buses</h3>
          <table className="w-full text-sm border border-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="border p-1">Bus ID</th>
                <th className="border p-1">Route</th>
                <th className="border p-1">Owner</th>
                <th className="border p-1">Latitude</th>
                <th className="border p-1">Longitude</th>
                <th className="border p-1">Latest Passenger Count</th>
                <th className="border p-1">Actions</th>
              </tr>
            </thead>
            <tbody>
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
                  <tr key={b.busId} className="text-center">
                    <td className="border p-1">{b.busId}</td>
                    <td className="border p-1">{b.routeId}</td>
                    <td className="border p-1">{b.ownerId}</td>
                    <td className="border p-1">{b.lat}</td>
                    <td className="border p-1">{b.lon}</td>
                    <td className="border p-1">{latestCount}</td>
                    <td className="border p-1 space-x-2">
                      <button
                        className="text-yellow-400"
                        onClick={() => editBus(b)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-500"
                        onClick={() => deleteBus(b.busId)}
                      >
                        Delete
                      </button>
                      <button
                        className="text-green-400"
                        onClick={() =>
                          addPassengerCount(
                            b.busId,
                            parseInt(prompt("Enter passenger count:")) || 0
                          )
                        }
                      >
                        + Passenger
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
