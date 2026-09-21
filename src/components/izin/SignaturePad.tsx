"use client";

import React, { useRef, useState, useEffect } from "react";

export default function SignaturePad({
  onChange,
  height = 160,
}: {
  onChange?: (dataUrl: string | null) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 600;
    canvas.width = w * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, height);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
    }
  }, [height]);

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onChange) return;
    onChange(hasInk ? canvas.toDataURL("image/png") : null);
  };

  return (
    <div>
      <div className="rounded-xl overflow-hidden border-2 border-dashed border-slate-600 bg-white touch-none">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height, touchAction: "none", cursor: "crosshair" }}
          onPointerDown={(e) => {
            drawing.current = true;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx) { const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx) { const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); if (!hasInk) setHasInk(true); }
          }}
          onPointerUp={() => { drawing.current = false; emit(); }}
          onPointerLeave={() => { if (drawing.current) { drawing.current = false; emit(); } }}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-[11px] text-slate-400">Tulis tanda tangan di kotak putih di atas</span>
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const r = canvas.getBoundingClientRect();
              ctx.clearRect(0, 0, r.width || 600, height);
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, r.width || 600, height);
            }
            setHasInk(false);
            onChange?.(null);
          }}
          className="text-[11px] font-bold text-rose-300 hover:text-rose-200 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}
