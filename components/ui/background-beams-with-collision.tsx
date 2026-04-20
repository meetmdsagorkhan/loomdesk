"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export function BackgroundBeamsWithCollision({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const beamsRef = useRef<Array<{ x: number; y: number; angle: number; speed: number; width: number; color: string }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Initialize beams
    const colors = ["#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"]
    for (let i = 0; i < 15; i++) {
      beamsRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        angle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
        width: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw beams
      beamsRef.current.forEach((beam) => {
        ctx.beginPath()
        ctx.strokeStyle = beam.color
        ctx.lineWidth = beam.width
        ctx.globalAlpha = 0.3

        const length = 200
        const endX = beam.x + Math.cos(beam.angle) * length
        const endY = beam.y + Math.sin(beam.angle) * length

        ctx.moveTo(beam.x, beam.y)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        // Move beam
        beam.x += Math.cos(beam.angle) * beam.speed
        beam.y += Math.sin(beam.angle) * beam.speed

        // Wrap around
        if (beam.x < 0) beam.x = canvas.width
        if (beam.x > canvas.width) beam.x = 0
        if (beam.y < 0) beam.y = canvas.height
        if (beam.y > canvas.height) beam.y = 0

        // Mouse interaction
        const dx = mouseRef.current.x - beam.x
        const dy = mouseRef.current.y - beam.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          beam.angle += (Math.random() - 0.5) * 0.1
        }
      })

      // Draw collision points
      beamsRef.current.forEach((beam1, i) => {
        beamsRef.current.forEach((beam2, j) => {
          if (i >= j) return
          const dx = beam1.x - beam2.x
          const dy = beam1.y - beam2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 50) {
            ctx.beginPath()
            ctx.fillStyle = "#ffffff"
            ctx.globalAlpha = 0.5
            ctx.arc((beam1.x + beam2.x) / 2, (beam1.y + beam2.y) / 2, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      })

      requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    window.addEventListener("mousemove", handleMouseMove)
    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
