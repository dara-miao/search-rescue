import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'
import { useDrive } from '../drive/store'
import { HOLD_COLOR, holdAnchor, holdFrac } from '../run/hold'
import { useRun } from '../run/store'

function ringColor(kind: keyof typeof HOLD_COLOR) {
  return HOLD_COLOR[kind]
}

export function HoldProgress() {
  const target = useRef<Group>(null)
  const fill = useRef<Mesh>(null)
  const column = useRef<Mesh>(null)
  const feet = useRef<Group>(null)
  const feetFill = useRef<Mesh>(null)

  useFrame(() => {
    const run = useRun.getState()
    const drive = useDrive.getState()
    const frac = holdFrac(run.hold)
    const anchor = holdAnchor(run)

    const tg = target.current
    const ff = fill.current
    const col = column.current
    const ft = feet.current
    const ftFill = feetFill.current
    if (!tg || !ff || !col || !ft || !ftFill) return

    tg.visible = Boolean(anchor)
    ft.visible = Boolean(anchor)
    if (!anchor) return

    const color = ringColor(anchor.kind)
    const matFill = ff.material as { color: { set: (c: string) => void } }
    const matCol = col.material as { color: { set: (c: string) => void } }
    const matFeet = ftFill.material as { color: { set: (c: string) => void } }
    matFill.color.set(color)
    matCol.color.set(color)
    matFeet.color.set(color)

    tg.position.set(anchor.x, 0.05, anchor.z)
    ff.scale.setScalar(0.18 + frac * 0.82)
    col.position.y = 0.12 + frac * 1.35
    col.scale.set(1, 0.2 + frac * 2.4, 1)

    ft.position.set(drive.x, 0.06, drive.z)
    ftFill.scale.setScalar(0.22 + frac * 0.78)
  })

  return (
    <>
      <group ref={target} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={16}>
          <ringGeometry args={[1.35, 1.58, 40]} />
          <meshBasicMaterial color="#efe6d6" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh ref={fill} rotation={[-Math.PI / 2, 0, 0]} renderOrder={17}>
          <circleGeometry args={[1.28, 32]} />
          <meshBasicMaterial color="#5ad0e8" transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh ref={column} renderOrder={18}>
          <cylinderGeometry args={[0.07, 0.07, 1, 8]} />
          <meshBasicMaterial color="#5ad0e8" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      </group>
      <group ref={feet} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={16}>
          <ringGeometry args={[0.72, 0.88, 28]} />
          <meshBasicMaterial color="#efe6d6" transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <mesh ref={feetFill} rotation={[-Math.PI / 2, 0, 0]} renderOrder={17}>
          <circleGeometry args={[0.68, 24]} />
          <meshBasicMaterial color="#5ad0e8" transparent opacity={0.32} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}
