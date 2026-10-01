// A moving broad phase for enemy crowd separation. Each entry follows the
// enemy as the host processes a frame, so later enemies still see positions
// already advanced by earlier enemies, just as in the original full scan.
export class EnemySeparationGrid {
  constructor(cellSize = 4, minimumGridSize = 128) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new RangeError("Enemy separation cell size must be positive");
    }
    this.cellSize = cellSize;
    this.minimumGridSize = minimumGridSize;
    this.buckets = new Map();
    this.bucketPool = [];
    this.entries = new WeakMap();
    this.candidates = [];
    this.generation = 0;
    this.maxRadius = 0;
    this.usedBuckets = 0;
    this.linearEnemies = [];
    this.activityId = "";
    this.usingGrid = false;
  }

  rebuild(enemies, activityId = "") {
    for (let index = 0; index < this.usedBuckets; index += 1) {
      this.bucketPool[index].length = 0;
    }
    this.buckets.clear();
    this.candidates.length = 0;
    this.usedBuckets = 0;
    this.maxRadius = 0;
    this.generation += 1;
    this.linearEnemies = enemies;
    this.activityId = activityId;
    let livingCount = 0;
    for (const enemy of enemies) {
      if (!enemy.dead && (!activityId || enemy.activityId === activityId)) {
        livingCount += 1;
      }
    }
    this.usingGrid = livingCount >= this.minimumGridSize;
    // For small waves a direct scan costs less than hash lookups and sorting.
    if (!this.usingGrid) {
      return;
    }
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      if (enemy.dead || (activityId && enemy.activityId !== activityId)) {
        continue;
      }
      let entry = this.entries.get(enemy);
      if (!entry) {
        entry = { enemy };
        this.entries.set(enemy, entry);
      }
      entry.index = index;
      entry.generation = this.generation;
      this.maxRadius = Math.max(this.maxRadius, enemy.radius);
      this.insert(entry);
    }
  }

  insert(entry) {
    const { position } = entry.enemy;
    entry.cellX = Math.floor(position.x / this.cellSize);
    entry.cellZ = Math.floor(position.z / this.cellSize);
    const key = entry.cellX + "," + entry.cellZ;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = this.bucketPool[this.usedBuckets];
      if (!bucket) {
        bucket = [];
        this.bucketPool.push(bucket);
      }
      this.usedBuckets += 1;
      bucket.length = 0;
      this.buckets.set(key, bucket);
    }
    entry.bucket = bucket;
    entry.slot = bucket.length;
    bucket.push(entry);
  }

  update(enemy) {
    if (!this.usingGrid) {
      return;
    }
    const entry = this.entries.get(enemy);
    if (!entry || entry.generation !== this.generation) {
      return;
    }
    if (!enemy.dead
      && entry.cellX === Math.floor(enemy.position.x / this.cellSize)
      && entry.cellZ === Math.floor(enemy.position.z / this.cellSize)) {
      return;
    }
    const bucket = entry.bucket;
    const last = bucket.pop();
    if (last !== entry) {
      bucket[entry.slot] = last;
      last.slot = entry.slot;
    }
    if (enemy.dead) {
      entry.generation = 0;
      return;
    }
    this.maxRadius = Math.max(this.maxRadius, enemy.radius);
    this.insert(entry);
  }

  apply(enemy, padding, pushScale, velocityScale) {
    if (!this.usingGrid) {
      for (const other of this.linearEnemies) {
        if (other !== enemy && !other.dead && (!this.activityId || other.activityId === this.activityId)) {
          applySeparationForce(enemy, other, padding, pushScale, velocityScale);
        }
      }
      return;
    }
    const { x, z } = enemy.position;
    const reach = enemy.radius + this.maxRadius + padding;
    const minX = Math.floor((x - reach) / this.cellSize);
    const maxX = Math.floor((x + reach) / this.cellSize);
    const minZ = Math.floor((z - reach) / this.cellSize);
    const maxZ = Math.floor((z + reach) / this.cellSize);
    const candidates = this.candidates;
    candidates.length = 0;
    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      for (let cellZ = minZ; cellZ <= maxZ; cellZ += 1) {
        const bucket = this.buckets.get(cellX + "," + cellZ);
        if (!bucket) {
          continue;
        }
        for (const entry of bucket) {
          if (entry.enemy !== enemy && !entry.enemy.dead) {
            candidates.push(entry);
          }
        }
      }
    }
    // Keep the original sum order, including after bucket moves, so the
    // authoritative simulation's crowd forces remain identical.
    candidates.sort(compareEnemyOrder);
    for (const entry of candidates) {
      applySeparationForce(enemy, entry.enemy, padding, pushScale, velocityScale);
    }
  }
}

function applySeparationForce(enemy, other, padding, pushScale, velocityScale) {
  const dx = enemy.position.x - other.position.x;
  const dz = enemy.position.z - other.position.z;
  const distanceSq = dx * dx + dz * dz;
  const minDistance = enemy.radius + other.radius + padding;
  if (distanceSq > 0.0001 && distanceSq < minDistance * minDistance) {
    const distance = Math.sqrt(distanceSq);
    const push = (minDistance - distance) * pushScale;
    enemy.velocity.x += (dx / distance) * push * velocityScale;
    enemy.velocity.z += (dz / distance) * push * velocityScale;
  }
}

function compareEnemyOrder(a, b) {
  return a.index - b.index;
}
