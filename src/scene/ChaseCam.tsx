import { PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { PerspectiveCamera as Persp } from 'three'
import { site } from '../data/site'
import {
  CHASE_CONFIG,
  createChaseCamera,
  desiredChaseShot,
  stepChaseCamera,
  type ChaseShot,
} from '../drive/robot-chase.js'
import { siteBlockers } from '../drive/step'
import { useDrive } from '../drive/store'
import { useRun } from '../run/store'
import { aerialShot, craneProgress, easeCrane, mixShot } from './deploy-crane'

/**
 * Locked chase camera from robot-chase.js. Yaw lags the chassis a few
 * degrees so a turn is visible; it never reads the stick.
 *
 * Briefing holds a high south-lawn establish. Deploy cranes down onto the
 * robot so the first moving shot is the settle into vehicle POV.
 */
export function ChaseCam() {
  const cam = useThree((s) => s.camera) as Persp
  const el = useThree((s) => s.gl.domElement)
  const chase = useRef(createChaseCamera())
  const aerialT = useRef(0)
  const craneFrom = useRef<ChaseShot | null>(null)
  const craneT = useRef(0)
  const phase = useRun((s) => s.phase)
  const deployIntro = useRun((s) => s.deployIntro)

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
    if (phase === 'briefing') {
      aerialT.current += dt
      craneFrom.current = null
      craneT.current = 0
      applyShot(cam, aerialShot(site, aerialT.current))
      return
    }

    if (deployIntro) {
      if (!craneFrom.current) {
        craneFrom.current = snapshotShot(cam, aerialShot(site, aerialT.current))
        craneT.current = 0
      }
      craneT.current += dt
      const { x, y, z, yaw, zoom } = useDrive.getState()
      const cfg = {
        ...CHASE_CONFIG,
        camera: { ...CHASE_CONFIG.camera, distance: zoom },
      }
      const to = desiredChaseShot(
        { position: { x, y, z }, yaw },
        cfg,
        siteBlockers(),
      )
      const u = easeCrane(craneProgress(craneT.current))
      applyShot(cam, mixShot(craneFrom.current, to, u))
      if (u >= 1) {
        chase.current.yaw = yaw
        chase.current.fov = to.fov
        chase.current.initialised = true
        useRun.getState().endDeployIntro()
      }
      return
    }

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

function snapshotShot(cam: Persp, fallback: ChaseShot): ChaseShot {
  return {
    position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
    look: fallback.look,
    fov: cam.fov,
  }
}

function applyShot(cam: Persp, shot: ChaseShot) {
  cam.position.set(shot.position.x, shot.position.y, shot.position.z)
  cam.lookAt(shot.look.x, shot.look.y, shot.look.z)
  if (Math.abs(cam.fov - shot.fov) > 0.01) {
    cam.fov = shot.fov
    cam.updateProjectionMatrix()
  }
}
