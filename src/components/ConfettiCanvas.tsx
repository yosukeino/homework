"use client";

import { useEffect, useRef } from "react";

interface ConfettiPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vy: number;
  vx: number;
  rot: number;
  vrot: number;
}

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#0f6853", "#c26d17", "#17191c", "#3b8a75", "#d99b38", "#b83227"];
    const pieces: ConfettiPiece[] = Array.from({ length: 95 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 7 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2.2 + Math.random() * 3.4,
      vx: (Math.random() - 0.5) * 2.2,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.14,
    }));

    const startTime = performance.now();
    let animId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alpha = elapsed > 3600 ? Math.max(0, 1 - (elapsed - 3600) / 1100) : 1;
      ctx.globalAlpha = alpha;

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        if (p.y > canvas.height + 20 && elapsed < 3300) {
          p.y = -15;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (elapsed < 4800) {
        animId = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;
}
