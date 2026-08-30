import { useEffect, useRef, useState, type PointerEvent } from 'react'

const DEAD = 0.1

export function AnalogKnob({
  label,
  hint,
  className,
  onVector,
}: {
  label: string
  hint: string
  className?: string
  onVector: (x: number, y: number, active: boolean) => void
}) {
  const well = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const send = useRef(onVector)
  send.current = onVector
  const [thumb, setThumb] = useState({ x: 0, y: 0 })
  const [hot, setHot] = useState(false)

  const apply = (clientX: number, clientY: number) => {
    const el = well.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const travel = Math.min(r.width, r.height) * 0.34
    let dx = clientX - (r.left + r.width / 2)
    let dy = clientY - (r.top + r.height / 2)
    const mag = Math.hypot(dx, dy)
    if (mag > travel) {
      dx = (dx / mag) * travel
      dy = (dy / mag) * travel
    }
    setThumb({ x: dx, y: dy })
    const nx = dx / travel
    const ny = -dy / travel
    if (Math.hypot(nx, ny) < DEAD) send.current(0, 0, true)
    else send.current(nx, ny, true)
  }

  const stop = () => {
    if (!dragging.current) return
    dragging.current = false
    setHot(false)
    setThumb({ x: 0, y: 0 })
    send.current(0, 0, false)
  }

  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      apply(e.clientX, e.clientY)
    }
    const onUp = () => stop()
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    setHot(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // window listeners still track the drag
    }
    apply(e.clientX, e.clientY)
  }

  return (
    <div ref={well} className={`knob ${hot ? 'hot' : ''} ${className ?? ''}`} onPointerDown={onDown}>
      <i className="knob-ring" />
      <i className="knob-cross" aria-hidden="true" />
      <i className="knob-fwd" aria-hidden="true" />
      <b className="knob-thumb" style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }} />
      <span>
        {label}
        <em>{hint}</em>
      </span>
    </div>
  )
}
