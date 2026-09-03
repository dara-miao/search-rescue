import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import { stagingPose } from '../drive/spawn'
import { useDrive } from '../drive/store'
import { useRun } from '../run/store'
import type { Victim } from '../run/types'
import { HeatZones } from './HeatZones'
import { HoldProgress } from './HoldProgress'
import { WalkOut } from './WalkOut'
import { OpeningBeacons } from './OpeningBeacons'
import { WindowPeople } from './WindowPeople'

const SIG = {
  STRONG: { color: '#ffd27a', r: 2.15 },
  WEAK: { color: '#ff8a2a', r: 1.35 },
  FAINT: { color: '#c43b3b', r: 0.82 },
}

function victimY(v: Victim) {
  return 2.1 + v.floor * 4.5
}

function ThermalBlob({ victim, noisy }: { victim: Victim; noisy: boolean }) {
  const mesh = useRef<Mesh>(null)
  const look = SIG[victim.signature]
  const ghost = useRef<Mesh>(null)

  useFrame((state) => {
    const m = mesh.current
    if (!m) return
    const t = state.clock.elapsedTime
    const jx = noisy ? Math.sin(t * 27 + victim.x) * 0.85 : 0
    const jz = noisy ? Math.cos(t * 23 + victim.z) * 0.85 : 0
    const jy = noisy ? Math.sin(t * 19 + victim.floor) * 0.4 : 0
    m.position.set(victim.x + jx, victimY(victim) + jy, victim.z + jz)
    m.scale.setScalar(noisy ? 0.72 + Math.abs(Math.sin(t * 14)) * 0.45 : 1)
    const g = ghost.current
    if (g) {
      g.visible = noisy
      g.position.set(victim.x - jx * 1.4, victimY(victim) - jy, victim.z + jz * 0.6)
    }
  })

  return (
    <group>
      <mesh ref={mesh} renderOrder={20}>
        <sphereGeometry args={[look.r, 16, 12]} />
        <meshBasicMaterial
          color={look.color}
          transparent
          opacity={victim.signature === 'FAINT' ? 0.55 : 0.72}
          depthTest={false}
        />
      </mesh>
      <mesh ref={ghost} visible={false} renderOrder={19}>
        <sphereGeometry args={[look.r * 0.7, 10, 8]} />
        <meshBasicMaterial color={look.color} transparent opacity={0.28} depthTest={false} />
      </mesh>
    </group>
  )
}

function Carried() {
  const group = useRef<Mesh>(null)
  useFrame(() => {
    const m = group.current
    if (!m) return
    const run = useRun.getState()
    const drive = useDrive.getState()
    const on = Boolean(run.carriedId)
    m.visible = on
    if (!on) return
    const face = drive.yaw
    const backX = Math.sin(face) * 0.42
    const backZ = Math.cos(face) * 0.42
    m.position.set(drive.x + backX, drive.y + 0.62, drive.z + backZ)
  })
  return (
    <mesh ref={group} visible={false} renderOrder={18}>
      <capsuleGeometry args={[0.14, 0.38, 4, 8]} />
      <meshStandardMaterial color="#c4a07a" emissive="#3a2010" emissiveIntensity={0.35} roughness={0.7} />
    </mesh>
  )
}

export function RunLayer() {
  const thermal = useRun((s) => s.thermal)
  const victims = useRun((s) => s.victims)
  const inHeat = useRun((s) => s.inHeat)
  const staging = useMemo(() => stagingPose(), [])
  const noisy = thermal && inHeat

  return (
    <group>
      <HeatZones />
      <HoldProgress />
      <WalkOut />
      <OpeningBeacons />
      <WindowPeople />
      <Carried />
      <mesh position={[staging.x, 0.04, staging.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.2, 6.4, 40]} />
        <meshBasicMaterial color="#9d2235" transparent opacity={0.45} />
      </mesh>
      {thermal
        ? victims
            .filter((v) => v.state === 'WAITING' || v.state === 'MARKED' || v.state === 'CARRIED')
            .map((v) => <ThermalBlob key={v.id} victim={v} noisy={noisy} />)
        : null}
    </group>
  )
}
