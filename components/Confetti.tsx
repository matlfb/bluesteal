'use client'
import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number; vx: number; vy: number
  color: string; size: number; rotation: number; rotationSpeed: number; opacity: number
}

export default function Confetti({ active, onDone }: { active: boolean; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const el = canvasRef.current
    if (!el) return
    const ctxOrNull = el.getContext('2d')
    if (!ctxOrNull) return
    const ctx: CanvasRenderingContext2D = ctxOrNull
    const w = el.width = window.innerWidth
    const h = el.height = window.innerHeight

    const colors = ['#00e5ff','#00b4d8','#38bdf8','#e8e6dc','#ffffff','#0085ff']
    const particles: Particle[] = Array.from({ length: 160 }, () => ({
      x: Math.random() * w,
      y: -10 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 7,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1,
    }))

    let frame: number
    let done = false

    function draw() {
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        p.vy += 0.08
        p.rotation += p.rotationSpeed
        if (p.y > h * 0.6) p.opacity -= 0.025
        if (p.opacity > 0 && p.y < h + 20) alive++
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (alive > 0) { frame = requestAnimationFrame(draw) }
      else if (!done) { done = true; onDone() }
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', display: active ? 'block' : 'none' }}
    />
  )
}
