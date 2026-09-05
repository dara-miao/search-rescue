import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import type { BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { stagingPose } from '../drive/spawn'
import { site } from '../data/site'
import { useRun } from '../run/store'
import { LIGHT_RIG, NIGHT, buildEnvironment, setMergeFunction } from './site-environment.js'

setMergeFunction((geos, useGroups) => {
  const prepared = (geos as BufferGeometry[]).map((g) => (g.index ? g.toNonIndexed() : g))
  return mergeGeometries(prepared, useGroups)
})

export function NightEnvironment() {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const env = useMemo(() => {
    const spawn = stagingPose()
    return buildEnvironment(scene, site, {
      staging: { x: spawn.x, z: spawn.z },
      treeExclusions: [{ x: spawn.x, z: spawn.z, radius: 28 }],
    })
  }, [])

  useFrame((_, dt) => {
    env.update(dt, {
      cameraPosition: camera.position,
      fireIntensity: useRun.getState().fireIntensity,
    })
  })

  return (
    <>
      <color attach="background" args={[NIGHT.fog]} />
      <fogExp2 attach="fog" args={[NIGHT.fog, LIGHT_RIG.fogDensity]} />
      <hemisphereLight args={['#55647c', '#322414', 1.02]} />
      <ambientLight intensity={0.3} color="#445577" />
      <directionalLight position={[70, 110, -35]} intensity={0.92} color="#d0dcf0" />
      <primitive object={env.root} />
    </>
  )
}
