import { attribution, buildingName, osmId, site } from '../data/site'

export function Stage0Chrome() {
  const levelsNote =
    site.building.levelSource === 'fallback'
      ? 'OSM has no building:levels tag — using 4, which matches Doheny'
      : `OSM building:levels = ${site.building.levels}`

  return (
    <aside className="stage0">
      <p className="stage0-kicker">Stage 0 · massing</p>
      <h1>{buildingName()}</h1>
      <dl>
        <div>
          <dt>OSM</dt>
          <dd>{osmId()}</dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>{Math.round(site.building.areaSqM).toLocaleString()} m²</dd>
        </div>
        <div>
          <dt>Height</dt>
          <dd>{site.building.heightM.toFixed(1)} m from OSM</dd>
        </div>
        <div>
          <dt>Floors</dt>
          <dd>
            {site.building.levels} · {levelsNote}
          </dd>
        </div>
        <div>
          <dt>Rotation</dt>
          <dd>{site.building.orientedBounds.angleNormalizedDeg.toFixed(1)}° off east</dd>
        </div>
        <div>
          <dt>Fire grid</dt>
          <dd>
            {site.fireGrid.cells.length} cells kept · {site.fireGrid.discardedOutsideFootprint} discarded
            outside the wing
          </dd>
        </div>
      </dl>
      <p className="stage0-note">
        Visual is the procedural massing (hip roof, cornice, south pavilion). The pale line on the
        lawn is the real OSM footprint, collision later. Entrance faces Alumni Park.
      </p>
      <p className="stage0-hint">Drag to orbit · scroll to zoom</p>
      <p className="stage0-license">{attribution()}</p>
    </aside>
  )
}
