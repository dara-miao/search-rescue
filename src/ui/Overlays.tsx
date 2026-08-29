import { useEffect } from 'react'
import { useGame } from '../game/store'

export function Briefing({ onDeploy }: { onDeploy: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        onDeploy()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDeploy])

  return (
    <div className="overlay">
      <div className="overlay-card">
        <p className="eyebrow">Search rescue</p>
        <h1>Doheny is on fire.</h1>
        <p className="lede">
          You deploy on the west steps. WORLD is the live campus mesh. ROBOT pulls Street View
          from the mast. Sweep the quad and mark the four victims.
        </p>
        <ul className="mission-list">
          <li>
            <b>1</b> Doheny west door
          </li>
          <li>
            <b>2</b> West steps
          </li>
          <li>
            <b>3</b> Tommy Trojan
          </li>
          <li>
            <b>4</b> West of Bovard
          </li>
        </ul>
        <button type="button" className="deploy" autoFocus onClick={onDeploy}>
          Deploy
        </button>
        <p className="fineprint">Point the stick to walk that way. Enter deploys.</p>
      </div>
    </div>
  )
}
