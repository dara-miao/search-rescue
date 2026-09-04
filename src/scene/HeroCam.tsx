import { PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera as Persp } from 'three'
import { site } from '../data/site'

/** South lawn, looking north at the face. Far enough to read the whole pile. */
export function HeroCam() {
  const cam = useThree((s) => s.camera) as Persp

  useFrame(() => {
    const ob = site.building.orientedBounds
    const south = { x: -Math.sin(ob.angleRad), z: Math.cos(ob.angleRad) }
    const back = ob.depth / 2 + 72
    cam.position.set(ob.centre.x + south.x * back, 18.5, ob.centre.z + south.z * back)
    cam.lookAt(ob.centre.x, 8.2, ob.centre.z)
    if (cam.fov !== 36) {
      cam.fov = 36
      cam.updateProjectionMatrix()
    }
  })

  return <PerspectiveCamera makeDefault fov={36} near={0.4} far={900} />
}
