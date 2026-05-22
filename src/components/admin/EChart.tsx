"use client";
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { PieChart, BarChart, RadarChart } from "echarts/charts";
import { LegendComponent, TooltipComponent, GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// 按需引入, 大幅减小打包体积
echarts.use([PieChart, BarChart, RadarChart, LegendComponent, TooltipComponent, GridComponent, CanvasRenderer]);

/** echarts 轻封装; canvas 渲染 (html2canvas 可导出 PDF) */
export function EChart({
  option,
  className,
  style,
}: {
  option: any;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current);
    inst.current.setOption(option);
    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); inst.current?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { inst.current?.setOption(option, true); }, [option]);

  return <div ref={ref} className={className} style={style} />;
}
