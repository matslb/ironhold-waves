import test from "node:test";
import assert from "node:assert/strict";
import { EnemySeparationGrid } from "../src/systems/enemySeparation.js";

function enemy(x, z, radius = 0.7, activityId = "") {
  return { position: { x, z }, velocity: { x: 0, z: 0 }, radius, activityId, dead: false };
}

function bruteForce(enemies, current, padding, pushScale, velocityScale, activityId = "") {
  for (const other of enemies) {
    if (other === current || other.dead || (activityId && other.activityId !== activityId)) continue;
    const dx = current.position.x - other.position.x;
    const dz = current.position.z - other.position.z;
    const d2 = dx * dx + dz * dz;
    const minDistance = current.radius + other.radius + padding;
    if (d2 > 0.0001 && d2 < minDistance * minDistance) {
      const d = Math.sqrt(d2);
      const push = (minDistance - d) * pushScale;
      current.velocity.x += (dx / d) * push * velocityScale;
      current.velocity.z += (dz / d) * push * velocityScale;
    }
  }
}

function compareWithScan(enemies, current, grid, padding = 0.2, pushScale = 0.45, velocityScale = 2.4, activityId = "") {
  current.velocity.x = 0;
  current.velocity.z = 0;
  bruteForce(enemies, current, padding, pushScale, velocityScale, activityId);
  const expected = { ...current.velocity };
  current.velocity.x = 0;
  current.velocity.z = 0;
  grid.apply(current, padding, pushScale, velocityScale);
  assert.deepEqual(current.velocity, expected);
}

test("separation includes cell boundaries, negative coordinates and large bodies", () => {
  const enemies = [enemy(-0.01, -4.01), enemy(0.01, -3.99), enemy(4.01, 0, 5), enemy(-4.01, 0, 5), enemy(80, 80)];
  const grid = new EnemySeparationGrid(4, 0);
  grid.rebuild(enemies);
  for (const current of enemies) compareWithScan(enemies, current, grid);
});

test("moved enemies remain discoverable during the same sequential frame", () => {
  const enemies = [enemy(-40, 1), enemy(0.5, 0), enemy(1, 0), enemy(40, 0)];
  const grid = new EnemySeparationGrid(4, 0);
  grid.rebuild(enemies);
  enemies[0].position = { x: 0, z: 0 };
  grid.update(enemies[0]);
  compareWithScan(enemies, enemies[1], grid);
  enemies[2].position = { x: 39.5, z: 0 };
  grid.update(enemies[2]);
  compareWithScan(enemies, enemies[3], grid);
  compareWithScan(enemies, enemies[0], grid);
});

test("activity membership, deaths and rebuilds cannot leave stale neighbors", () => {
  const enemies = [enemy(0, 0, 0.7, "arena"), enemy(0.5, 0, 0.7, "arena"), enemy(-0.5, 0, 0.7, "dungeon")];
  const grid = new EnemySeparationGrid(4, 0);
  grid.rebuild(enemies, "arena");
  compareWithScan(enemies, enemies[0], grid, 0.18, 0.5, 3.2, "arena");
  enemies[1].dead = true;
  compareWithScan(enemies, enemies[0], grid, 0.18, 0.5, 3.2, "arena");
  grid.update(enemies[1]);
  grid.rebuild([enemies[0]]);
  grid.apply(enemies[0], 0.18, 0.5, 3.2);
  assert.deepEqual(enemies[0].velocity, { x: 0, z: 0 });
  grid.rebuild(enemies);
  compareWithScan(enemies, enemies[0], grid);
});

test("coincident and exactly non-overlapping bodies keep the existing collision limits", () => {
  const enemies = [enemy(0, 0), enemy(0, 0), enemy(1.6, 0), enemy(0.005, 0)];
  const grid = new EnemySeparationGrid(4, 0);
  grid.rebuild(enemies);
  compareWithScan(enemies, enemies[0], grid);
  assert.deepEqual(enemies[0].velocity, { x: 0, z: 0 });
});

test("dense sequential simulations match the full scan after bucket moves", () => {
  let randomState = 147;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const enemies = Array.from({ length: 180 }, () => enemy((random() - 0.5) * 30, (random() - 0.5) * 30, 0.4 + random() * 2));
  const grid = new EnemySeparationGrid();
  for (let frame = 0; frame < 6; frame += 1) {
    grid.rebuild(enemies);
    for (const current of enemies) {
      compareWithScan(enemies, current, grid);
      current.position.x += current.velocity.x * 0.2 + (random() - 0.5) * 3;
      current.position.z += current.velocity.z * 0.2 + (random() - 0.5) * 3;
      grid.update(current);
    }
  }
});

test("small-population fallback matches the grid when populations shrink and regrow", () => {
  const enemies = Array.from({ length: 140 }, (_, index) => enemy(Math.sin(index) * 4, Math.cos(index) * 4));
  const grid = new EnemySeparationGrid();
  grid.rebuild(enemies);
  compareWithScan(enemies, enemies[0], grid);
  const smallWave = enemies.slice(0, 8);
  grid.rebuild(smallWave);
  smallWave[1].position.x += 10;
  grid.update(smallWave[1]);
  compareWithScan(smallWave, smallWave[0], grid);
  grid.rebuild(enemies);
  compareWithScan(enemies, enemies[0], grid);
});
