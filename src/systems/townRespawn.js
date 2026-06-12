export function villageDisplayName(village) {
  return village && village.name ? village.name : "Village";
}

export function normalizeRespawnLocal(value, radius = 420) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const x = Number(value.x);
  const z = Number(value.z);
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x, z) > radius) {
    return null;
  }
  return {
    x: Math.round(x * 100) / 100,
    z: Math.round(z * 100) / 100
  };
}

function villageCenterLocal(village, origin) {
  if (!village) {
    return null;
  }
  const localX = Number.isFinite(village.localX) ? village.localX : village.x - origin.x;
  const localZ = Number.isFinite(village.localZ) ? village.localZ : village.z - origin.z;
  return normalizeRespawnLocal({ x: localX, z: localZ });
}

function respawnPositionFromLocal(exploration, local, explorationToWorld) {
  const normalized = normalizeRespawnLocal(local, exploration.radius - 3);
  return normalized ? explorationToWorld(normalized.x, normalized.z) : null;
}

function villageCenterPosition(exploration, village, explorationToWorld) {
  return respawnPositionFromLocal(exploration, villageCenterLocal(village, exploration.origin), explorationToWorld)
    || exploration.spawn.clone();
}

export function restoreSavedTownRespawnPoint(exploration, explorationToWorld) {
  const townId = exploration.respawnTownId || "";
  if (!townId) {
    exploration.respawnPoint = respawnPositionFromLocal(exploration, exploration.respawnLocal, explorationToWorld);
    return !!exploration.respawnPoint;
  }
  const town = exploration.villages.find(village => village.id === townId);
  if (!town) {
    exploration.respawnTownId = "";
    exploration.respawnPoint = respawnPositionFromLocal(exploration, exploration.respawnLocal, explorationToWorld);
    return !!exploration.respawnPoint;
  }
  exploration.respawnLocal = villageCenterLocal(town, exploration.origin);
  exploration.respawnPoint = villageCenterPosition(exploration, town, explorationToWorld);
  return true;
}

export function setExplorationRespawnTown(exploration, village, explorationToWorld) {
  if (!village || !village.id) {
    return false;
  }
  const local = villageCenterLocal(village, exploration.origin);
  const previousLocal = exploration.respawnLocal;
  const changed = exploration.respawnTownId !== village.id
    || !previousLocal
    || !local
    || Math.hypot(previousLocal.x - local.x, previousLocal.z - local.z) > 0.05;
  exploration.respawnTownId = village.id;
  exploration.respawnLocal = local;
  exploration.respawnPoint = villageCenterPosition(exploration, village, explorationToWorld);
  return changed;
}

export function currentExplorationRespawnPosition(exploration, explorationToWorld) {
  if (exploration.respawnPoint) {
    return exploration.respawnPoint.clone();
  }
  if (restoreSavedTownRespawnPoint(exploration, explorationToWorld) && exploration.respawnPoint) {
    return exploration.respawnPoint.clone();
  }
  return exploration.spawn.clone();
}
