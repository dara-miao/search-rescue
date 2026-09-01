import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useGame } from '../game/store'

/**
 * Unitree Go2–style trot (see go2-convex-mpc): 3 Hz, 0.6 stance duty,
 * diagonal pairs. Mesh is authored with +Z as the nose. Walk wish is
 * (sin yaw, −cos yaw), which matches Three.js +Z after rotY(π − yaw).
 */
const TROT_HZ = 3
const STANCE = 0.6
const STRIDE = 0.42

const LEGS = [
  { hip: [-0.16, 0.02, 0.22] as const, phase: 0, side: -1 },
  { hip: [0.16, 0.02, 0.22] as const, phase: 0.5, side: 1 },
  { hip: [-0.16, 0.02, -0.24] as const, phase: 0.5, side: -1 },
  { hip: [0.16, 0.02, -0.24] as const, phase: 0, side: 1 },
] as const

function wrap01(t: number) {
  return t - Math.floor(t)
}

export function Robot({ variant }: { variant: 'world' | 'robot' }) {
  const group = useRef<Group>(null)
  const hips = useRef<Array<Group | null>>([null, null, null, null])
  const knees = useRef<Array<Group | null>>([null, null, null, null])
  const gait = useRef(0)
  const lean = useRef({ pitch: 0, roll: 0 })
  const youPin = variant === 'world'

  useFrame((_, dt) => {
    const { robot } = useGame.getState()
    const g = group.current
    if (!g) return

    const moving = robot.moving
    const rate = TROT_HZ * (0.55 + Math.min(1.4, robot.speed / 5.2))
    if (moving) gait.current += dt * rate
    else gait.current += dt * 0.08

    const cycle = gait.current
    let rollWant = 0
    let pitchWant = moving ? -0.06 - Math.min(0.05, robot.speed * 0.008) : 0

    hips.current.forEach((hip, i) => {
      const spec = LEGS[i]
      const knee = knees.current[i]
      if (!hip) return
      const phase = wrap01(cycle + spec.phase)
      const swinging = moving && phase > STANCE
      const u = swinging ? (phase - STANCE) / (1 - STANCE) : phase / STANCE
      const swing = swinging ? Math.sin(u * Math.PI) : 0
      const hipPitch = swinging ? -STRIDE * 0.15 + STRIDE * swing : STRIDE * (0.35 - u * 0.7)
      const lift = swinging ? Math.sin(u * Math.PI) * 0.11 : 0
      const kneeBend = swinging ? -0.95 - swing * 0.35 : -0.62 + Math.sin(u * Math.PI) * 0.08
      hip.rotation.x = hipPitch
      hip.position.y = spec.hip[1] + lift
      if (knee) knee.rotation.x = kneeBend
      if (moving && !swinging) {
        rollWant += spec.side * 0.035
      }
    })

    const k = 1 - Math.exp(-10 * dt)
    lean.current.pitch += (pitchWant - lean.current.pitch) * k
    lean.current.roll += (rollWant - lean.current.roll) * k

    const bob = moving ? Math.abs(Math.sin(cycle * Math.PI * 2)) * 0.028 : Math.sin(cycle * 1.4) * 0.006
    g.position.set(robot.x, robot.y + bob, robot.z)
    g.rotation.set(lean.current.pitch, Math.PI - robot.yaw, lean.current.roll)
  })

  return (
    <group ref={group}>
      {youPin && (
        <mesh position={[0, 7.2, 0]} renderOrder={21}>
          <cylinderGeometry args={[0.12, 0.12, 14, 8]} />
          <meshBasicMaterial color="#9d2235" depthTest={false} toneMapped={false} />
        </mesh>
      )}
      <group scale={youPin ? 1 : 1.6}>
        <mesh position={[0, 0.1, -0.01]} castShadow>
          <boxGeometry args={[0.34, 0.14, 0.62]} />
          <meshStandardMaterial color="#1a1c20" metalness={0.72} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.28, 0.05, 0.48]} />
          <meshStandardMaterial color="#9d2235" metalness={0.25} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.1, 0.28]}>
          <boxGeometry args={[0.3, 0.12, 0.1]} />
          <meshStandardMaterial color="#121418" metalness={0.65} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.2, 0.22]}>
          <boxGeometry args={[0.16, 0.08, 0.16]} />
          <meshStandardMaterial color="#0c0e12" metalness={0.55} roughness={0.4} />
        </mesh>
        <group position={[0, 0.16, 0.36]}>
          <mesh>
            <boxGeometry args={[0.2, 0.12, 0.16]} />
            <meshStandardMaterial color="#0e1014" metalness={0.7} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.01, 0.09]}>
            <boxGeometry args={[0.16, 0.06, 0.03]} />
            <meshStandardMaterial color="#7ad7ff" emissive="#3ec7ff" emissiveIntensity={1.6} />
          </mesh>
        </group>
        <mesh position={[0, 0.08, -0.36]}>
          <boxGeometry args={[0.08, 0.04, 0.12]} />
          <meshStandardMaterial color="#2a2d33" metalness={0.4} roughness={0.5} />
        </mesh>
        {LEGS.map((leg, i) => (
          <group
            key={i}
            ref={(el) => {
              hips.current[i] = el
            }}
            position={leg.hip}
          >
            <mesh position={[leg.side * 0.03, -0.02, 0]} rotation={[0, 0, leg.side * 0.12]}>
              <boxGeometry args={[0.07, 0.07, 0.08]} />
              <meshStandardMaterial color="#14161a" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, -0.16, 0.01]} rotation={[0.12, 0, 0]}>
              <boxGeometry args={[0.07, 0.3, 0.08]} />
              <meshStandardMaterial color="#1c1f24" metalness={0.58} roughness={0.38} />
            </mesh>
            <group
              ref={(el) => {
                knees.current[i] = el
              }}
              position={[0, -0.3, 0.02]}
            >
              <mesh position={[0, -0.14, -0.02]} rotation={[-0.15, 0, 0]}>
                <boxGeometry args={[0.06, 0.26, 0.07]} />
                <meshStandardMaterial color="#111318" metalness={0.5} roughness={0.42} />
              </mesh>
              <mesh position={[0, -0.28, 0.03]}>
                <boxGeometry args={[0.09, 0.05, 0.14]} />
                <meshStandardMaterial color="#0a0b0d" metalness={0.35} roughness={0.55} />
              </mesh>
            </group>
          </group>
        ))}
        {!youPin && (
          <spotLight
            position={[0, 0.28, 0.42]}
            angle={0.5}
            penumbra={0.45}
            intensity={2.8}
            distance={10}
            color="#fff4d8"
            castShadow={false}
          />
        )}
      </group>
    </group>
  )
}
