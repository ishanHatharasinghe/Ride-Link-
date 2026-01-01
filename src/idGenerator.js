import { get, ref } from "firebase/database";
import { db } from "./firebase";

export const generateOwnerId = async () => {
  const ownersRef = ref(db, "owners");
  const snapshot = await get(ownersRef);
  const owners = snapshot.val() || {};
  const ownerIds = Object.keys(owners).map((id) => parseInt(id.replace("RidelinkOwner", ""), 10));
  const nextId = ownerIds.length > 0 ? Math.max(...ownerIds) + 1 : 1;
  return `RidelinkOwner${nextId.toString().padStart(3, "0")}`;
};

export const generatePermitId = async () => {
  // Assuming permits are linked to owners and we can derive the next permit ID
  const ownersRef = ref(db, "owners");
  const snapshot = await get(ownersRef);
  const owners = snapshot.val() || {};
  const permitIds = Object.values(owners).map((o) => parseInt(o.permitId.replace("RidelinkPermit", ""), 10));
  const nextId = permitIds.length > 0 ? Math.max(...permitIds) + 1 : 1;
  return `RidelinkPermit${nextId.toString().padStart(3, "0")}`;
};

export const generateRouteId = async () => {
  const routesRef = ref(db, "routes");
  const snapshot = await get(routesRef);
  const routes = snapshot.val() || {};
  const routeIds = Object.keys(routes).map((id) => parseInt(id.replace("R", ""), 10));
  const nextId = routeIds.length > 0 ? Math.max(...routeIds) + 1 : 1;
  return `R${nextId.toString().padStart(3, "0")}`;
};

export const generateBusId = async () => {
  const busesRef = ref(db, "buses");
  const snapshot = await get(busesRef);
  const buses = snapshot.val() || {};
  const busIds = Object.keys(buses).map((id) => parseInt(id.replace("RidelinkBus", ""), 10));
  const nextId = busIds.length > 0 ? Math.max(...busIds) + 1 : 1;
  return `RidelinkBus${nextId.toString().padStart(4, "0")}`;
};
