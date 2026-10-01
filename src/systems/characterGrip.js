// Weapons retain their existing pivots and attack paths. Only annotated arm
// meshes are posed after animation, so the hand follows a pivot-local handle.
export function createArmGripSolver({ THREE }) {
  const scratchByRig = new WeakMap();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const epsilon = 1e-7;

  function scratchFor(rig) {
    let scratch = scratchByRig.get(rig);
    if (scratch) return scratch;
    const upperLength = rig.upperLength || 0.4;
    const lowerLength = rig.lowerLength || 0.4;
    scratch = {
      target: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      bend: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      axis: new THREE.Vector3(),
      upperScaleY: rig.upper.scale.y,
      lowerScaleY: rig.forearm.scale.y,
      upperHeight: rig.upper.geometry?.parameters?.height || upperLength,
      lowerHeight: rig.forearm.geometry?.parameters?.height || lowerLength,
      cuffOffset: rig.cuff ? rig.cuff.position.distanceTo(rig.hand.position) : 0
    };
    scratchByRig.set(rig, scratch);
    return scratch;
  }

  return function align(arm, pivot, { point, side = 1 } = {}) {
    const rig = arm?.userData?.gripRig;
    if (!pivot || !rig?.upper || !rig.forearm || !rig.hand) return false;
    const scratch = scratchFor(rig);
    const { target, direction, bend, elbow, axis } = scratch;
    target.set(point?.x || 0, point?.y || 0, point?.z || 0);
    pivot.localToWorld(target);
    arm.worldToLocal(target);
    const distance = target.length();
    if (!Number.isFinite(distance)) return false;

    let upperLength = Math.max(epsilon, rig.upperLength || 0.4);
    let lowerLength = Math.max(epsilon, rig.lowerLength || 0.4);
    // Rare long reaches stretch both links evenly instead of letting a hand
    // detach. Targets within the inner reach shorten only the longer link.
    const reach = upperLength + lowerLength;
    if (distance > reach) {
      const stretch = distance / reach;
      upperLength *= stretch;
      lowerLength *= stretch;
    } else if (distance < Math.abs(upperLength - lowerLength)) {
      if (upperLength > lowerLength) upperLength = lowerLength + distance;
      else lowerLength = upperLength + distance;
    }

    if (distance > epsilon) direction.copy(target).multiplyScalar(1 / distance);
    else direction.set(0, -1, 0);
    // Outward and behind the actor avoids elbows bending across the chest.
    bend.set(side < 0 ? -1 : 1, 0, 0.65);
    bend.addScaledVector(direction, -bend.dot(direction));
    if (bend.lengthSq() < epsilon) {
      bend.set(0, 1, 0).addScaledVector(direction, -direction.y);
    }
    bend.normalize();

    const along = distance > epsilon
      ? Math.max(-upperLength, Math.min(upperLength,
        (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance)))
      : 0;
    const radius = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    elbow.copy(direction).multiplyScalar(along).addScaledVector(bend, radius);

    rig.upper.position.copy(elbow).multiplyScalar(0.5);
    axis.copy(elbow).multiplyScalar(-1).normalize();
    rig.upper.quaternion.setFromUnitVectors(yAxis, axis);
    rig.upper.scale.y = scratch.upperScaleY * upperLength / scratch.upperHeight;
    if (rig.elbow) rig.elbow.position.copy(elbow);

    rig.forearm.position.copy(elbow).add(target).multiplyScalar(0.5);
    axis.copy(elbow).sub(target).normalize();
    rig.forearm.quaternion.setFromUnitVectors(yAxis, axis);
    rig.forearm.scale.y = scratch.lowerScaleY * lowerLength / scratch.lowerHeight;
    if (rig.cuff && rig.cuff !== rig.forearm) {
      rig.cuff.position.copy(target).addScaledVector(axis, Math.min(scratch.cuffOffset, lowerLength));
      rig.cuff.quaternion.copy(rig.forearm.quaternion);
    }
    rig.hand.position.copy(target);
    return true;
  };
}
