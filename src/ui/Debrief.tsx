import { useDrive } from '../drive/store'
import { debriefRows, debriefSummary } from '../run/debrief'
import { useRun } from '../run/store'

function clock(t: number) {
  const s = Math.max(0, Math.floor(t))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function Debrief() {
  const state = useRun()
  const rows = debriefRows(state)
  const sum = debriefSummary(state)

  const again = () => {
    useDrive.getState().reset()
    useRun.getState().start()
  }

  return (
    <div className="debrief">
      <div className="debrief-inner">
        <p className="stage0-kicker">Run over · all cells vented</p>
        <h1>What happened</h1>
        <p className="debrief-lead">
          Ignition was the {sum.ignitionRoom}. The building burned for {clock(sum.duration)}. Seed{' '}
          {sum.seed}. Add <code>?seed={sum.seed}</code> to replay this ignition.
        </p>
        <ol className="debrief-list">
          {rows.map((row) => (
            <li key={row.id} className={row.highlight ? 'hi' : ''}>
              <header>
                <span className="n">{String(row.order).padStart(2, '0')}</span>
                <span className="room">{row.room}</span>
              </header>
              <p>
                <em>Saw</em> {row.seen}
              </p>
              <p>
                <em>Did</em> {row.did}
              </p>
              <p>
                <em>Was</em> {row.truth}
              </p>
              {row.highlight ? <p className="cf">{row.highlight}</p> : null}
            </li>
          ))}
        </ol>
        <p className="debrief-foot">
          {sum.peopleSaved} out. {sum.peopleLost} lost.
          {sum.marked ? ` ${sum.marked} marked for crews.` : ''}
        </p>
        <div className="debrief-actions">
          <button
            type="button"
            className="debrief-go"
            onClick={() => {
              useDrive.getState().reset()
              useRun.getState().start(sum.seed)
              useRun.getState().begin()
            }}
          >
            Replay seed
          </button>
          <button type="button" className="debrief-go" onClick={again}>
            New run
          </button>
          <button type="button" className="debrief-go" onClick={() => useRun.getState().showCredits()}>
            Credits
          </button>
        </div>
      </div>
    </div>
  )
}
