import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface RsiChartProps {
  data: { time: string; value: number }[];
}

export const RsiChart: React.FC<RsiChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const lineSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 120,
      timeScale: {
        visible: false, // Hide time scale since it aligns with main chart above
      },
    });

    // Add overbought (70) and oversold (30) reference lines
    const rsiSeries = chart.addLineSeries({
      color: '#10b981', // green for RSI
      lineWidth: 2,
      title: 'RSI (14)',
    });

    // Add horizontal price lines for 30 and 70 levels
    rsiSeries.createPriceLine({
      price: 70,
      color: 'rgba(239, 68, 68, 0.4)', // red dashed
      lineWidth: 1,
      lineStyle: 1, // Dashed
      axisLabelVisible: true,
      title: 'Overbought (70)',
    });

    rsiSeries.createPriceLine({
      price: 30,
      color: 'rgba(59, 130, 246, 0.4)', // blue dashed
      lineWidth: 1,
      lineStyle: 1, // Dashed
      axisLabelVisible: true,
      title: 'Oversold (30)',
    });

    chartRef.current = chart;
    lineSeriesRef.current = rsiSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      lineSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (lineSeriesRef.current && data && data.length > 0) {
      lineSeriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  return (
    <div style={{ position: 'relative', marginTop: '10px' }}>
      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>RSI (14)</div>
      <div ref={chartContainerRef} style={{ width: '100%' }} />
    </div>
  );
};
