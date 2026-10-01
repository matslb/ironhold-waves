// Keep world art intact while submitting nearby opaque pieces in one draw.
// Call after world construction. Anything whose transform, visibility, geometry,
// or material assignment changes at runtime must be in an excluded subtree.
const MAX_VERTICES = 65535;
const MAX_INDICES = MAX_VERTICES * 6;
const RENDER_HOOKS = ["onBeforeRender", "onAfterRender", "onBeforeShadow", "onAfterShadow"];

function hasRenderHook(THREE, object) {
  return RENDER_HOOKS.some(name => {
    const standard = (object.isMesh ? THREE.Mesh.prototype[name] : undefined)
      ?? THREE.Object3D.prototype[name];
    return object[name] !== undefined && object[name] !== standard;
  });
}

function attributeLayout(geometry) {
  return Object.keys(geometry.attributes).sort().map(name => {
    const attribute = geometry.attributes[name];
    // Spatial attributes become ordinary floats after their transform is baked.
    const spatial = name === "position" || name === "normal" || name === "tangent";
    return [name, attribute.itemSize, spatial ? "Float32Array" : attribute.array.constructor.name,
      spatial ? false : attribute.normalized, attribute.gpuType].join(":");
  }).join("|");
}

function geometryRange(geometry) {
  const available = geometry.index ? geometry.index.count : geometry.attributes.position.count;
  const start = Math.max(0, geometry.drawRange.start);
  const count = Math.max(0, Math.min(available - start, geometry.drawRange.count));
  return { start, count };
}

function meshSkipReason(THREE, mesh) {
  if (mesh.isSkinnedMesh || mesh.isInstancedMesh || mesh.isBatchedMesh) return "animatedMesh";
  // Hiding/removing a Mesh must not change the visibility or transform of children.
  if (mesh.children.length) return "meshWithChildren";
  if (hasRenderHook(THREE, mesh) || mesh.customDepthMaterial || mesh.customDistanceMaterial) return "customRender";
  const material = mesh.material;
  if (!material || Array.isArray(material)) return "multipleMaterials";
  if (material.transparent || material.opacity < 1 || material.transmission > 0 || material.visible === false) return "transparent";
  if (material.isShaderMaterial || material.isRawShaderMaterial || material.displacementMap
    || (material.onBeforeCompile && material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile)
    || (material.customProgramCacheKey && material.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey)) return "customMaterial";
  const geometry = mesh.geometry;
  if (!geometry?.isBufferGeometry || !geometry.attributes.position) return "unsupportedGeometry";
  if (Object.values(geometry.morphAttributes || {}).some(attributes => attributes.length)
    || mesh.morphTargetInfluences?.length) return "morphTargets";
  if (geometry.index && (geometry.index.isInterleavedBufferAttribute
    || geometry.index.isGLBufferAttribute || !ArrayBuffer.isView(geometry.index.array)
    || geometry.index.itemSize !== 1)) return "unsupportedAttribute";
  const count = geometry.attributes.position.count;
  if (!count || count > MAX_VERTICES) return "largeGeometry";
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    if (attribute.isInterleavedBufferAttribute || attribute.isGLBufferAttribute
      || attribute.isInstancedBufferAttribute || attribute.isFloat16BufferAttribute
      || !ArrayBuffer.isView(attribute.array) || attribute.array instanceof DataView
      || attribute.count !== count || attribute.itemSize < 1 || attribute.itemSize > 4
      || attribute.array.constructor.name.includes("Big")) return "unsupportedAttribute";
    if ((name === "position" || name === "normal") && attribute.itemSize !== 3) return "unsupportedAttribute";
    if (name === "tangent" && attribute.itemSize !== 4) return "unsupportedAttribute";
  }
  const range = geometryRange(geometry);
  if (!Number.isInteger(range.start) || !Number.isInteger(range.count)
    || range.start % 3 || range.count % 3 || !range.count || range.count > MAX_INDICES) return "drawRange";
  return null;
}

function copyMergedGeometry(THREE, entries) {
  const vertexCount = entries.reduce((total, entry) => total + entry.vertices, 0);
  const indexCount = entries.reduce((total, entry) => total + entry.range.count, 0);
  const geometry = new THREE.BufferGeometry();
  const sample = entries[0].mesh.geometry;
  const destinations = {};
  for (const [name, source] of Object.entries(sample.attributes)) {
    const spatial = name === "position" || name === "normal" || name === "tangent";
    const ArrayType = spatial ? Float32Array : source.array.constructor;
    const attribute = new THREE.BufferAttribute(new ArrayType(vertexCount * source.itemSize),
      source.itemSize, spatial ? false : source.normalized);
    if (source.gpuType !== undefined) attribute.gpuType = source.gpuType;
    destinations[name] = attribute;
    geometry.setAttribute(name, attribute);
  }
  const indices = new Uint16Array(indexCount);
  const vector = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const entry of entries) {
    const sourceGeometry = entry.mesh.geometry;
    normalMatrix.getNormalMatrix(entry.matrix);
    for (const [name, source] of Object.entries(sourceGeometry.attributes)) {
      const destination = destinations[name];
      if (name === "position" || name === "normal" || name === "tangent") {
        for (let vertex = 0; vertex < entry.vertices; vertex++) {
          vector.set(source.getX(vertex), source.getY(vertex), source.getZ(vertex));
          if (name === "position") vector.applyMatrix4(entry.matrix);
          else if (name === "normal") vector.applyMatrix3(normalMatrix).normalize();
          else vector.transformDirection(entry.matrix);
          destination.setXYZ(vertexOffset + vertex, vector.x, vector.y, vector.z);
          if (name === "tangent") destination.setW(vertexOffset + vertex, source.getW(vertex));
        }
      } else {
        destination.array.set(source.array, vertexOffset * source.itemSize);
      }
    }
    for (let index = 0; index < entry.range.count; index++) {
      indices[indexOffset++] = vertexOffset + (sourceGeometry.index
        ? sourceGeometry.index.getX(entry.range.start + index) : entry.range.start + index);
    }
    vertexOffset += entry.vertices;
  }
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Build reversible, spatially culled batches under a static world root.
 * Materials/geometry belonging to the original art are never changed/disposed.
 * Original leaves are detached (their transforms remain intact); exclude every
 * object that gameplay will move, hide, raycast, or otherwise reference live.
 */
export function buildStaticWorldBatches({ THREE, root, excludeRoots = [], cellSize = 32 }) {
  if (!THREE || !root?.isObject3D) throw new TypeError("A THREE namespace and world root are required");
  const size = Number.isFinite(cellSize) && cellSize > 0 ? cellSize : 32;
  const excluded = new Set(excludeRoots.filter(Boolean));
  const stats = { sourceMeshes: 0, batchedMeshes: 0, batches: 0, vertices: 0, indices: 0,
    drawCallsSaved: 0, detachedNodes: 0, frozenNodes: 0, skippedByReason: {} };
  const skip = reason => { stats.skippedByReason[reason] = (stats.skippedByReason[reason] || 0) + 1; };
  const buckets = new Map();
  const bounds = new WeakMap();
  const materialIds = new Map();
  const originalNodes = new Set();
  const eligibleMeshes = new Set();
  const sourceParents = new Set();
  const removed = [];
  const frozen = [];
  const generated = [];
  root.updateWorldMatrix(true, true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const center = new THREE.Vector3();
  const batchGroup = new THREE.Group();
  batchGroup.name = "Static world batches";
  batchGroup.matrixAutoUpdate = false;

  function countSkippedSubtree(object, reason) {
    object.traverse(child => {
      originalNodes.add(child);
      if (child.isMesh) { stats.sourceMeshes++; skip(reason); }
    });
  }

  function visit(object, groupOrder) {
    originalNodes.add(object);
    if (excluded.has(object) || object.userData?.staticBatch === false) {
      countSkippedSubtree(object, "excluded");
      return;
    }
    if (object !== root && !object.visible) {
      countSkippedSubtree(object, "hidden");
      return;
    }
    if (hasRenderHook(THREE, object)) {
      countSkippedSubtree(object, "customRender");
      return;
    }
    const order = object.isGroup ? object.renderOrder : groupOrder;
    if (object.isMesh) {
      stats.sourceMeshes++;
      const reason = meshSkipReason(THREE, object);
      if (reason) skip(reason);
      else {
        const matrix = new THREE.Matrix4().multiplyMatrices(inverseRoot, object.matrixWorld);
        // A reflected transform changes triangle winding and tangent handedness.
        // Keep mirrored pieces separate rather than silently reversing their art.
        const determinant = matrix.determinant();
        if (!Number.isFinite(determinant) || determinant <= 1e-10) skip("reflectedTransform");
        else {
          const geometry = object.geometry;
          if (!bounds.has(geometry)) {
            const positions = geometry.attributes.position;
            const minimum = [Infinity, Infinity, Infinity];
            const maximum = [-Infinity, -Infinity, -Infinity];
            for (let vertex = 0; vertex < positions.count; vertex++) {
              const coordinates = [positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)];
              for (let axis = 0; axis < 3; axis++) {
                minimum[axis] = Math.min(minimum[axis], coordinates[axis]);
                maximum[axis] = Math.max(maximum[axis], coordinates[axis]);
              }
            }
            bounds.set(geometry, minimum.map((value, axis) => (value + maximum[axis]) / 2));
          }
          center.fromArray(bounds.get(geometry)).applyMatrix4(matrix);
          if (!materialIds.has(object.material)) materialIds.set(object.material, materialIds.size);
          const key = [materialIds.get(object.material), Math.floor(center.x / size), Math.floor(center.z / size),
            !!object.castShadow, !!object.receiveShadow, object.renderOrder, order,
            object.layers.mask, !!object.frustumCulled, attributeLayout(geometry)].join(";");
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push({ mesh: object, matrix, groupOrder: order,
            vertices: geometry.attributes.position.count, range: geometryRange(geometry) });
          eligibleMeshes.add(object);
        }
      }
    }
    for (const child of object.children) visit(child, order);
  }
  visit(root, root.renderOrder);

  // Build everything before changing the original hierarchy so failed builds
  // leave the source art renderable. Every buffer has a fixed upper bound.
  function emit(entries) {
    if (entries.length < 2) return;
    const first = entries[0];
    const geometry = copyMergedGeometry(THREE, entries);
    const mesh = new THREE.Mesh(geometry, first.mesh.material);
    mesh.name = `Static batch ${stats.batches + 1}`;
    mesh.castShadow = first.mesh.castShadow;
    mesh.receiveShadow = first.mesh.receiveShadow;
    mesh.renderOrder = first.mesh.renderOrder;
    mesh.layers.mask = first.mesh.layers.mask;
    mesh.frustumCulled = first.mesh.frustumCulled;
    mesh.matrixAutoUpdate = false;
    // Preserve an authored parent Group's sorting order, too.
    const parent = new THREE.Group();
    parent.renderOrder = first.groupOrder;
    parent.matrixAutoUpdate = false;
    parent.add(mesh);
    batchGroup.add(parent);
    generated.push({ mesh, entries });
    stats.batches++;
    stats.batchedMeshes += entries.length;
    stats.vertices += geometry.attributes.position.count;
    stats.indices += geometry.index.count;
  }
  try {
    for (const entries of buckets.values()) {
      let chunk = [], vertices = 0, indices = 0;
      for (const entry of entries) {
        if (vertices + entry.vertices > MAX_VERTICES || indices + entry.range.count > MAX_INDICES) {
          emit(chunk);
          chunk = []; vertices = 0; indices = 0;
        }
        chunk.push(entry);
        vertices += entry.vertices;
        indices += entry.range.count;
      }
      emit(chunk);
    }
  } catch (error) {
    for (const batch of generated) batch.mesh.geometry.dispose();
    throw error;
  }

  function detach(object) {
    const parent = object.parent;
    if (!parent) return;
    // Capture sibling order before any removal. Original node indices are
    // stored on demand for each parent, allowing exact restoration on dispose.
    if (!sourceParents.has(parent)) {
      sourceParents.add(parent);
    }
    removed.push({ object, parent });
    parent.remove(object);
    stats.detachedNodes++;
  }
  const originalChildOrder = new Map();
  for (const object of originalNodes) {
    originalChildOrder.set(object, new Map(object.children.map((child, index) => [child, index])));
  }
  for (const { entries } of generated) for (const { mesh } of entries) detach(mesh);
  // Empty authored groups have no remaining live descendants. Remove those
  // too, leaving excluded groups/meshes and initially empty groups untouched.
  function prune(object) {
    let removedDescendant = false;
    for (const child of [...object.children]) removedDescendant = prune(child) || removedDescendant;
    const lostChildren = originalChildOrder.get(object)?.size > object.children.length;
    if (object !== root && object.isGroup && !excluded.has(object)
      && object.userData?.staticBatch !== false && object.children.length === 0
      && (lostChildren || removedDescendant)) {
      detach(object);
      return true;
    }
    return removedDescendant;
  }
  prune(root);
  // Eligible singleton leaves are static too. Preserve their local matrix once;
  // don't freeze any ancestor shared with runtime objects or excluded paths.
  for (const mesh of eligibleMeshes) {
    if (mesh.parent && mesh.matrixAutoUpdate) {
      frozen.push({ object: mesh, matrixAutoUpdate: mesh.matrixAutoUpdate });
      mesh.matrixAutoUpdate = false;
      stats.frozenNodes++;
    }
  }
  if (generated.length) root.add(batchGroup);
  stats.drawCallsSaved = stats.batchedMeshes - stats.batches;
  let disposed = false;
  return {
    group: batchGroup,
    stats,
    dispose() {
      if (disposed) return;
      disposed = true;
      batchGroup.removeFromParent();
      for (const batch of generated) batch.mesh.geometry.dispose();
      // Parents can themselves be detached; reattach them in reverse removal
      // order, then restore original ordering alongside untouched live nodes.
      for (let index = removed.length - 1; index >= 0; index--) {
        const { object, parent } = removed[index];
        parent.add(object);
      }
      for (const parent of sourceParents) {
        const order = originalChildOrder.get(parent);
        parent.children.sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity));
      }
      for (const { object, matrixAutoUpdate } of frozen) object.matrixAutoUpdate = matrixAutoUpdate;
    }
  };
}
