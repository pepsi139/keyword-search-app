"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Point = { period: string; ratio: number };

const numberFormat = new Intl.NumberFormat("ko-KR");

export function TrendChart({ data }: { data: Point[] }) {
  const lineRef = useRef<SVGPolylineElement>(null);
  const hasMountedRef = useRef(false);
  const [dashLength, setDashLength] = useState(0);
  const [animated, setAnimated] = useState(false);
  const [fadePulse, setFadePulse] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 640;
  const height = 200;
  const padding = 24;
  const max = Math.max(...data.map((d) => d.ratio), 1);

  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2),
    y: height - padding - (d.ratio / max) * (height - padding * 2),
  }));

  useLayoutEffect(() => {
    if (!lineRef.current) return;
    const len = lineRef.current.getTotalLength();
    setDashLength(len);

    if (!hasMountedRef.current) {
      // 처음 나타날 때만 선이 그려지는 효과를 재생
      hasMountedRef.current = true;
      setAnimated(false);
      const raf = requestAnimationFrame(() => setAnimated(true));
      return () => cancelAnimationFrame(raf);
    }

    // 이후 데이터 갱신(기간 변경 등)은 다시 그리지 않고, 살짝 페이드만 줘서 부드럽게 전환
    setAnimated(true);
    setFadePulse(true);
    const t = setTimeout(() => setFadePulse(false), 20);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  if (data.length === 0) {
    return <p className="text-sm text-zinc-400">표시할 데이터가 없습니다.</p>;
  }

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${padding},${height - padding} ${linePoints} ${
    width - padding
  },${height - padding}`;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - mouseX);
      if (d < minDist) {
        minDist = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hover = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverData = hoverIndex !== null ? data[hoverIndex] : null;

  let tooltip: { x: number; y: number; width: number; label: string } | null = null;
  if (hover && hoverData) {
    const label = `${hoverData.period} · ${numberFormat.format(hoverData.ratio)}`;
    const boxWidth = Math.max(70, label.length * 6.4 + 16);
    const boxX = Math.min(
      Math.max(hover.x - boxWidth / 2, padding),
      width - padding - boxWidth,
    );
    const boxY = Math.max(hover.y - 32, 4);
    tooltip = { x: boxX, y: boxY, width: boxWidth, label };
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full text-blue-600 dark:text-blue-400"
      role="img"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <title>키워드 검색 관심도 추이</title>
      <g style={{ opacity: fadePulse ? 0.4 : 1, transition: "opacity 0.35s ease" }}>
        <polygon
          points={areaPoints}
          fill="currentColor"
          opacity={animated ? 0.08 : 0}
          style={{ transition: "opacity 1s ease 0.3s" }}
        />
        <polyline
          ref={lineRef}
          points={linePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: dashLength || undefined,
            strokeDashoffset: dashLength ? (animated ? 0 : dashLength) : 0,
            transition: dashLength ? "stroke-dashoffset 1.1s ease" : undefined,
          }}
        />
      </g>

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={hoverIndex === i ? 4 : 0}
          fill="currentColor"
          style={{ transition: "r 0.15s ease" }}
        />
      ))}

      {hover && (
        <line
          x1={hover.x}
          y1={padding}
          x2={hover.x}
          y2={height - padding}
          stroke="currentColor"
          strokeOpacity="0.15"
        />
      )}

      {tooltip && (
        <g style={{ transition: "opacity 0.15s ease" }}>
          <rect
            x={tooltip.x}
            y={tooltip.y}
            width={tooltip.width}
            height={22}
            rx={5}
            className="fill-zinc-900 dark:fill-zinc-100"
          />
          <text
            x={tooltip.x + tooltip.width / 2}
            y={tooltip.y + 15}
            textAnchor="middle"
            fontSize="11"
            className="fill-white dark:fill-zinc-900"
          >
            {tooltip.label}
          </text>
        </g>
      )}

      <text x={padding} y={height - 4} fontSize="11" className="fill-zinc-400">
        {data[0]?.period}
      </text>
      <text
        x={width - padding}
        y={height - 4}
        fontSize="11"
        textAnchor="end"
        className="fill-zinc-400"
      >
        {data[data.length - 1]?.period}
      </text>
    </svg>
  );
}
