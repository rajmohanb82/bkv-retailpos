import React from "react";

interface BarcodeSvgProps {
  value: string;
  height?: number;
  className?: string;
  showText?: boolean;
}

export function buildBarcodeBars(value: string): { cursor: number; bars: { x: number; w: number }[] } {
  const safe = String(value || "BIKANERVALA").trim();
  const bars: { x: number; w: number }[] = [];
  let cursor = 6;

  // Start quiet zone & Code 128 / Code 39 style start guard
  bars.push({ x: cursor, w: 3 });
  cursor += 5;
  bars.push({ x: cursor, w: 2 });
  cursor += 4;
  bars.push({ x: cursor, w: 1 });
  cursor += 3;

  for (let i = 0; i < safe.length; i++) {
    const code = safe.charCodeAt(i);
    const pattern = [
      (code % 3) + 1,
      ((code >> 2) % 2) + 1,
      ((code >> 4) % 3) + 1,
      ((code >> 1) % 2) + 1,
    ];
    for (let j = 0; j < pattern.length; j++) {
      if (j % 2 === 0) {
        bars.push({ x: cursor, w: pattern[j] });
      }
      cursor += pattern[j] + 1;
    }
  }

  // Stop guard pattern
  bars.push({ x: cursor, w: 2 });
  cursor += 3;
  bars.push({ x: cursor, w: 3 });
  cursor += 5;
  bars.push({ x: cursor, w: 2 });
  cursor += 8;

  return { cursor, bars };
}

export function generateBarcodeSvgHtml(value: string, height: number = 46, showText: boolean = true): string {
  const safe = String(value || "EST-0001").trim();
  const { cursor, bars } = buildBarcodeBars(safe);
  const rects = bars
    .map(
      (b) =>
        `<rect x="${b.x}" y="2" width="${b.w}" height="${height - 4}" fill="#000000" shape-rendering="crispEdges" />`
    )
    .join("");

  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin:6px 0;width:100%;text-align:center;">
      <svg viewBox="0 0 ${cursor} ${height}" style="width:100%;max-width:260px;height:${height}px;background:#ffffff;display:block;margin:0 auto;" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect x="0" y="0" width="${cursor}" height="${height}" fill="#ffffff" />
        ${rects}
      </svg>
      ${
        showText
          ? `<div style="font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;letter-spacing:2px;color:#000000;margin-top:2px;text-align:center;">* ${safe} *</div>`
          : ""
      }
    </div>
  `;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  height = 46,
  className = "",
  showText = true,
}) => {
  const safe = String(value || "BIKANERVALA").trim();
  const { cursor, bars } = buildBarcodeBars(safe);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${cursor} ${height}`}
        className="w-full max-w-[260px]"
        style={{ height }}
        aria-label={`Barcode ${safe}`}
        shapeRendering="crispEdges"
      >
        <rect x={0} y={0} width={cursor} height={height} fill="#ffffff" />
        {bars.map((b, idx) => (
          <rect
            key={idx}
            x={b.x}
            y={2}
            width={b.w}
            height={height - 4}
            fill="#000000"
            shapeRendering="crispEdges"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[11px] font-bold tracking-widest text-slate-900 mt-1 block">
          * {safe} *
        </span>
      )}
    </div>
  );
};
