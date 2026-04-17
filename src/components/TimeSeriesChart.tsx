"use client";

import { useEffect, useRef } from "react";
import uPlot, { type AlignedData, type Options } from "uplot";
import "uplot/dist/uPlot.min.css";

interface Series {
  label: string;
  color: string;
  values: Array<number | null>;
}

interface Props {
  xs: number[];
  series: Series[];
  yLabel?: string;
  height?: number;
}

/**
 * uPlot wrapper. Chosen over visx because the brief calls for live streaming
 * time-series with potentially thousands of points per lane; uPlot renders to
 * canvas and stays smooth. Justification captured in README.
 */
export default function TimeSeriesChart({
  xs,
  series,
  yLabel,
  height = 260,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const el = hostRef.current;
    const data: AlignedData = [xs, ...series.map((s) => s.values)] as AlignedData;
    const opts: Options = {
      width: el.clientWidth || 600,
      height,
      scales: { x: { time: true } },
      axes: [
        { stroke: "#6b7280", grid: { stroke: "#1a2130" } },
        {
          stroke: "#6b7280",
          grid: { stroke: "#1a2130" },
          label: yLabel,
        },
      ],
      series: [
        { label: "time" },
        ...series.map((s) => ({
          label: s.label,
          stroke: s.color,
          width: 1.5,
          points: { show: false },
        })),
      ],
      legend: { show: true },
    };
    plotRef.current = new uPlot(opts, data, el);
    const onResize = () => {
      if (!plotRef.current || !hostRef.current) return;
      plotRef.current.setSize({
        width: hostRef.current.clientWidth,
        height,
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      plotRef.current?.destroy();
      plotRef.current = null;
    };
    // Rebuild when xs length changes (coarse); live updates use setData below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xs.length, series.length, height]);

  useEffect(() => {
    if (!plotRef.current) return;
    const data: AlignedData = [xs, ...series.map((s) => s.values)] as AlignedData;
    plotRef.current.setData(data);
  }, [xs, series]);

  return <div ref={hostRef} className="w-full" />;
}
