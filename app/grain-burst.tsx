"use client";

import { useEffect, useRef } from "react";

/** Ray angles in degrees (0 = right, 90 = down) and lengths as a fraction of the canvas diagonal. */
const RAYS = [
  { angle: -90, length: 0.3 },
  { angle: -32, length: 0.36 },
  { angle: 18, length: 0.28 },
  { angle: 55, length: 0.38 },
  { angle: 90, length: 0.42 },
  { angle: 142, length: 0.5 },
  { angle: 180, length: 0.34 },
  { angle: -148, length: 0.48 },
];

const DOT_COLOR = [229, 254, 147]; // --lime

/** Burst center as a fraction of the canvas size: off-center toward the top right. */
const CENTER = { x: 0.9, y: 0.22 };

/** Small seeded PRNG so the grain pattern is identical on every draw. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Probability (0-1) that a pixel at (dx, dy) from the center gets a dot. */
function density(dx: number, dy: number, core: number, diag: number, minWidth: number) {
  const r = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);

  // Soft central cloud.
  let empty = 1 - 0.42 * Math.exp(-((r / core) ** 2) * 1.1);

  // Rays: wide and faint near the core, narrowing into dense lines toward their tips.
  for (const ray of RAYS) {
    const a = (ray.angle * Math.PI) / 180;
    const along = r * Math.cos(theta - a);
    if (along <= 0) continue;
    const across = Math.abs(r * Math.sin(theta - a));
    const width = core * 0.7 * Math.exp(-along / (core * 0.5)) + minWidth;
    const length = ray.length * diag;
    const fade = along > length ? Math.exp(-(((along - length) / (core * 0.15)) ** 2)) : 1;
    const strength = Math.min(0.95, (core * 0.05) / width);
    empty *= 1 - strength * Math.exp(-((across / width) ** 2)) * fade;
  }
  return 1 - empty;
}

/** Decorative stippled starburst, drawn once per size onto a canvas that fills its parent. */
export default function GrainBurst({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (width === 0 || height === 0) return;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const image = ctx.createImageData(width, height);
      const random = mulberry32(5);
      const cx = width * CENTER.x;
      const cy = height * CENTER.y;
      const core = Math.min(width, height) * 0.24;
      const diag = Math.hypot(width, height);
      const minWidth = 1.2 * dpr;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (random() < density(x - cx, y - cy, core, diag, minWidth)) {
            const i = (y * width + x) * 4;
            image.data[i] = DOT_COLOR[0];
            image.data[i + 1] = DOT_COLOR[1];
            image.data[i + 2] = DOT_COLOR[2];
            image.data[i + 3] = 255;
          }
        }
      }
      ctx.putImageData(image, 0, 0);
    }

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none ${className}`} />;
}
