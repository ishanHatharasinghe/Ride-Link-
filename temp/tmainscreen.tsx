// @ts-nocheck
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  CSSProperties,
  MouseEvent
} from "react";
import "./mainScreen.css";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { db as firebaseDb } from "./firebase";
import { ref, onValue } from "firebase/database";
import logo from "./assets/ridelinklogo.png";
import Crud from "./CRUD";
import io from "socket.io-client";

/* Leaflet default icons setup */
try {
  delete (L as any).Icon.Default.prototype._getIconUrl;
  (L as any).Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
  });
} catch (e) {}

/* Types */
type LatLon = { lat: number; lon: number };
type MaybeLatLon = LatLon | null;
type Bus = {
  busId?: string;
  routeId?: string;
  lat?: number;
  lon?: number;
  passengers?: number;
  status?: "online" | "offline";
  [k: string]: any;
};
type Route = {
  routeId?: string;
  name?: string;
  place1?: string;
  place2?: string;
  stops?: Array<{
    lat?: number | string;
    lon?: number | string;
    [k: string]: any;
  }>;
  [k: string]: any;
};
type SearchPayload = {
  start: MaybeLatLon;
  end: MaybeLatLon;
  route: Route | null;
  segment: Array<[number, number]>;
};

/* App component */
export default function App(): JSX.Element {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [highlight, setHighlight] = useState<Array<[number, number]>>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [searchStart, setSearchStart] = useState<MaybeLatLon>(null);
  const [searchEnd, setSearchEnd] = useState<MaybeLatLon>(null);
  const [userLoc, setUserLoc] = useState<MaybeLatLon>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "success" | "not_found" | "error"
  >("idle");
  const [searchMessage, setSearchMessage] = useState<string>("");
  const mapRef = useRef<any | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const socket = io("http://localhost:4002");

    // ✅ 1️⃣ Fetch latest data from API when app loads or refreshes
    const fetchApiData = async () => {
      try {
        const response = await fetch("http://localhost:4002/api/buses");
        const data = await response.json();

        // Merge API data with Firebase buses
        setBuses((prev) =>
          prev.map((bus) => ({
            ...bus,
            ...(data[bus.busId] || {})
          }))
        );

        console.log("✅ Loaded live API data:", data);
      } catch (err) {
        console.error("❌ Error fetching API buses:", err);
      }
    };

    fetchApiData(); // Run immediately on mount

    // ✅ 2️⃣ Continue to listen for live updates via socket.io
    socket.on("initialData", (data) => {
      console.log("Initial data from socket:", data);
      setBuses((prev) =>
        prev.map((bus) => ({
          ...bus,
          ...(data[bus.busId] || {})
        }))
      );
    });

    socket.on(
      "busLocationUpdate",
      ({ busId, lat, lon, passengers, status }) => {
        setBuses((prev) =>
          prev.map((bus) =>
            bus.busId === busId
              ? {
                  ...bus,
                  lat,
                  lon,
                  passengers,
                  status,
                  lastUpdateSource: "API",
                  lastUpdated: Date.now()
                }
              : bus
          )
        );
      }
    );

    socket.on("busStatusUpdate", ({ busId, status }) => {
      setBuses((prev) =>
        prev.map((bus) =>
          bus.busId === busId
            ? {
                ...bus,
                status,
                lastUpdateSource: "API",
                lastUpdated: Date.now()
              }
            : bus
        )
      );
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    try {
      const busesRef = ref(firebaseDb, "buses");
      const routesRef = ref(firebaseDb, "routes");

      const unsub1 = onValue(busesRef, (snap) => {
        const val = snap.val();
        if (val) {
          const firebaseBusData = Object.keys(val).map((key) => ({
            ...val[key],
            busId: key
          }));

          setBuses((prevBuses) => {
            const prevBusesMap = new Map(
              prevBuses.map((bus) => [bus.busId, bus])
            );

            const mergedBuses = firebaseBusData.map((firebaseBus) => {
              const prevBus = prevBusesMap.get(firebaseBus.busId);
              if (prevBus) {
                // If bus exists, merge. Prioritize real-time data.
                return {
                  ...firebaseBus, // Static data from Firebase (routeId, etc.)
                  lat: prevBus.lat ?? firebaseBus.lat,
                  lon: prevBus.lon ?? firebaseBus.lon,
                  passengers: prevBus.passengers ?? firebaseBus.passengers,
                  lastUpdateSource: prevBus.lastUpdateSource,
                  lastUpdated: prevBus.lastUpdated
                };
              }
              return firebaseBus; // New bus from Firebase
            });
            console.log("✅ Merged Firebase data with existing state");
            return mergedBuses;
          });
        } else {
          setBuses([]);
        }
      });

      const unsub2 = onValue(routesRef, (snap) => {
        const val = snap.val();
        if (val) {
          // Convert nested structure to array
          const routeArray = Object.keys(val).map((key) => ({
            ...val[key],
            routeId: key // Use the key as routeId
          }));
          console.log("Loaded routes:", routeArray);
          setRoutes(routeArray);
        } else {
          setRoutes([]);
        }
      });

      return () => {
        typeof unsub1 === "function" && unsub1();
        typeof unsub2 === "function" && unsub2();
      };
    } catch (e) {
      console.error("Firebase error:", e);
    }
  }, []);

  const activeBuses = useMemo(
    () => buses.filter((b) => isNum(b.lat) && isNum(b.lon)),
    [buses]
  );

  const visibleBuses = useMemo(() => {
    if (!selectedRoute) return activeBuses;

    const filtered = activeBuses.filter((b) => {
      const busRouteId = b.routeId?.toString().trim();
      const selectedRouteId = selectedRoute.routeId?.toString().trim();
      const match = busRouteId === selectedRouteId;

      console.log(
        `Bus ${b.busId} (route: "${busRouteId}") matches selected route "${selectedRouteId}":`,
        match
      );

      return match;
    });

    console.log(
      `Showing ${filtered.length} buses for route ${selectedRoute.routeId}:`,
      filtered.map((b) => b.busId)
    );

    return filtered;
  }, [activeBuses, selectedRoute]);

  const handleSearchResult = (
    result:
      | { status: "success"; payload: SearchPayload }
      | { status: "not_found" | "error"; message: string }
  ) => {
    if (result.status === "success") {
      const { start, end, route, segment } = result.payload;
      console.log("Search result:", {
        route: route?.routeId,
        routeName: route?.name,
        start,
        end,
        segmentLength: segment.length
      });
      setSearchStart(start);
      setSearchEnd(end);
      setSelectedRoute(route);
      setHighlight(segment || []);
      setSelectedBusId(null);
      setSearchStatus("success");
      setSearchMessage("");

      if (mapRef.current && segment && segment.length > 1) {
        try {
          const bounds = L.latLngBounds(segment);
          mapRef.current.fitBounds(bounds, { padding: [80, 80] });
        } catch (e) {
          console.error("Map zoom error:", e);
        }
      }
    } else {
      clearSelection();
      setSearchStatus(result.status);
      setSearchMessage(result.message);
    }
  };

  const clearSelection = () => {
    setSelectedRoute(null);
    setHighlight([]);
    setSearchStart(null);
    setSearchEnd(null);
    setSelectedBusId(null);
    setSearchStatus("idle");
    setSearchMessage("");
  };

  const myPoint = userLoc || searchStart || null;
  const handleSelectBus = (bus: Bus) => {
    setSelectedBusId(bus.busId || null);
  };

  return (
    <div className="container">
      <div className="mainContent main-content-container">
        <aside className="sidebar sidebar-container">
          <div className="sidebarGlow"></div>
          <div className="sidebarContent">
            <SearchPanel
              routes={routes}
              buses={buses}
              onSearchResult={handleSearchResult}
              onLocateMe={setUserLoc}
            />

            {(searchStatus === "not_found" || searchStatus === "error") && (
              <div
                className="panel"
                style={{
                  borderColor: "#f87171",
                  background:
                    "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(159, 18, 57, 0.2))"
                }}
              >
                <div className="panelGlow"></div>
                <h3 className="panelTitle" style={{ color: "#fca5a5" }}>
                  <svg
                    style={{ width: "20px", height: "20px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {searchStatus === "not_found"
                    ? "No Route Found"
                    : "Search Error"}
                </h3>
                <p style={{ color: "#fecaca", fontSize: "15px", margin: 0 }}>
                  {searchMessage}
                </p>
              </div>
            )}

            {selectedRoute && (
              <div
                className="panel"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(217, 70, 239, 0.25))",
                  animation: "slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  borderColor: "rgba(217, 70, 239, 0.4)"
                }}
              >
                <div className="panelGlow"></div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px"
                  }}
                >
                  <h3
                    style={{
                      color: "white",
                      fontWeight: 700,
                      fontSize: "18px",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <svg
                      style={{ width: "20px", height: "20px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Selected Route
                  </h3>
                  <button
                    onClick={clearSelection}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "white",
                      cursor: "pointer",
                      padding: "8px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      transition: "all 0.3s"
                    }}
                    onMouseEnter={(e: MouseEvent<HTMLButtonElement>) =>
                      ((e.currentTarget as any).style.background =
                        "rgba(255, 255, 255, 0.2)")
                    }
                    onMouseLeave={(e: MouseEvent<HTMLButtonElement>) =>
                      ((e.currentTarget as any).style.background =
                        "rgba(255, 255, 255, 0.1)")
                    }
                  >
                    <svg
                      style={{ width: "18px", height: "18px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div style={{ fontSize: "15px", color: "#e9d5ff" }}>
                  <InfoRow
                    label="Route Name"
                    value={
                      selectedRoute.name ||
                      `${selectedRoute.place1} - ${selectedRoute.place2}` ||
                      selectedRoute.routeId ||
                      "N/A"
                    }
                    valueColor="#fbbf24"
                  />
                  <InfoRow
                    label="Route ID"
                    value={selectedRoute.routeId}
                    valueColor="#34d399"
                  />
                  <InfoRow
                    label="Buses on Route"
                    value={visibleBuses.length}
                    valueColor="#ec4899"
                  />
                  {visibleBuses.length > 0 && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px",
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px"
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: "8px",
                          color: "#a78bfa"
                        }}
                      >
                        Active Buses:
                      </div>
                      {visibleBuses.map((bus) => (
                        <div
                          key={bus.busId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            padding: "4px 0"
                          }}
                        >
                          <span>Bus {bus.busId}</span>
                          <span style={{ color: "#10b981" }}>
                            {bus.passengers !== undefined
                              ? `${bus.passengers} passengers`
                              : "Active"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="panel">
              <div className="panelGlow"></div>
              <h3 className="panelTitle">
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    background: "#10b981",
                    borderRadius: "50%",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.2)"
                  }}
                ></div>
                {selectedRoute ? "Route Buses" : "Live Bus Feed"}
                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: "13px",
                    color: "#a78bfa",
                    fontWeight: 600
                  }}
                >
                  {visibleBuses.length} Online
                </div>
              </h3>
              <div
                style={{
                  maxHeight: "420px",
                  overflowY: "auto",
                  paddingRight: "4px"
                }}
              >
                {visibleBuses.length === 0 ? (
                  <EmptyState
                    message={
                      selectedRoute
                        ? "No buses active on this route"
                        : "No active buses"
                    }
                  />
                ) : (
                  visibleBuses.map((bus, i) => {
                    const dist =
                      myPoint && isNum(bus.lat) && isNum(bus.lon)
                        ? getDist(bus.lat!, bus.lon!, myPoint.lat, myPoint.lon)
                        : null;
                    return (
                      <BusCard
                        key={bus.busId || i}
                        bus={bus}
                        index={i}
                        onSelect={() => handleSelectBus(bus)}
                        isSelected={selectedBusId === bus.busId}
                        distanceMeters={dist}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="mapContainer">
          <MapContainer
            center={[6.0535, 80.221]}
            zoom={13}
            style={{ height: "100%", width: "100%" } as any}
            whenCreated={(map: any) => (mapRef.current = map)}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {!selectedRoute &&
              routes.map((r: Route, i: number) =>
                r.stops ? (
                  <Polyline
                    key={r.routeId || i}
                    positions={
                      (r.stops || []).map((s) => [
                        num(s.lat),
                        num(s.lon)
                      ]) as any
                    }
                    pathOptions={{
                      color: "#8b5cf6",
                      weight: 3,
                      opacity: 0.3,
                      lineCap: "round",
                      lineJoin: "round"
                    }}
                  />
                ) : null
              )}
            {selectedRoute && selectedRoute.stops && (
              <Polyline
                positions={
                  selectedRoute.stops.map((s) => [
                    num(s.lat),
                    num(s.lon)
                  ]) as any
                }
                pathOptions={{
                  color: "#8b5cf6",
                  weight: 3,
                  opacity: 0.25,
                  lineCap: "round",
                  lineJoin: "round"
                }}
              />
            )}
            {highlight.length > 0 && (
              <Polyline
                positions={highlight as any}
                pathOptions={{
                  color: "#ec4899",
                  weight: 7,
                  opacity: 0.9,
                  lineCap: "round",
                  lineJoin: "round"
                }}
              />
            )}
            {searchStart && (
              <CircleMarker
                center={[searchStart.lat, searchStart.lon]}
                radius={8}
                pathOptions={{
                  color: "#10b981",
                  fillColor: "#10b981",
                  fillOpacity: 0.9
                }}
              >
                <Popup>
                  <strong>Start</strong>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    {searchStart.lat.toFixed(5)}, {searchStart.lon.toFixed(5)}
                  </div>
                </Popup>
              </CircleMarker>
            )}
            {searchEnd && (
              <CircleMarker
                center={[searchEnd.lat, searchEnd.lon]}
                radius={8}
                pathOptions={{
                  color: "#f59e0b",
                  fillColor: "#f59e0b",
                  fillOpacity: 0.9
                }}
              >
                <Popup>
                  <strong>Destination</strong>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    {searchEnd.lat.toFixed(5)}, {searchEnd.lon.toFixed(5)}
                  </div>
                </Popup>
              </CircleMarker>
            )}
            {userLoc && (
              <CircleMarker
                center={[userLoc.lat, userLoc.lon]}
                radius={10}
                pathOptions={{
                  color: "#22d3ee",
                  fillColor: "#22d3ee",
                  fillOpacity: 0.6
                }}
              >
                <Popup>
                  <strong>My Location</strong>
                </Popup>
              </CircleMarker>
            )}
            {visibleBuses.map((b: Bus, i: number) => {
              const dist =
                myPoint && isNum(b.lat) && isNum(b.lon)
                  ? getDist(b.lat!, b.lon!, myPoint.lat, myPoint.lon)
                  : null;
              return (
                <Marker
                  key={b.busId || i}
                  position={[b.lat as number, b.lon as number]}
                  eventHandlers={{ click: () => handleSelectBus(b) }}
                >
                  <Popup>
                    <div style={{ padding: "12px", minWidth: "220px" }}>
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "#8b5cf6",
                          fontSize: "18px",
                          marginBottom: "10px"
                        }}
                      >
                        {b.busId || "Bus"}
                      </div>
                      <div style={{ fontSize: 14, color: "#374151" }}>
                        <div
                          style={{
                            marginBottom: "8px",
                            padding: "8px",
                            background: "#f3f4f6",
                            borderRadius: "6px"
                          }}
                        >
                          <span style={{ color: "#6b7280", fontWeight: 600 }}>
                            Route:{" "}
                          </span>
                          <span style={{ fontWeight: 700, color: "#8b5cf6" }}>
                            {b.routeId}
                          </span>
                        </div>
                        {b.passengers !== undefined && (
                          <div
                            style={{
                              marginBottom: "8px",
                              padding: "8px",
                              background: "#f0fdf4",
                              borderRadius: "6px"
                            }}
                          >
                            <span style={{ color: "#6b7280", fontWeight: 600 }}>
                              Passengers:{" "}
                            </span>
                            <span style={{ fontWeight: 700, color: "#10b981" }}>
                              {getLatestPassengerCount(b) ?? "N/A"}
                            </span>
                          </div>
                        )}
                        {dist && (
                          <div
                            style={{
                              padding: "8px",
                              background: "#ecfeff",
                              borderRadius: "6px"
                            }}
                          >
                            <span style={{ fontWeight: 700, color: "#06b6d4" }}>
                              {formatDistance(dist)} from you
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <div className="legend legend-container bg-black">
            <h4
              style={{
                color: "white",
                fontWeight: 700,
                fontSize: "16px",
                margin: "0 0 16px 0"
              }}
            >
              Map Legend
            </h4>
            <div style={{ fontSize: "13px" }}>
              {!selectedRoute && (
                <LegendRow color="#8b5cf6" label="Bus Routes" translucent />
              )}
              <LegendRow color="#ec4899" label="Selected Segment" />
              <LegendRow color="#10b981" label="Start" round />
              <LegendRow color="#f59e0b" label="Destination" round />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: 12
                }}
              >
                <img
                  src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png"
                  style={{ width: "16px", height: "24px" }}
                  alt="marker"
                />
                <span style={{ color: "#e9d5ff", fontWeight: "500" }}>
                  Bus (filtered)
                </span>
              </div>
              <LegendRow color="#22d3ee" label="My Location" round />
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.1); } }
        input:focus { border-color: rgba(139, 92, 246, 0.8) !important; box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15), 0 8px 16px rgba(139, 92, 246, 0.2) !important; }
        input::placeholder { color: rgba(167, 139, 250, 0.5); }
        button:hover:not(:disabled) { transform: translateY(-2px) scale(1.02); box-shadow: 0 16px 40px rgba(139, 92, 246, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset !important; }
        button:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.4); border-radius: 10px; }
        *::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.5); border-radius: 10px; border: 2px solid rgba(15, 23, 42, 0.4); }
        *::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.7); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* Icons */
function BusIcon(): JSX.Element {
  return (
    <svg
      style={{ width: 20, height: 20 }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
      />
    </svg>
  );
}
function RouteIcon(): JSX.Element {
  return (
    <svg
      style={{ width: 20, height: 20 }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

/* StatBadge */
function StatBadge({
  label,
  value,
  icon,
  color
}: {
  label: string;
  value: number | string;
  icon?: JSX.Element;
  color?: string;
}): JSX.Element {
  return (
    <div
      style={
        {
          background: color,
          borderRadius: "16px",
          padding: "16px 24px",
          boxShadow:
            "0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          cursor: "pointer",
          minWidth: "160px",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        } as CSSProperties
      }
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
        (e.currentTarget as HTMLElement).style.transform =
          "translateY(-4px) scale(1.05)";
      }}
      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
        (e.currentTarget as HTMLElement).style.transform =
          "translateY(0) scale(1)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px"
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.9)" }}>{icon}</div>
        <div
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase"
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          color: "white",
          fontSize: "28px",
          fontWeight: 900,
          letterSpacing: "-0.5px",
          textShadow: "0 2px 4px rgba(0,0,0,0.2)"
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* InfoRow */
function InfoRow({
  label,
  value,
  valueColor
}: {
  label: string;
  value: any;
  valueColor?: string;
}): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "10px",
        padding: "10px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "8px"
      }}
    >
      <span style={{ fontWeight: 500 }}>{label}:</span>
      <span style={{ fontWeight: 700, color: valueColor }}>{value}</span>
    </div>
  );
}

/* LegendRow */
function LegendRow({
  color,
  label,
  translucent,
  round
}: {
  color: string;
  label: string;
  translucent?: boolean;
  round?: boolean;
}): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "12px"
      }}
    >
      <div
        style={{
          width: round ? 12 : 24,
          height: round ? 12 : 4,
          background: color,
          opacity: translucent ? 0.5 : 1,
          borderRadius: round ? "50%" : "2px"
        }}
      ></div>
      <span style={{ color: "#e9d5ff", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* EmptyState */
function EmptyState({ message }: { message?: string }): JSX.Element {
  return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <svg
        style={{
          width: "64px",
          height: "64px",
          color: "#4c1d95",
          margin: "0 auto 16px"
        }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <p style={{ color: "#a78bfa", fontSize: "15px", margin: 0 }}>
        {message || "No active buses"}
      </p>
      <p style={{ color: "#6b7280", fontSize: "13px", margin: "8px 0 0 0" }}>
        Waiting for GPS signals...
      </p>
    </div>
  );
}

/* BusCard */
function BusCard({
  bus,
  index,
  onSelect,
  isSelected,
  distanceMeters
}: {
  bus: Bus;
  index: number;
  onSelect: () => void;
  isSelected: boolean;
  distanceMeters: number | null;
}): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  const passengerCount = getLatestPassengerCount(bus);

  return (
    <div
      onClick={onSelect}
      className="busCard"
      style={
        {
          transform: isHovered
            ? "translateX(8px) scale(1.02)"
            : "translateX(0) scale(1)",
          boxShadow: isHovered
            ? "0 12px 32px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
            : "0 4px 12px rgba(0, 0, 0, 0.2)",
          borderColor: isSelected
            ? "rgba(6, 182, 212, 0.8)"
            : isHovered
            ? "rgba(139, 92, 246, 0.5)"
            : "rgba(139, 92, 246, 0.25)",
          outline: isSelected ? "2px solid rgba(6,182,212,0.5)" : "none",
          animationDelay: `${index * 50}ms`
        } as CSSProperties
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)"
        }}
      ></div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(139, 92, 246, 0.5)"
            }}
          >
            <svg
              style={{ width: "24px", height: "24px", color: "white" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
          </div>
          <div>
            <div
              style={{
                color: "white",
                fontWeight: 700,
                fontSize: "16px",
                letterSpacing: "-0.3px"
              }}
            >
              {bus.busId}
            </div>
            <div
              style={{
                color: "#c4b5fd",
                fontSize: "13px",
                fontWeight: 500,
                marginTop: "2px"
              }}
            >
              Route {bus.routeId}
            </div>
            {passengerCount !== undefined && (
              <div
                style={{
                  color: "#10b981",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginTop: "2px"
                }}
              >
                {passengerCount} passengers
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            width: "10px",
            height: "10px",
            background: bus.status === "online" ? "#10b981" : "#f87171",
            borderRadius: "50%",
            boxShadow:
              bus.status === "online"
                ? "0 0 12px rgba(16, 185, 129, 0.8), 0 0 0 3px rgba(16, 185, 129, 0.2)"
                : "0 0 12px rgba(248, 113, 113, 0.8), 0 0 0 3px rgba(248, 113, 113, 0.2)",
            animation:
              bus.status === "online"
                ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                : "none"
          }}
        ></div>
      </div>
      {isFiniteNumber(distanceMeters) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: "rgba(6,182,212,0.12)",
            borderRadius: "10px",
            border: "1px solid rgba(6,182,212,0.3)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "#67e8f9",
              fontWeight: 600
            }}
          >
            <svg
              style={{ width: 18, height: 18, color: "#06b6d4" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 8v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8"
              />
            </svg>
            <span>Distance to you</span>
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#22d3ee",
              textShadow: "0 2px 8px rgba(34, 211, 238, 0.4)"
            }}
          >
            {formatDistance(distanceMeters!)}
          </div>
        </div>
      )}
    </div>
  );
}

/* SearchPanel with Advanced Functionality */
function SearchPanel({
  routes,
  buses,
  onSearchResult,
  onLocateMe
}: {
  routes: Route[];
  buses: Bus[];
  onSearchResult: (
    result:
      | { status: "success"; payload: SearchPayload }
      | { status: "not_found" | "error"; message: string }
  ) => void;
  onLocateMe?: (loc: LatLon | null) => void;
}): JSX.Element {
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [busIdText, setBusIdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [usingMyLoc, setUsingMyLoc] = useState(false);
  const [myLoc, setMyLoc] = useState<MaybeLatLon>(null);
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showEndDropdown, setShowEndDropdown] = useState(false);
  const [dbLocations, setDbLocations] = useState<string[]>([]);

  // Extract locations from routes using place1 and place2
  useEffect(() => {
    const locationSet = new Set<string>();
    routes.forEach((route) => {
      // Add place1 and place2 if they exist
      if (route.place1 && typeof route.place1 === "string") {
        locationSet.add(route.place1.trim());
      }
      if (route.place2 && typeof route.place2 === "string") {
        locationSet.add(route.place2.trim());
      }
      // Also extract from route name if available
      if (route.name) {
        const parts = route.name
          .split(/[-–—]|to/i)
          .map((p) => p.trim())
          .filter(Boolean);
        parts.forEach((part) => {
          if (part.length > 2) locationSet.add(part);
        });
      }
    });
    const locations = Array.from(locationSet).sort();
    console.log("Extracted locations from routes:", locations);
    setDbLocations(locations);
  }, [routes]);

  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation not supported in this browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setMyLoc(loc);
        setUsingMyLoc(true);
        onLocateMe && onLocateMe(loc);
        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to access your location.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  const handleStartChange = (text: string) => {
    setStartText(text);
    setUsingMyLoc(false);
    if (text.length > 0) {
      const filtered = dbLocations
        .filter((loc) => loc.toLowerCase().includes(text.toLowerCase()))
        .slice(0, 10);
      setStartSuggestions(filtered);
      setShowStartDropdown(filtered.length > 0);
    } else {
      setStartSuggestions(dbLocations.slice(0, 10));
      setShowStartDropdown(dbLocations.length > 0);
    }
  };

  const handleEndChange = (text: string) => {
    setEndText(text);
    if (text.length > 0) {
      const filtered = dbLocations
        .filter((loc) => loc.toLowerCase().includes(text.toLowerCase()))
        .slice(0, 10);
      setEndSuggestions(filtered);
      setShowEndDropdown(filtered.length > 0);
    } else {
      setEndSuggestions(dbLocations.slice(0, 10));
      setShowEndDropdown(dbLocations.length > 0);
    }
  };

  const selectStartSuggestion = (suggestion: string) => {
    setStartText(suggestion);
    setShowStartDropdown(false);
  };

  const selectEndSuggestion = (suggestion: string) => {
    setEndText(suggestion);
    setShowEndDropdown(false);
  };

  const searchRoute = async () => {
    setLoading(true);

    if (busIdText.trim()) {
      const busId = busIdText.trim();
      const bus = buses.find(
        (b) => b.busId?.toString().toLowerCase() === busId.toLowerCase()
      );

      if (bus) {
        const route = routes.find((r) => r.routeId === bus.routeId);
        if (route) {
          const stops = (route.stops || [])
            .map((s) => ({ lat: num(s.lat), lon: num(s.lon) }))
            .filter((s) => isNum(s.lat) && isNum(s.lon));

          if (stops.length > 0) {
            const start = stops[0];
            const end = stops[stops.length - 1];
            const segment = stops.map(
              (p) => [p.lat, p.lon] as [number, number]
            );
            onSearchResult({
              status: "success",
              payload: { start, end, route, segment }
            });
          } else {
            onSearchResult({
              status: "not_found",
              message: `Route ${route.routeId} found, but it has no stops.`
            });
          }
        } else {
          onSearchResult({
            status: "not_found",
            message: `Could not find route information for bus ${busId}.`
          });
        }
      } else {
        onSearchResult({
          status: "not_found",
          message: `Bus with ID "${busId}" not found.`
        });
      }
      setLoading(false);
      return;
    }

    if ((!startText && !usingMyLoc) || !endText) {
      onSearchResult({
        status: "error",
        message: "Please enter start/destination or a Bus ID."
      });
      setLoading(false);
      return;
    }
    try {
      const start = usingMyLoc && myLoc ? myLoc : await geocodeSafe(startText);
      const end = await geocodeSafe(endText);

      if (!start || !end) {
        onSearchResult({
          status: "error",
          message:
            "Could not resolve one or both locations. Please refine your input."
        });
        setLoading(false);
        return;
      }

      const startLocation = usingMyLoc ? "My Location" : startText.trim();
      const endLocation = endText.trim();

      console.log("Searching for route from", startLocation, "to", endLocation);

      // Find routes that match the start and end locations (bidirectional)
      const matchingRoutes = routes.filter((route) => {
        const place1 = (route.place1 || "").toLowerCase().trim();
        const place2 = (route.place2 || "").toLowerCase().trim();
        const startLower = startLocation.toLowerCase();
        const endLower = endLocation.toLowerCase();

        // Check both directions: start->end and end->start
        const forwardMatch =
          (place1.includes(startLower) && place2.includes(endLower)) ||
          (place1.includes(endLower) && place2.includes(startLower));

        // Also check route name for matches
        const routeName = (route.name || "").toLowerCase();
        const nameMatch =
          routeName.includes(startLower) && routeName.includes(endLower);

        console.log(`Route ${route.routeId}:`, {
          place1,
          place2,
          startLower,
          endLower,
          forwardMatch,
          nameMatch
        });

        return forwardMatch || nameMatch;
      });

      console.log(
        "Matching routes found:",
        matchingRoutes.length,
        matchingRoutes.map((r) => `${r.routeId}: ${r.place1} - ${r.place2}`)
      );

      let result = null;

      if (matchingRoutes.length > 0) {
        // Sort by relevance
        const scoredRoutes = matchingRoutes.map((route) => {
          const place1 = (route.place1 || "").toLowerCase().trim();
          const place2 = (route.place2 || "").toLowerCase().trim();
          const startLower = startLocation.toLowerCase();
          const endLower = endLocation.toLowerCase();

          let score = 0;

          // Exact matches get higher scores
          if (place1 === startLower && place2 === endLower) score += 3;
          else if (place1 === endLower && place2 === startLower) score += 2;
          else if (place1.includes(startLower) && place2.includes(endLower))
            score += 2;
          else if (place1.includes(endLower) && place2.includes(startLower))
            score += 1;

          return { route, score };
        });

        // Get the highest scored route
        scoredRoutes.sort((a, b) => b.score - a.score);
        const route = scoredRoutes[0].route;

        console.log(
          "Selected route:",
          route.routeId,
          "-",
          route.place1,
          "to",
          route.place2
        );

        // Count buses on this route
        const busesOnRoute = buses.filter((b) => {
          const busRouteId = b.routeId?.toString().trim();
          const selectedRouteId = route.routeId?.toString().trim();
          return busRouteId === selectedRouteId;
        });

        console.log(
          `Buses on route ${route.routeId}:`,
          busesOnRoute.length,
          busesOnRoute.map((b) => b.busId)
        );

        const stops = (route.stops || [])
          .map((s) => ({ lat: num(s.lat), lon: num(s.lon) }))
          .filter((s) => isNum(s.lat) && isNum(s.lon));

        if (stops.length >= 2) {
          const segment = stops.map((p) => [p.lat, p.lon] as [number, number]);
          result = { route, segment };
        } else {
          console.log(
            "Route has no stops with coordinates, creating segment from start to end"
          );
          const segment: Array<[number, number]> = [
            [start.lat, start.lon],
            [end.lat, end.lon]
          ];
          result = { route, segment };
        }
      }

      if (!result) {
        const message = `No matching route found between "${startLocation}" and "${endLocation}". Try searching for available routes.`;
        onSearchResult({ status: "not_found", message });
        setLoading(false);
        return;
      }

      const { route, segment } = result;
      onSearchResult({
        status: "success",
        payload: { start, end, route, segment }
      });
    } catch (e) {
      console.error(e);
      onSearchResult({
        status: "error",
        message: "Search failed. Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="panelGlow"></div>
      <h2 className="panelTitle">
        <svg
          style={{ width: 22, height: 22 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        Search Routes
      </h2>

      <div className="inputWrapper" style={{ position: "relative" }}>
        <div className="inputIcon">
          <svg
            style={{ width: 22, height: 22 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
            />
          </svg>
        </div>
        <input
          className="input"
          placeholder="Enter Bus ID"
          value={busIdText}
          onChange={(e) => setBusIdText(e.target.value)}
        />
      </div>

      <div
        style={{
          textAlign: "center",
          color: "#a78bfa",
          margin: "0px 0px 14px",
          fontWeight: 600
        }}
      >
        OR
      </div>

      <div className="inputWrapper" style={{ position: "relative" }}>
        <div className="inputIcon">
          <svg
            style={{ width: 22, height: 22 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <input
          className="input"
          placeholder={
            usingMyLoc ? "Using My Location" : "Select start location"
          }
          value={usingMyLoc ? "" : startText}
          onChange={(e) => handleStartChange(e.target.value)}
          onFocus={() => {
            if (!usingMyLoc) {
              if (startText.length > 0) {
                const filtered = dbLocations
                  .filter((loc) =>
                    loc.toLowerCase().includes(startText.toLowerCase())
                  )
                  .slice(0, 10);
                setStartSuggestions(filtered);
                setShowStartDropdown(filtered.length > 0);
              } else {
                setStartSuggestions(dbLocations.slice(0, 10));
                setShowStartDropdown(dbLocations.length > 0);
              }
            }
          }}
          onBlur={() => setTimeout(() => setShowStartDropdown(false), 200)}
          disabled={usingMyLoc}
        />
        {showStartDropdown && startSuggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: "12px",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              marginTop: "4px",
              maxHeight: "240px",
              overflowY: "auto",
              zIndex: 1000,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
            }}
          >
            {startSuggestions.map((suggestion, i) => (
              <div
                key={i}
                onClick={() => selectStartSuggestion(suggestion)}
                style={{
                  padding: "12px 16px",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  borderBottom:
                    i < startSuggestions.length - 1
                      ? "1px solid rgba(139, 92, 246, 0.2)"
                      : "none"
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <svg
                    style={{ width: 16, height: 16, color: "#a78bfa" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                  {suggestion}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={loading}
          className="button"
          style={{
            padding: "10px 12px",
            width: "auto",
            fontSize: 13
          }}
        >
          <svg
            style={{ width: 18, height: 18 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Use My Location
        </button>
        {usingMyLoc && (
          <span className="smallBadge" style={{ alignSelf: "center" }}>
            Location ready
          </span>
        )}
      </div>

      <div className="inputWrapper" style={{ position: "relative" }}>
        <div className="inputIcon">
          <svg
            style={{ width: 22, height: 22 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </div>
        <input
          className="input"
          placeholder="Select destination"
          value={endText}
          onChange={(e) => handleEndChange(e.target.value)}
          onFocus={() => {
            if (endText.length > 0) {
              const filtered = dbLocations
                .filter((loc) =>
                  loc.toLowerCase().includes(endText.toLowerCase())
                )
                .slice(0, 10);
              setEndSuggestions(filtered);
              setShowEndDropdown(filtered.length > 0);
            } else {
              setEndSuggestions(dbLocations.slice(0, 10));
              setShowEndDropdown(dbLocations.length > 0);
            }
          }}
          onBlur={() => setTimeout(() => setShowEndDropdown(false), 200)}
        />
        {showEndDropdown && endSuggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: "12px",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              marginTop: "4px",
              maxHeight: "240px",
              overflowY: "auto",
              zIndex: 1000,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
            }}
          >
            {endSuggestions.map((suggestion, i) => (
              <div
                key={i}
                onClick={() => selectEndSuggestion(suggestion)}
                style={{
                  padding: "12px 16px",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  borderBottom:
                    i < endSuggestions.length - 1
                      ? "1px solid rgba(139, 92, 246, 0.2)"
                      : "none"
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <svg
                    style={{ width: 16, height: 16, color: "#a78bfa" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                  {suggestion}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={searchRoute} disabled={loading} className="button">
        {loading ? (
          <>
            <svg
              style={{
                width: 22,
                height: 22,
                animation: "spin 1s linear infinite"
              }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                style={{ opacity: 0.25 }}
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                style={{ opacity: 0.75 }}
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Searching…
          </>
        ) : (
          <>
            <svg
              style={{ width: 22, height: 22 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Find Route
          </>
        )}
      </button>
    </div>
  );
}

/* Geo helpers */
const getDist = (a: number, b: number, c: number, d: number): number => {
  const R = 6371e3;
  const φ1 = (a * Math.PI) / 180,
    φ2 = (c * Math.PI) / 180,
    Δφ = ((c - a) * Math.PI) / 180,
    Δλ = ((d - b) * Math.PI) / 180;
  const h =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

async function geocodeSafe(q: string): Promise<LatLon | null> {
  if (!q || !q.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(
      q.trim()
    )}`;
    const r = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!r.ok) return null;
    const d = await r.json();
    if (!Array.isArray(d) || d.length === 0) return null;
    const lat = parseFloat(d[0].lat);
    const lon = parseFloat(d[0].lon);
    if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) return null;
    return { lat, lon };
  } catch (e) {
    console.error("geocodeSafe error", e);
    return null;
  }
}

function formatDistance(m: number | null): string {
  if (!isFiniteNumber(m)) return "-";
  if (m! >= 1000) return `${(m! / 1000).toFixed(2)} km`;
  return `${Math.round(m!)} m`;
}

function num(v: any): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}
function isNum(v: any): v is number {
  return typeof v === "number" && isFinite(v);
}
function isFiniteNumber(v: any): v is number {
  return typeof v === "number" && isFinite(v);
}

// Safely get passenger count - handle both number and object formats
function getLatestPassengerCount(bus: Bus): number | undefined {
  const { passengers } = bus;
  if (passengers === undefined || passengers === null) {
    return undefined;
  }
  if (typeof passengers === "number") {
    return passengers;
  }
  if (typeof passengers === "object") {
    const passengerEntries = Object.entries(passengers);
    if (passengerEntries.length > 0) {
      // Sort by timestamp (newest first) and get the latest count
      const sorted = passengerEntries.sort(
        ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
      );
      const latestCount = sorted[0][1];
      return typeof latestCount === "number" ? latestCount : undefined;
    }
  }
  return undefined;
}
