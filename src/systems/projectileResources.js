// Projectile factories list only resources they create privately. Cached
// primitive geometry and game-wide materials are deliberately absent.
export function disposeProjectileResources(projectile) {
  if (!projectile || projectile.resourcesDisposed) {
    return false;
  }
  projectile.resourcesDisposed = true;
  for (const geometry of projectile.ownedGeometries || []) {
    geometry.dispose();
  }
  for (const material of projectile.ownedMaterials || []) {
    material.dispose();
  }
  if (projectile.ownedGeometries) projectile.ownedGeometries.length = 0;
  if (projectile.ownedMaterials) projectile.ownedMaterials.length = 0;
  return true;
}
