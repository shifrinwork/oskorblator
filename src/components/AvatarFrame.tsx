"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { FrameStyle } from "@/lib/achievements";
import { FRAMES } from "@/lib/achievements";

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

  // Рисуем анимированный градиент на canvas для топовых рамок
  useEffect(() => {
    if (!resolvedFrame.animated || !resolvedFrame.gradient) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let angle = 0;
    let rafId: number;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const s = canvas.width;
      const t = resolvedFrame.thickness;

      ctx.clearRect(0, 0, s, s);

      // Вращающийся конический градиент
      const gradient = ctx.createConicGradient((angle * Math.PI) / 180, s / 2, s / 2);
      const colors = resolvedFrame.gradient!;
      colors.forEach((c, i) => gradient.addColorStop(i / (colors.length - 1), c));

      ctx.strokeStyle = gradient;
      ctx.lineWidth = t * 2;
      const r = s / 2 - t;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
      ctx.stroke();

      angle = (angle + 1) % 360;
      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [resolvedFrame]);

  const borderStyle = !resolvedFrame.animated
    ? {
        border: `${resolvedFrame.thickness}px solid ${resolvedFrame.borderColor}`,
        boxShadow: resolvedFrame.glowSize > 0
          ? `0 0 ${resolvedFrame.glowSize}px ${resolvedFrame.glowColor}, 0 0 ${resolvedFrame.glowSize * 2}px ${resolvedFrame.glowColor}40`
          : "none",
      }
    : {};

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Анимированная рамка через canvas */}
      {resolvedFrame.animated && resolvedFrame.gradient && (
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ zIndex: 2 }}
        />
      )}

      {/* Аватар */}
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
