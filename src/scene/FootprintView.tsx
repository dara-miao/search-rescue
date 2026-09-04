import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { useDrive } from '../drive/store'
import { site } from '../data/site'
import { isHeroShot } from '../run/hero'
import { ChaseCam } from './ChaseCam'
import { HeroCam } from './HeroCam'
import { Massing } from './Massing'
import { WindowSmoke } from './WindowSmoke'
import { NightEnvironment } from './NightEnvironment'
import { Robot } from './Robot'
import { RunLayer } from './RunLayer'

const OUTLINE = '#c9b79a'

function Outline() {
  const points = useMemo(() => {
    const ring = site.building.footprint
    return ring.concat(ring[0]).map((p) => [p.x, 0.08, p.z] as [number, number, number])
  }, [])
  return <Line points={points} color={OUTLINE} lineWidth={1.4} />
}

export function FootprintView() {
  return (
    <>
      {isHeroShot() ? <HeroCam /> : <ChaseCam />}
      <NightEnvironment />
      <Massing />
      <WindowSmoke />
      <Outline />
      <RunLayer />
      <Robot variant="robot" pose={() => useDrive.getState()} />
    </>
  )
}
