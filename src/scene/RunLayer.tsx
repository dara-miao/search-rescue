import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import { stagingPose } from '../drive/spawn'
import { useRun } from '../run/store'
import type { Victim } from '../run/types'
import { HeatZones } from './HeatZones'
import { WalkOut } from './WalkOut'
import { OpeningBeacons } from './OpeningBeacons'
import { WindowPeople } from './WindowPeople'

const SIG = {
  STRONG: { color: '#ffd27a', r: 0.32, h: 1.55 },
  WEAK: { color: '#ff8a2a', r: 0.26, h: 1.2 },
  FAINT: { color: '#c43b3b', r: 0.2, h: 0.95 },
}

function victimY(v: Victim) {
  return 1.55 + v.floor * 4.5
}

/** Heat silhouette at the glass. Not a spinning orb. */
function ThermalSig({ victim, noisy }: { victim: Victim; noisy: boolean }) {
  const mesh = useRef<Mesh>(null)
  const look = SIG[victim.signature]

  useFrame((state) => {
    const m = mesh.current
    if (!m) return
    const t = state.clock.elapsedTime
    const breath = 1 + Math.sin(t * 1.5 + victim.x) * 0.05
    const shimmer = noisy ? Math.sin(t * 6 + victim.z) * 0.06 : 0
    m.position.set(victim.x + shimmer, victimY(victim), victim.z)
    m.scale.set(breath, breath, breath)
  })

  return (
    <mesh ref={mesh} renderOrder={20}>
      <capsuleGeometry args={[look.r, look.h, 6, 10]} />
      <meshBasicMaterial
        color={look.color}
        transparent
        opacity={victim.signature === 'FAINT' ? 0.5 : 0.68}
        depthTest={false}
      />
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
      <WalkOut />
      <OpeningBeacons />
      <WindowPeople />
      <mesh position={[staging.x, 0.04, staging.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.2, 6.4, 40]} />
        <meshBasicMaterial color="#9d2235" transparent opacity={0.45} />
      </mesh>
      {thermal
        ? victims
            .filter((v) => v.state === 'WAITING' || v.state === 'MARKED' || v.state === 'CARRIED')
            .map((v) => <ThermalSig key={v.id} victim={v} noisy={noisy} />)
        : null}
    </group>
  )
}
