type Point = { period: string; ratio: number };

export function TrendChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-zinc-400">표시할 데이터가 없습니다.</p>
    );
  }

  const width = 640;
  const height = 200;
  const padding = 24;
  const max = Math.max(...data.map((d) => d.ratio), 1);

  const points = data.map((d, i) => {
    const x =
      padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (d.ratio / max) * (height - padding * 2);
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${padding},${height - padding} ${linePoints} ${
    width - padding
  },${height - padding}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full text-blue-600 dark:text-blue-400"
      role="img"
    >
      <title>키워드 검색 관심도 추이</title>
      <polygon points={areaPoints} fill="currentColor" opacity="0.08" />
      <polyline
        points={linePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <text
        x={padding}
        y={height - 4}
        fontSize="11"
        className="fill-zinc-400"
      >
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
