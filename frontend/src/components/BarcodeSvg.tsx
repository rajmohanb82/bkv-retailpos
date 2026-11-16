import React from "react";

interface BarcodeSvgProps {
  value: string;
  height?: number;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  height = 44,
  className = "",
}) => {
  const safe = value || "ANNAVYAPOS";
  const bars: { x: number; w: number }[] = [];
  let cursor = 4;

  // Start guard
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

  // Stop guard
  bars.push({ x: cursor, w: 2 });
  cursor += 3;
  bars.push({ x: cursor, w: 2 });
  cursor += 6;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${cursor} ${height}`}
        className="w-full max-w-[230px]"
        style={{ height }}
        aria-label={`Barcode ${safe}`}
      >
        <rect x={0} y={0} width={cursor} height={height} fill="#ffffff" />
        {bars.map((b, idx) => (
          <rect
            key={idx}
            x={b.x}
            y={2}
            width={b.w}
            height={height - 4}
            fill="#0F2544"
          />
        ))}
      </svg>
      <span className="font-mono text-[11px] font-bold tracking-widest text-slate-800 mt-0.5">
        {safe}
      </span>
    </div>
  );
};

