import { PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { PerspectiveCamera as Persp } from 'three'
import { CHASE_CONFIG, createChaseCamera, stepChaseCamera } from '../drive/robot-chase.js'
import { siteBlockers } from '../drive/step'
import { useDrive } from '../drive/store'

/**
 * Locked chase camera from robot-chase.js. Yaw lags the chassis a few
 * degrees so a turn is visible; it never reads the stick.
 */
export function ChaseCam() {
  const cam = useThree((s) => s.camera) as Persp
  const el = useThree((s) => s.gl.domElement)
  const chase = useRef(createChaseCamera())

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const next = useDrive.getState().zoom + e.deltaY * 0.018
      useDrive.getState().setZoom(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [el])

  useFrame((_, dt) => {
    const { x, y, z, yaw, speed, yawRate, zoom } = useDrive.getState()
    const cfg = {
      ...CHASE_CONFIG,
      camera: { ...CHASE_CONFIG.camera, distance: zoom },
    }
    stepChaseCamera(
      chase.current,
      { position: { x, y, z }, yaw, speed, yawRate },
      cam,
      dt,
      cfg,
      siteBlockers(),
    )
  })

  return <PerspectiveCamera makeDefault fov={CHASE_CONFIG.camera.fov.base} near={0.25} far={900} />
}
