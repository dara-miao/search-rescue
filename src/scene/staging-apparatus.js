/**
 * Low-poly fire apparatus on the Alumni Park staging lawn.
 *
 * Engines park to the east and west of the red ring, slightly south of spawn,
 * so the path from the ring to Doheny stays open. Beacons sit on the light bars.
 */

import * as THREE from 'three'

export const APPARATUS_CONFIG = {
  engineLength: 7.1,
  engineWidth: 2.4,
  utilityLength: 5.2,
  utilityWidth: 2.15,
  along: 9.3,
  back: 4.5,
}

export function stagingAxes(angleRad) {
  return {
    south: { x: -Math.sin(angleRad), z: Math.cos(angleRad) },
    east: { x: Math.cos(angleRad), z: Math.sin(angleRad) },
  }
}

function place(staging, axes, along, back) {
  return {
    x: staging.x + axes.east.x * along + axes.south.x * back,
    z: staging.z + axes.east.z * along + axes.south.z * back,
    yaw: Math.atan2(axes.east.x, axes.east.z),
  }
}

export function apparatusLayout(staging, angleRad) {
  const axes = stagingAxes(angleRad)
  return {
    westEngine: { ...place(staging, axes, -APPARATUS_CONFIG.along, APPARATUS_CONFIG.back), kind: 'engine' },
    eastEngine: { ...place(staging, axes, APPARATUS_CONFIG.along + 0.3, APPARATUS_CONFIG.back + 0.15), kind: 'engine' },
    utility: { ...place(staging, axes, 16.4, 2.6), kind: 'utility' },
  }
}

function orientedRect(x, z, yaw, length, width) {
  const fx = -Math.sin(yaw)
  const fz = -Math.cos(yaw)
  const rx = Math.cos(yaw)
  const rz = -Math.sin(yaw)
  const hl = length / 2
  const hw = width / 2
  return [
    { x: x + fx * hl + rx * hw, z: z + fz * hl + rz * hw },
    { x: x + fx * hl - rx * hw, z: z + fz * hl - rz * hw },
    { x: x - fx * hl - rx * hw, z: z - fz * hl - rz * hw },
    { x: x - fx * hl + rx * hw, z: z - fz * hl + rz * hw },
  ]
}

export function apparatusBlockers(staging, angleRad) {
  const layout = apparatusLayout(staging, angleRad)
  const { engineLength, engineWidth, utilityLength, utilityWidth } = APPARATUS_CONFIG
  return Object.values(layout).map((slot) =>
    orientedRect(
      slot.x,
      slot.z,
      slot.yaw,
      slot.kind === 'utility' ? utilityLength : engineLength,
      slot.kind === 'utility' ? utilityWidth : engineWidth,
    ),
  )
}

function lightBarWorld(slot) {
  const fx = -Math.sin(slot.yaw)
  const fz = -Math.cos(slot.yaw)
  return {
    x: slot.x + fx * 2.05,
    y: 2.58,
    z: slot.z + fz * 2.05,
  }
}

function mat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extras.roughness ?? 0.74,
    metalness: extras.metalness ?? 0.16,
    emissive: extras.emissive ?? 0x000000,
    emissiveIntensity: extras.emissiveIntensity ?? 0,
  })
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

function wheel(x, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10), mat(0x141210, { roughness: 0.9 }))
  mesh.rotation.z = Math.PI / 2
  mesh.position.set(x, 0.42, z)
  mesh.castShadow = false
  return mesh
}

function buildEngine(paint) {
  const g = new THREE.Group()
  const body = mat(paint)
  const dark = mat(0x1a1210, { metalness: 0.28 })
  const chrome = mat(0x8a8680, { metalness: 0.55, roughness: 0.35 })

  const chassis = box(2.28, 0.38, 6.9, dark)
  chassis.position.y = 0.52
  g.add(chassis)

  const cab = box(2.22, 1.72, 2.15, body)
  cab.position.set(0, 1.48, -2.15)
  g.add(cab)

  const glass = box(1.95, 0.62, 0.08, mat(0x6a88aa, { roughness: 0.2, metalness: 0.4, emissive: 0x102028, emissiveIntensity: 0.12 }))
  glass.position.set(0, 1.78, -3.2)
  g.add(glass)

  const pump = box(2.22, 1.48, 4.15, body)
  pump.position.set(0, 1.36, 1.15)
  g.add(pump)

  const stripe = box(2.26, 0.1, 6.4, mat(0xc9a227, { emissive: 0x3a2a08, emissiveIntensity: 0.18 }))
  stripe.position.y = 0.92
  g.add(stripe)

  const bar = box(1.15, 0.16, 0.55, dark)
  bar.position.set(0, 2.42, -2.05)
  g.add(bar)
  const red = box(0.42, 0.12, 0.42, mat(0xff2a18, { emissive: 0xff2a18, emissiveIntensity: 0.85 }))
  red.position.set(-0.32, 2.52, -2.05)
  const blu = box(0.42, 0.12, 0.42, mat(0x2a5cff, { emissive: 0x2a5cff, emissiveIntensity: 0.85 }))
  blu.position.set(0.32, 2.52, -2.05)
  g.add(red, blu)

  const ladder = box(0.55, 0.12, 4.4, chrome)
  ladder.position.set(0.95, 2.18, 1.05)
  g.add(ladder)

  for (const [x, z] of [
    [-1.05, -2.15],
    [1.05, -2.15],
    [-1.05, 2.05],
    [1.05, 2.05],
  ]) {
    g.add(wheel(x, z))
  }
  return g
}

function buildUtility() {
  const g = new THREE.Group()
  const white = mat(0xc8c2b4)
  const red = mat(0x9d2235)
  const dark = mat(0x1a1210)
  const chassis = box(2.05, 0.34, 5.05, dark)
  chassis.position.y = 0.48
  g.add(chassis)
  const van = box(2.05, 1.85, 3.35, white)
  van.position.set(0, 1.52, 0.45)
  g.add(van)
  const cab = box(2.05, 1.55, 1.55, white)
  cab.position.set(0, 1.38, -2.15)
  g.add(cab)
  const band = box(2.1, 0.22, 4.8, red)
  band.position.y = 1.05
  g.add(band)
  for (const [x, z] of [
    [-0.95, -1.85],
    [0.95, -1.85],
    [-0.95, 1.55],
    [0.95, 1.55],
  ]) {
    g.add(wheel(x, z))
  }
  return g
}

function cone(x, z) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.42, 8),
    mat(0xe86a1a, { emissive: 0x4a1808, emissiveIntensity: 0.2 }),
  )
  mesh.position.set(x, 0.22, z)
  mesh.castShadow = false
  return mesh
}

function crate(x, z, yaw) {
  const mesh = box(0.85, 0.55, 0.62, mat(0x3a3428))
  mesh.position.set(x, 0.28, z)
  mesh.rotation.y = yaw
  return mesh
}

function flood(x, z, yaw) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  g.rotation.y = yaw
  const pole = box(0.08, 2.4, 0.08, mat(0x2a2a28, { metalness: 0.4 }))
  pole.position.y = 1.2
  const head = box(0.42, 0.18, 0.28, mat(0xf2e6c4, { emissive: 0xf2e6c4, emissiveIntensity: 0.55 }))
  head.position.set(0, 2.35, -0.12)
  g.add(pole, head)
  return g
}

export function buildStagingApparatus(staging, angleRad) {
  const group = new THREE.Group()
  group.name = 'stagingApparatus'
  const layout = apparatusLayout(staging, angleRad)
  const { south, east } = stagingAxes(angleRad)

  const west = buildEngine(0x8f1d24)
  west.position.set(layout.westEngine.x, 0, layout.westEngine.z)
  west.rotation.y = layout.westEngine.yaw
  west.name = 'engineWest'

  const eastTruck = buildEngine(0x7a1820)
  eastTruck.position.set(layout.eastEngine.x, 0, layout.eastEngine.z)
  eastTruck.rotation.y = layout.eastEngine.yaw
  eastTruck.name = 'engineEast'

  const van = buildUtility()
  van.position.set(layout.utility.x, 0, layout.utility.z)
  van.rotation.y = layout.utility.yaw
  van.name = 'utility'

  group.add(west, eastTruck, van)

  const ringR = 6.55
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2
    const cx = staging.x + Math.cos(a) * ringR
    const cz = staging.z + Math.sin(a) * ringR
    group.add(cone(cx, cz))
  }

  group.add(
    crate(staging.x + east.x * 3.4 + south.x * 7.2, staging.z + east.z * 3.4 + south.z * 7.2, layout.eastEngine.yaw),
    crate(staging.x + east.x * 4.2 + south.x * 7.8, staging.z + east.z * 4.2 + south.z * 7.8, layout.eastEngine.yaw + 0.4),
    flood(staging.x - east.x * 3.8 + south.x * 6.6, staging.z - east.z * 3.8 + south.z * 6.6, layout.westEngine.yaw + Math.PI * 0.5),
  )

  const hose = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.07, 6, 18),
    mat(0x2a2018, { roughness: 0.9 }),
  )
  hose.rotation.x = Math.PI / 2
  hose.position.set(staging.x - east.x * 2.8 + south.x * 7.4, 0.08, staging.z - east.z * 2.8 + south.z * 7.4)
  group.add(hose)

  return {
    group,
    layout,
    lights: {
      red: lightBarWorld(layout.westEngine),
      blue: lightBarWorld(layout.eastEngine),
    },
  }
}
