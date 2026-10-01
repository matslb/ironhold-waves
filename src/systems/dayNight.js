const TAU = Math.PI * 2;

export function normalizeDayPhase(phase) {
  if (!Number.isFinite(phase)) return 0;
  const wrapped = phase % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped === 0 ? 0 : wrapped;
}

export function createDayNightClock({ cycleSeconds = 720, startPhase = 0.35 } = {}) {
  const duration = Number.isFinite(cycleSeconds) && cycleSeconds > 0 ? cycleSeconds : 720;
  const initialPhase = Number.isFinite(startPhase) ? normalizeDayPhase(startPhase) : 0.35;
  let phase = initialPhase;
  return {
    get phase() { return phase; },
    advance(seconds) {
      if (Number.isFinite(seconds) && seconds > 0) phase = normalizeDayPhase(phase + seconds / duration);
      return phase;
    },
    sync(value) {
      if (!Number.isFinite(value)) return false;
      phase = normalizeDayPhase(value);
      return true;
    },
    reset() { phase = initialPhase; return phase; }
  };
}

export function describeDayPhase(phase) {
  const progress = normalizeDayPhase(phase);
  if (progress < 0.18 || progress >= 0.94) return { key: "dawn", label: "Morning", progress };
  if (progress < 0.46) return { key: "day", label: "Daylight", progress };
  if (progress < 0.60) return { key: "dusk", label: "Dusk", progress };
  return { key: "night", label: "Night", progress };
}

export function createDayNightSystem({
  THREE, scene, lights: { hemi, sun, rim }, materials: { cloud, sunDisc },
  skyGroup, cycleSeconds = 720, sampleGroundHeight
}) {
  // Smoothstep between authored stops keeps the palette continuous across midnight and dawn.
  const colors = ["sky", "fog", "hemi", "ground", "sun", "rim", "cloud", "disc"];
  const palette = [
    [0.00, [0xd5a4a0, 0xd3b5ad, 0xffd4b8, 0x49372e, 0xffb575, 0xa9baff, 0xffd5bd, 0xffca81], [1.2, 2.1, 1.05], 0.34],
    [0.18, [0x82bee8, 0x9ac7e8, 0xd7eeff, 0x3b3328, 0xffe3b0, 0x86b6ff, 0xf7fbff, 0xffdf7f], [1.55, 4.0, 1.15], 0.0],
    [0.42, [0x82bee8, 0x9ac7e8, 0xd7eeff, 0x3b3328, 0xffe3b0, 0x86b6ff, 0xf7fbff, 0xffdf7f], [1.55, 4.0, 1.15], 0.0],
    [0.51, [0xa987ad, 0xb39aaf, 0xf1c6af, 0x41303b, 0xffa267, 0x9fafff, 0xe5b4ae, 0xffa45b], [1.2, 2.2, 1.1], 0.48],
    [0.64, [0x192c53, 0x2a4169, 0xadc5e8, 0x3a425a, 0xb8cef3, 0x9fb9ed, 0x627b9f, 0xffb775], [1.28, 1.4, 1.15], 1.0],
    [0.82, [0x17274c, 0x263d63, 0xabc3e6, 0x384158, 0xb5ccf1, 0x9bb5e9, 0x587298, 0xffb775], [1.25, 1.35, 1.15], 1.0],
    [0.94, [0x706e99, 0x8d88a4, 0xc5bdde, 0x343143, 0xeeb59e, 0x9eadf2, 0xb7a5be, 0xffb976], [1.05, 1.15, 1.05], 0.70],
    [1.00, [0xd5a4a0, 0xd3b5ad, 0xffd4b8, 0x49372e, 0xffb575, 0xa9baff, 0xffd5bd, 0xffca81], [1.2, 2.1, 1.05], 0.34]
  ].map(([phase, values, intensity, night]) => ({
    phase, intensity, night,
    colors: Object.fromEntries(colors.map((key, index) => [key, new THREE.Color(values[index])]))
  }));
  const baselineLights = [hemi, sun, rim].map(light => ({
    light, intensity: light.intensity, color: light.color.clone(),
    ground: light.groundColor ? light.groundColor.clone() : null
  }));
  const baselineCloud = { color: cloud.color.clone(), opacity: cloud.opacity };
  const baselineDisc = { color: sunDisc.color.clone(), opacity: sunDisc.opacity, transparent: sunDisc.transparent };
  let sunMesh = null;
  skyGroup.traverse(object => { if (object.material === sunDisc) sunMesh = object; });
  const baselineSunVisible = sunMesh ? sunMesh.visible : true;
  sunDisc.transparent = true;
  sunDisc.needsUpdate = true;

  // Both particle fields use one draw each, fixed buffers, and soft circular points.
  const vertexShader = `
    attribute float seed;
    uniform float time;
    uniform float size;
    varying float shimmer;
    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewPosition;
      gl_PointSize = clamp(size * (300.0 / max(1.0, -viewPosition.z)), 1.0, 9.0);
      shimmer = 0.72 + 0.28 * sin(time * 1.7 + seed);
    }
  `;
  const fragmentShader = `
    uniform vec3 color;
    uniform float opacity;
    varying float shimmer;
    void main() {
      float radius = length(gl_PointCoord - vec2(0.5));
      float alpha = (1.0 - smoothstep(0.08, 0.5, radius)) * opacity * shimmer;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(color, alpha);
      #include <colorspace_fragment>
    }
  `;
  function glowMaterial(color, size) {
    return new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, size: { value: size },
        opacity: { value: 0 }, time: { value: 0 } },
      vertexShader, fragmentShader, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, fog: false
    });
  }
  let randomState = 0x1a0f248;
  function random() {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  }
  const starCount = 230;
  const starPositions = new Float32Array(starCount * 3);
  const starSeeds = new Float32Array(starCount);
  for (let index = 0; index < starCount; index++) {
    const angle = random() * TAU;
    const elevation = 0.12 + random() * 0.88;
    const radius = 220 + random() * 70;
    const horizontal = Math.sqrt(1 - elevation * elevation) * radius;
    starPositions[index * 3] = Math.cos(angle) * horizontal;
    starPositions[index * 3 + 1] = elevation * radius;
    starPositions[index * 3 + 2] = Math.sin(angle) * horizontal;
    starSeeds[index] = random() * TAU;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute("seed", new THREE.BufferAttribute(starSeeds, 1));
  const starMaterial = glowMaterial(0xd3e8ff, 1.2);
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.frustumCulled = false;
  skyGroup.add(stars);

  const moonGeometry = new THREE.IcosahedronGeometry(4.7, 1);
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xdce9ff, transparent: true,
    opacity: 0, fog: false, toneMapped: false });
  const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.set(-82, 34, -155);
  moon.rotation.set(0.3, 0.4, 0.1);
  skyGroup.add(moon);

  const fireflyCount = 28;
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflySeeds = new Float32Array(fireflyCount);
  const fireflyGround = new Float32Array(fireflyCount);
  const fireflyOffsets = new Float32Array(fireflyCount * 2);
  for (let index = 0; index < fireflyCount; index++) {
    const angle = random() * TAU;
    const radius = 3 + Math.sqrt(random()) * 13;
    fireflyOffsets[index * 2] = Math.cos(angle) * radius;
    fireflyOffsets[index * 2 + 1] = Math.sin(angle) * radius;
    fireflySeeds[index] = random() * TAU;
  }
  const fireflyGeometry = new THREE.BufferGeometry();
  const fireflyAttribute = new THREE.BufferAttribute(fireflyPositions, 3);
  fireflyAttribute.setUsage(THREE.DynamicDrawUsage);
  fireflyGeometry.setAttribute("position", fireflyAttribute);
  fireflyGeometry.setAttribute("seed", new THREE.BufferAttribute(fireflySeeds, 1));
  const fireflyMaterial = glowMaterial(0xd9f794, 0.18);
  const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
  fireflies.frustumCulled = false;
  scene.add(fireflies);
  let sampledX = Infinity, sampledZ = Infinity, sampledTime = -Infinity;
  let animationTime = 0;
  let animationTick = null;
  let wasOutdoor = true;

  function restoreLights() {
    for (const baseline of baselineLights) {
      baseline.light.color.copy(baseline.color);
      baseline.light.intensity = baseline.intensity;
      if (baseline.ground) baseline.light.groundColor.copy(baseline.ground);
    }
  }

  function update({ phase, position, outdoor = true, elapsed = 0, animate = true, fireflyStrength = 1 } = {}) {
    const time = Number.isFinite(elapsed) ? elapsed : 0;
    if (animate && animationTick !== null) {
      animationTime += Math.max(0, Math.min(1, time - animationTick));
    }
    animationTick = time;
    if (!outdoor) {
      if (wasOutdoor) restoreLights();
      wasOutdoor = false;
      stars.visible = moon.visible = fireflies.visible = false;
      return;
    }
    wasOutdoor = true;
    const duration = Number.isFinite(cycleSeconds) && cycleSeconds > 0 ? cycleSeconds : 720;
    const progress = normalizeDayPhase(Number.isFinite(phase) ? phase : time / duration);
    let index = 0;
    while (index < palette.length - 2 && progress >= palette[index + 1].phase) index++;
    const from = palette[index], to = palette[index + 1];
    const fraction = (progress - from.phase) / (to.phase - from.phase);
    const mix = fraction * fraction * (3 - 2 * fraction);
    const night = from.night + (to.night - from.night) * mix;
    scene.background.lerpColors(from.colors.sky, to.colors.sky, mix);
    scene.fog.color.lerpColors(from.colors.fog, to.colors.fog, mix);
    hemi.color.lerpColors(from.colors.hemi, to.colors.hemi, mix);
    hemi.groundColor.lerpColors(from.colors.ground, to.colors.ground, mix);
    sun.color.lerpColors(from.colors.sun, to.colors.sun, mix);
    rim.color.lerpColors(from.colors.rim, to.colors.rim, mix);
    hemi.intensity = from.intensity[0] + (to.intensity[0] - from.intensity[0]) * mix;
    sun.intensity = from.intensity[1] + (to.intensity[1] - from.intensity[1]) * mix;
    rim.intensity = from.intensity[2] + (to.intensity[2] - from.intensity[2]) * mix;
    cloud.color.lerpColors(from.colors.cloud, to.colors.cloud, mix);
    cloud.opacity = baselineCloud.opacity * (1 - night * 0.32);
    sunDisc.color.lerpColors(from.colors.disc, to.colors.disc, mix);
    sunDisc.opacity = baselineDisc.opacity * (1 - night);
    if (sunMesh) sunMesh.visible = night < 0.99;
    const celestialFade = Math.max(0, (night - 0.38) / 0.62);
    stars.visible = moon.visible = celestialFade > 0.01;
    starMaterial.uniforms.opacity.value = celestialFade * 0.82;
    starMaterial.uniforms.time.value = animationTime * 0.28;
    moonMaterial.opacity = celestialFade * 0.92;

    const strength = Number.isFinite(fireflyStrength) ? Math.max(0, Math.min(1, fireflyStrength)) : 0;
    fireflies.visible = !!position && strength * night > 0.06;
    if (!fireflies.visible) return;
    fireflies.position.set(position.x, 0, position.z);
    const resample = Math.hypot(position.x - sampledX, position.z - sampledZ) > 3
      || Math.abs(time - sampledTime) >= 0.5;
    for (let fly = 0; fly < fireflyCount; fly++) {
      const seed = fireflySeeds[fly];
      const x = fireflyOffsets[fly * 2] + Math.sin(animationTime * 0.37 + seed) * 0.55;
      const z = fireflyOffsets[fly * 2 + 1] + Math.cos(animationTime * 0.29 + seed) * 0.55;
      if (resample) {
        const ground = sampleGroundHeight ? sampleGroundHeight(position.x + x, position.z + z) : position.y;
        fireflyGround[fly] = Number.isFinite(ground) ? ground : 0;
      }
      fireflyPositions[fly * 3] = x;
      fireflyPositions[fly * 3 + 1] = fireflyGround[fly] + 0.9 + (seed / TAU) * 1.1
        + Math.sin(animationTime * 0.8 + seed) * 0.28;
      fireflyPositions[fly * 3 + 2] = z;
    }
    if (resample) { sampledX = position.x; sampledZ = position.z; sampledTime = time; }
    fireflyAttribute.needsUpdate = true;
    fireflyMaterial.uniforms.opacity.value = strength * night * 0.65;
    fireflyMaterial.uniforms.time.value = animationTime;
  }

  function dispose() {
    restoreLights();
    cloud.color.copy(baselineCloud.color);
    cloud.opacity = baselineCloud.opacity;
    sunDisc.color.copy(baselineDisc.color);
    sunDisc.opacity = baselineDisc.opacity;
    sunDisc.transparent = baselineDisc.transparent;
    sunDisc.needsUpdate = true;
    if (sunMesh) sunMesh.visible = baselineSunVisible;
    skyGroup.remove(stars, moon);
    scene.remove(fireflies);
    for (const resource of [starGeometry, starMaterial, moonGeometry, moonMaterial, fireflyGeometry, fireflyMaterial]) resource.dispose();
  }

  stars.visible = moon.visible = fireflies.visible = false;
  return { update, dispose };
}
