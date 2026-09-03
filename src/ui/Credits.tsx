import { attribution, buildingName } from '../data/site'
import { useRun } from '../run/store'

const LINES = [
  {
    title: 'Site geometry',
    body: `${attribution()}. Footprint and fire grid are derived from the OSM outline of ${buildingName()}.`,
  },
  {
    title: 'Elevation photograph',
    body: 'Facade albedo and normal maps are derived from “Doheny Library” by Padsquad19, Wikimedia Commons, CC BY-SA 3.0.',
  },
  {
    title: 'What this is not',
    body: 'USC Digital Library photographs were used as modelling reference only. They are not projected as textures.',
  },
]

export function Credits() {
  return (
    <div className="debrief credits">
      <div className="debrief-inner">
        <p className="stage0-kicker">Credits</p>
        <h1>Sources</h1>
        <p className="debrief-lead">
          Night perimeter around the real Doheny Memorial Library. Nothing here is a grade.
        </p>
        <ol className="debrief-list">
          {LINES.map((line) => (
            <li key={line.title}>
              <header>
                <span className="room">{line.title}</span>
              </header>
              <p>{line.body}</p>
            </li>
          ))}
        </ol>
        <p className="debrief-foot">{attribution()}</p>
        <div className="debrief-actions">
          <button type="button" className="debrief-go" onClick={() => useRun.getState().hideCredits()}>
            Back to the run
          </button>
        </div>
      </div>
    </div>
  )
}
