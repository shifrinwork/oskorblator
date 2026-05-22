"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { FrameStyle } from "@/lib/achievements";
import { FRAMES } from "@/lib/achievements";

// ─────────────────────────────────────────────────────────────
// Canvas pattern drawing functions
// S = canvas size; d = detail level 1-7; t = time in seconds
// All coordinates are relative to canvas (0,0)–(S,S)
// Only draw in the outer ring — center stays transparent
// ─────────────────────────────────────────────────────────────

function drawChain(ctx: CanvasRenderingContext2D, S: number, d: number, t: number) {
  const cx = S / 2, cy = S / 2;
  const R  = S * 0.415;
  const lw = S * 0.044; // link half-major axis
  const lh = S * 0.025; // link half-minor axis
  const num = 8 + d * 2;

  // Color palettes per detail [fill, stroke, highlight]
  const palettes: [string, string, string][] = [
    ["#6b7280", "#374151", "#9ca3af"],   // 1 gray iron
    ["#78716c", "#44403c", "#c8b39a"],   // 2 rusty
    ["#374151", "#111827", "#6b7280"],   // 3 dark iron
    ["#92400e", "#451a03", "#d97706"],   // 4 bronze
    ["#9ca3af", "#4b5563", "#f1f5f9"],   // 5 silver
    ["#b45309", "#78350f", "#fef3c7"],   // 6 gold
    ["#b45309", "#78350f", "#fef3c7"],   // 7 gold (animated rainbow)
  ];

  for (let i = 0; i < num; i++) {
    const angle = (i / num) * Math.PI * 2 + (d >= 6 ? t * 0.4 : 0);
    const x = cx + Math.cos(angle) * R;
    const y = cy + Math.sin(angle) * R;
    const isEven = i % 2 === 0;

    let fill: string, stroke: string, hl: string;
    if (d === 7) {
      const hue = ((i / num) * 360 + t * 45) % 360;
      fill   = `hsl(${hue},70%,48%)`;
      stroke = `hsl(${hue},60%,30%)`;
      hl     = `hsl(${hue},80%,78%)`;
    } else {
      [fill, stroke, hl] = palettes[d - 1];
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + (isEven ? 0 : Math.PI / 2));

    // Outer ellipse (link body)
    ctx.beginPath();
    ctx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = S * 0.009;
    ctx.stroke();

    // Inner hole
    ctx.beginPath();
    ctx.ellipse(0, 0, lw * 0.55, lh * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fill();

    // 3D highlight for d >= 3
    if (d >= 3) {
      ctx.beginPath();
      ctx.ellipse(-lw * 0.18, -lh * 0.3, lw * 0.26, lh * 0.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = hl + "55";
      ctx.fill();
    }

    // Gem for d >= 6
    if (d >= 6 && isEven) {
      ctx.beginPath();
      ctx.arc(0, 0, S * 0.013, 0, Math.PI * 2);
      ctx.fillStyle = d === 7 ? "#fff" : "#fef3c7";
      ctx.shadowColor = d === 7 ? `hsl(${((i / num) * 360 + t * 45) % 360},100%,70%)` : "#fde68a";
      ctx.shadowBlur = S * 0.04;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────

function drawSpikes(ctx: CanvasRenderingContext2D, S: number, d: number, t: number) {
  const cx = S / 2, cy = S / 2;
  const num    = 8 + d * 2;
  const innerR = S * 0.335;
  const outerR = S * 0.478;
  const halfA  = (Math.PI / num) * 0.46;

  // Thin base ring
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = d <= 5 ? "#1f2937" : d === 6 ? "#1e3a5f" : "#1e1b4b";
  ctx.lineWidth = S * 0.013;
  ctx.stroke();

  for (let i = 0; i < num; i++) {
    const baseA = (i / num) * Math.PI * 2 + (d === 7 ? t * 0.25 : 0);
    const tipX  = cx + Math.cos(baseA) * outerR;
    const tipY  = cy + Math.sin(baseA) * outerR;
    const lx = cx + Math.cos(baseA - halfA) * innerR;
    const ly = cy + Math.sin(baseA - halfA) * innerR;
    const rx = cx + Math.cos(baseA + halfA) * innerR;
    const ry = cy + Math.sin(baseA + halfA) * innerR;
    const mx = (lx + rx) / 2, my = (ly + ry) / 2;

    const grad = ctx.createLinearGradient(mx, my, tipX, tipY);
    switch (d) {
      case 1:
        grad.addColorStop(0, "#4b5563"); grad.addColorStop(1, "#9ca3af"); break;
      case 2:
        grad.addColorStop(0, "#1f2937"); grad.addColorStop(1, "#4b5563"); break;
      case 3:
        grad.addColorStop(0, "#1f2937"); grad.addColorStop(0.65, "#374151"); grad.addColorStop(1, "#dc2626"); break;
      case 4:
        grad.addColorStop(0, "#111827"); grad.addColorStop(0.5, "#374151"); grad.addColorStop(1, "#991b1b"); break;
      case 5:
        grad.addColorStop(0, "#fefce8"); grad.addColorStop(0.6, "#fef3c7"); grad.addColorStop(1, "#dc2626"); break;
      case 6:
        grad.addColorStop(0, "#1e3a5f"); grad.addColorStop(0.5, "#1d4ed8"); grad.addColorStop(1, "#93c5fd"); break;
      default: {
        const hue = ((i / num) * 180 + t * 55) % 360;
        grad.addColorStop(0, `hsl(${hue},90%,25%)`);
        grad.addColorStop(1, `hsl(${(hue + 60) % 360},100%,75%)`);
      }
    }

    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rx, ry);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Blood tip (d 3-4)
    if (d === 3 || d === 4) {
      ctx.beginPath();
      ctx.arc(tipX, tipY, S * 0.013, 0, Math.PI * 2);
      ctx.fillStyle = "#7f1d1d";
      ctx.fill();
    }

    // Blood drip (d 4-5)
    if (d === 4 || d === 5) {
      const dropDist = S * 0.032;
      const dx = tipX + Math.cos(baseA) * dropDist;
      const dy = tipY + Math.sin(baseA) * dropDist;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.bezierCurveTo(
        tipX + Math.cos(baseA) * dropDist * 0.3,
        tipY + Math.sin(baseA) * dropDist * 0.3,
        dx, dy, dx, dy
      );
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = S * 0.016;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dx, dy, S * 0.018, 0, Math.PI * 2);
      ctx.fillStyle = "#dc2626";
      ctx.fill();
    }

    // Crystal face-highlight (d 6-7)
    if (d >= 6) {
      const midEdge = {
        x: (lx + tipX) / 2 + Math.cos(baseA - Math.PI / 2) * S * 0.01,
        y: (ly + tipY) / 2 + Math.sin(baseA - Math.PI / 2) * S * 0.01,
      };
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(midEdge.x, midEdge.y);
      ctx.lineTo(tipX, tipY);
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.fill();
    }
  }

  // Ambient glow ring (d 6-7)
  if (d >= 6) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.beginPath();
    ctx.arc(cx, cy, (innerR + outerR) / 2, 0, Math.PI * 2);
    const gc = d === 7 ? `hsl(${(t * 55) % 360},100%,65%)` : "#60a5fa";
    ctx.strokeStyle = gc;
    ctx.lineWidth = S * 0.1;
    ctx.globalAlpha = 0.12;
    ctx.stroke();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────

function drawThorns(ctx: CanvasRenderingContext2D, S: number, d: number, t: number) {
  const cx = S / 2, cy = S / 2;
  const num    = 8 + d * 2;
  const innerR = S * 0.345;
  const outerR = S * 0.475;

  for (let i = 0; i < num; i++) {
    const angle = (i / num) * Math.PI * 2 + (d === 6 ? t * 0.35 : 0);
    const offset = 0.13; // asymmetry — thorn leans forward

    const tipA = angle + offset;
    const tipX = cx + Math.cos(tipA) * outerR;
    const tipY = cy + Math.sin(tipA) * outerR;

    const lx = cx + Math.cos(angle - 0.17) * innerR;
    const ly = cy + Math.sin(angle - 0.17) * innerR;
    const rx = cx + Math.cos(angle + 0.09) * innerR;
    const ry = cy + Math.sin(angle + 0.09) * innerR;

    // Quadratic control point for the curved back edge
    const cpA = (angle + tipA) / 2 + 0.09;
    const cpR = (innerR + outerR) * 0.56;
    const cpX = cx + Math.cos(cpA) * cpR;
    const cpY = cy + Math.sin(cpA) * cpR;

    const colors = ["#15803d","#14532d","#111827","#f5f0e0","#4a1d96","#b45309"];
    const fillColor = colors[d - 1] ?? "#15803d";

    if (d >= 5) {
      ctx.shadowColor = d === 6 ? "#f59e0b" : "#7c3aed";
      ctx.shadowBlur  = S * 0.07;
    }

    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(tipX, tipY);
    ctx.quadraticCurveTo(cpX, cpY, rx, ry);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Blood drops (d 2-3)
    if (d === 2 || d === 3) {
      const sz = S * (d === 2 ? 0.012 : 0.016);
      const dist = S * (d === 2 ? 0.022 : 0.030);
      ctx.beginPath();
      ctx.arc(tipX + Math.cos(tipA) * dist, tipY + Math.sin(tipA) * dist, sz, 0, Math.PI * 2);
      ctx.fillStyle = "#991b1b";
      ctx.fill();
    }

    // Mini skull ornament every 4th thorn (d 4)
    if (d === 4 && i % 4 === 0) {
      const bx = cx + Math.cos(angle) * (innerR * 1.22);
      const by = cy + Math.sin(angle) * (innerR * 1.22);
      const kr = S * 0.026;
      ctx.beginPath();
      ctx.arc(bx, by, kr, 0, Math.PI * 2);
      ctx.fillStyle = "#f5f0e0";
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.beginPath();
      ctx.arc(bx - kr * 0.33, by - kr * 0.08, kr * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + kr * 0.33, by - kr * 0.08, kr * 0.27, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ─────────────────────────────────────────────────────────────

function drawFire(ctx: CanvasRenderingContext2D, S: number, d: number, t: number) {
  const cx = S / 2, cy = S / 2;
  const R = S * 0.365;
  const numFlames = 20;

  for (let i = 0; i < numFlames; i++) {
    const baseA = (i / numFlames) * Math.PI * 2;
    const phase = t * 4 + (i / numFlames) * Math.PI * 6;
    const fH    = S * 0.072 + S * 0.038 * Math.sin(phase);
    const wobble = 0.045 * Math.sin(phase * 1.4 + 0.5);

    const b1x = cx + Math.cos(baseA - 0.13) * R;
    const b1y = cy + Math.sin(baseA - 0.13) * R;
    const b2x = cx + Math.cos(baseA + 0.13) * R;
    const b2y = cy + Math.sin(baseA + 0.13) * R;

    const tipA = baseA + wobble;
    const tipX = cx + Math.cos(tipA) * (R + fH);
    const tipY = cy + Math.sin(tipA) * (R + fH);

    const cpX = cx + Math.cos(baseA + wobble * 0.5) * (R + fH * 0.52);
    const cpY = cy + Math.sin(baseA + wobble * 0.5) * (R + fH * 0.52);

    const bx = cx + Math.cos(baseA) * R;
    const by = cy + Math.sin(baseA) * R;
    const grad = ctx.createRadialGradient(bx, by, 0, tipX, tipY, fH);

    if (d === 1) {
      grad.addColorStop(0, "#fef08a");
      grad.addColorStop(0.35, "#fb923c");
      grad.addColorStop(0.75, "#dc2626");
      grad.addColorStop(1, "transparent");
    } else if (d === 2) {
      grad.addColorStop(0, "#e0f2fe");
      grad.addColorStop(0.35, "#38bdf8");
      grad.addColorStop(0.75, "#4f46e5");
      grad.addColorStop(1, "transparent");
    } else {
      const hue = ((i / numFlames) * 360 + t * 65) % 360;
      grad.addColorStop(0, `hsl(${hue},100%,88%)`);
      grad.addColorStop(0.45, `hsl(${(hue + 40) % 360},100%,55%)`);
      grad.addColorStop(1, "transparent");
    }

    ctx.beginPath();
    ctx.moveTo(b1x, b1y);
    ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
    ctx.quadraticCurveTo(cpX, cpY, b2x, b2y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────

function drawCircuit(ctx: CanvasRenderingContext2D, S: number, d: number, t: number) {
  const cx = S / 2, cy = S / 2;
  const R   = S * 0.415;
  const num = 5 + d;

  const traceC = ["#4b5563","#16a34a","#1d4ed8","#7c3aed","#d97706","#ec4899","#06b6d4"][d - 1];
  const glowC  = ["transparent","#4ade80","#60a5fa","#a78bfa","#fde68a","#f9a8d4","#67e8f9"][d - 1];
  const animated = d >= 4;

  const glow = () => { ctx.shadowColor = glowC; ctx.shadowBlur = S * 0.04; };
  const noGlow = () => { ctx.shadowBlur = 0; };

  // Main ring
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = traceC;
  ctx.lineWidth = S * 0.022;
  if (d >= 2) glow();
  ctx.stroke();
  noGlow();

  // Nodes + L-traces
  for (let i = 0; i < num; i++) {
    const angle = (i / num) * Math.PI * 2;
    const nx = cx + Math.cos(angle) * R;
    const ny = cy + Math.sin(angle) * R;

    const goIn  = i % 2 === 0;
    const bLen  = S * 0.04 + S * 0.015 * (i % 3);
    const bDirX = Math.cos(angle) * bLen * (goIn ? -1 : 1);
    const bDirY = Math.sin(angle) * bLen * (goIn ? -1 : 1);
    const bex   = nx + bDirX;
    const bey   = ny + bDirY;
    const ltX   = bex + Math.cos(angle + Math.PI / 2) * S * 0.018 * ((i % 3) - 1);
    const ltY   = bey + Math.sin(angle + Math.PI / 2) * S * 0.018 * ((i % 3) - 1);

    if (d >= 2) glow();
    ctx.strokeStyle = traceC;
    ctx.lineWidth = S * 0.01;
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(bex, bey);
    ctx.lineTo(ltX, ltY);
    ctx.stroke();
    noGlow();

    // Node square
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(angle);
    const ns = S * 0.024;
    if (d >= 2) glow();
    ctx.fillStyle = traceC;
    ctx.fillRect(-ns, -ns, ns * 2, ns * 2);
    noGlow();
    ctx.restore();

    // Terminal dot
    if (d >= 2) glow();
    ctx.beginPath();
    ctx.arc(ltX, ltY, S * 0.013, 0, Math.PI * 2);
    ctx.fillStyle = traceC;
    ctx.fill();
    noGlow();
  }

  // Animated pulse(s)
  if (animated) {
    const pa = t % (Math.PI * 2);
    [[pa, "white"], [pa + Math.PI, d >= 6 ? "#e0f2fe" : "white"]].forEach(([a, c], idx) => {
      if (idx === 1 && d < 6) return;
      ctx.save();
      ctx.shadowColor = d === 7 ? `hsl(${(t * 35) % 360},100%,70%)` : glowC;
      ctx.shadowBlur  = S * 0.06;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a as number) * R, cy + Math.sin(a as number) * R, S * (idx === 0 ? 0.022 : 0.017), 0, Math.PI * 2);
      ctx.fillStyle = c as string;
      ctx.fill();
      ctx.restore();
    });
  }
}

// ─────────────────────────────────────────────────────────────

function drawSnake(ctx: CanvasRenderingContext2D, S: number, d: number, t: number) {
  const cx = S / 2, cy = S / 2;
  const R        = S * 0.405;
  const bodyW    = S * (0.048 + d * 0.006);
  const numHeads = d <= 2 ? 1 : d === 3 ? 2 : 3;
  const waveAmp  = bodyW * 0.55;
  const waveFreq = 7;
  const segs     = 72;

  const bodyColors = ["#166534","#991b1b","#4c1d95"];
  const eyeColors  = ["#fef08a","#fca5a5","#ddd6fe"];
  const timeScale  = d === 4 ? t * 1.2 : 0;

  for (let sn = 0; sn < numHeads; sn++) {
    const hStartA = (sn / numHeads) * Math.PI * 2;
    const bodyColor = bodyColors[sn % bodyColors.length];
    const eyeColor  = eyeColors[sn % eyeColors.length];
    const gapArc    = 0.22;
    const arcSpan   = (Math.PI * 2) / numHeads - gapArc * 2;

    // ── Body ──
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = hStartA + gapArc + (i / segs) * arcSpan;
      const r = R + waveAmp * Math.sin(a * waveFreq + timeScale);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = bodyW;
    ctx.lineCap = "round";
    if (d >= 3) { ctx.shadowColor = bodyColor; ctx.shadowBlur = S * 0.04; }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Scales ──
    const scaleStep = Math.max(1, Math.floor(segs / 28));
    for (let i = scaleStep; i < segs - scaleStep; i += scaleStep) {
      const a = hStartA + gapArc + (i / segs) * arcSpan;
      const r = R + waveAmp * Math.sin(a * waveFreq + timeScale);
      ctx.save();
      ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.arc(0, -bodyW * 0.2, bodyW * 0.5, Math.PI * 0.18, Math.PI * 0.82);
      ctx.strokeStyle = bodyColor + "77";
      ctx.lineWidth = S * 0.007;
      ctx.stroke();
      ctx.restore();
    }

    // ── Head ──
    const headBob = d === 4 ? Math.sin(t * 2.2 + sn * Math.PI * 2 / 3) * S * 0.018 : 0;
    const headR   = R + headBob;
    const hx = cx + Math.cos(hStartA) * headR;
    const hy = cy + Math.sin(hStartA) * headR;
    const hs = bodyW * 1.55;

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(hStartA);

    // Head shape
    if (d >= 3) { ctx.shadowColor = bodyColor; ctx.shadowBlur = S * 0.05; }
    ctx.beginPath();
    ctx.ellipse(hs * 0.45, 0, hs * 1.05, hs * 0.62, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hs * 1.25, 0, hs * 0.38, hs * 0.40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eye
    ctx.beginPath();
    ctx.arc(hs * 0.65, -hs * 0.34, hs * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = eyeColor;
    ctx.fill();
    // Slit pupil
    ctx.beginPath();
    ctx.ellipse(hs * 0.68, -hs * 0.34, hs * 0.09, hs * 0.21, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    // Eye shine
    ctx.beginPath();
    ctx.arc(hs * 0.58, -hs * 0.41, hs * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();

    // Tongue (forked)
    ctx.beginPath();
    ctx.moveTo(hs * 1.63, 0);
    ctx.lineTo(hs * 2.2,  -hs * 0.38);
    ctx.moveTo(hs * 1.63, 0);
    ctx.lineTo(hs * 2.2,   hs * 0.38);
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = S * 0.012;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────

function dispatchDraw(
  pattern: string,
  ctx: CanvasRenderingContext2D,
  S: number,
  d: number,
  t: number,
) {
  ctx.clearRect(0, 0, S, S);
  switch (pattern) {
    case "chain":   drawChain(ctx, S, d, t);   break;
    case "spikes":  drawSpikes(ctx, S, d, t);  break;
    case "thorns":  drawThorns(ctx, S, d, t);  break;
    case "fire":    drawFire(ctx, S, d, t);    break;
    case "circuit": drawCircuit(ctx, S, d, t); break;
    case "snake":   drawSnake(ctx, S, d, t);   break;
  }
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

interface AvatarFrameProps {
  username: string;
  avatarUrl?: string | null;
  frame?: FrameStyle;
  frameId?: string;
  size?: number;
  className?: string;
}

export default function AvatarFrame({
  username,
  avatarUrl,
  frame,
  frameId,
  size = 56,
  className = "",
}: AvatarFrameProps) {
  const resolvedFrame = frame ?? (frameId ? FRAMES[frameId] : null) ?? FRAMES.default;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pattern = resolvedFrame.pattern;
  const detail  = resolvedFrame.patternDetail ?? 1;

  useEffect(() => {
    if (!pattern) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (resolvedFrame.animated) {
      let rafId: number;
      const animate = (ts: number) => {
        dispatchDraw(pattern, ctx, size, detail, ts * 0.001);
        rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafId);
    } else {
      dispatchDraw(pattern, ctx, size, detail, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedFrame.id, size]);

  // CSS border only for the default (no-pattern) frame
  const borderStyle = !pattern
    ? {
        border: `${resolvedFrame.thickness}px solid ${resolvedFrame.borderColor}`,
        boxShadow:
          resolvedFrame.glowSize > 0
            ? `0 0 ${resolvedFrame.glowSize}px ${resolvedFrame.glowColor}, 0 0 ${resolvedFrame.glowSize * 2}px ${resolvedFrame.glowColor}40`
            : "none",
      }
    : {};

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Canvas for pattern frames */}
      {pattern && (
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ zIndex: 2 }}
        />
      )}

      {/* Avatar */}
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        style={{
          ...borderStyle,
          fontSize: size * 0.4,
          background: "linear-gradient(135deg, #1c0a00, #2d1a00)",
        }}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={username}
            width={size}
            height={size}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold text-orange-400 leading-none select-none">
            {username[0]?.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
