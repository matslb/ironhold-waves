// Cosmetic bow lift/string draw only. Damage, aim, action timers and weapon
// ownership remain with the runtime. String halves use a cached unit box.
export function createRangerBowPoseSystem({ THREE }) {
  const yAxis = new THREE.Vector3(0, 1, 0);
  const restByArm = new WeakMap();
  const scratchByString = new WeakMap();

  function rememberArm(arm) {
    const rig = arm?.userData?.gripRig;
    if (!rig || restByArm.has(arm)) return;
    const saved = [];
    for (const mesh of [rig.upper, rig.elbow, rig.forearm, rig.cuff, rig.hand]) {
      if (mesh && !saved.some(entry => entry.mesh === mesh)) {
        saved.push({ mesh, position: mesh.position.clone(), quaternion: mesh.quaternion.clone(), scale: mesh.scale.clone() });
      }
    }
    restByArm.set(arm, saved);
  }

  function restoreArm(arm) {
    for (const saved of restByArm.get(arm) || []) {
      saved.mesh.position.copy(saved.position);
      saved.mesh.quaternion.copy(saved.quaternion);
      saved.mesh.scale.copy(saved.scale);
    }
  }

  function segment(mesh, tipY, string, scratch) {
    scratch.direction.set(0, tipY, 0.15).sub(string.center);
    const length = scratch.direction.length();
    mesh.position.copy(string.center).addScaledVector(scratch.direction, 0.5);
    mesh.quaternion.setFromUnitVectors(yAxis, scratch.direction.multiplyScalar(1 / length));
    mesh.scale.y = length;
  }

  return function update(actor, drawAmount, resetEase = 1) {
    const pivot = actor?.weaponPivot || actor?.bowPivot;
    if (!pivot || !pivot.parent) return null;
    let weapon = null;
    for (const child of pivot.children) {
      if (child.userData?.bowString) { weapon = child; break; }
    }
    if (!weapon) return null;
    const string = weapon.userData.bowString;
    rememberArm(actor.rightArm);
    const amount = Math.max(0, Math.min(1, Number.isFinite(drawAmount) ? drawAmount : 0));
    const ease = Math.max(0, Math.min(1, resetEase));
    pivot.position.y += (1 + amount * 0.62 - pivot.position.y) * ease;
    pivot.position.z += (-0.08 - amount * 0.4 - pivot.position.z) * ease;
    string.drawAmount = amount > 0.001 ? amount : 0;

    let scratch = scratchByString.get(string);
    if (!scratch) {
      scratch = { anchor: new THREE.Vector3(), target: new THREE.Vector3(), direction: new THREE.Vector3() };
      scratchByString.set(string, scratch);
    }
    string.center.set(0, 0, 0.15);
    if (string.drawAmount > 0 && actor.rightArm) {
      // The chest anchor sits in front of the jerkin; convert through the
      // actual rider/root transforms rather than assuming world height zero.
      scratch.anchor.set(0.08, 1.62, -0.54);
      pivot.parent.localToWorld(scratch.anchor);
      weapon.worldToLocal(scratch.anchor);
      string.center.lerp(scratch.anchor, amount);

      // The first reaching frames can be farther away than two arm links.
      // Keep the string midpoint inside that reach instead of stretching the
      // draw arm across the chest. Full draw naturally reaches the anchor.
      scratch.target.copy(string.center);
      weapon.localToWorld(scratch.target);
      actor.rightArm.worldToLocal(scratch.target);
      const rig = actor.rightArm.userData?.gripRig;
      const reach = ((rig?.upperLength || 0.38) + (rig?.lowerLength || 0.4)) * 0.98;
      const distance = scratch.target.length();
      if (distance > reach) scratch.target.multiplyScalar(reach / distance);
      actor.rightArm.localToWorld(scratch.target);
      weapon.worldToLocal(scratch.target);
      string.center.copy(scratch.target);
    } else {
      restoreArm(actor.rightArm);
    }
    segment(string.upper, 0.48, string, scratch);
    segment(string.lower, -0.48, string, scratch);
    return string;
  };
}
