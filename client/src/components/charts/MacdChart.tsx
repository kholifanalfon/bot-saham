import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface MacdData {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

interface MacdChartProps {
  data: MacdData[];
}

export const MacdChart: React.FC<MacdChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const macdSeriesRef = useRef<any>(null);
  const signalSeriesRef = useRef<any>(null);
  const histSeriesRef = useRef<any>(null);

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
        visible: false, // Align with parent chart
      },
    });

    const histSeries = chart.addHistogramSeries({
      color: '#10b981',
      priceFormat: {
        type: 'volume',
      },
    });

    const macdSeries = chart.addLineSeries({
      color: '#3b82f6', // blue
      lineWidth: 2,
      title: 'MACD',
    });

    const signalSeries = chart.addLineSeries({
      color: '#f59e0b', // orange
      lineWidth: 2,
      title: 'Signal',
    });

    chartRef.current = chart;
    macdSeriesRef.current = macdSeries;
    signalSeriesRef.current = signalSeries;
    histSeriesRef.current = histSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      macdSeriesRef.current = null;
      signalSeriesRef.current = null;
      histSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && data && data.length > 0) {
      const macdLineData = data.map(d => ({ time: d.time, value: d.macd }));
      const signalLineData = data.map(d => ({ time: d.time, value: d.signal }));
      const histData = data.map(d => ({
        time: d.time,
        value: d.histogram,
        color: d.histogram >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      }));

      macdSeriesRef.current.setData(macdLineData);
      signalSeriesRef.current.setData(signalLineData);
      histSeriesRef.current.setData(histData);

      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  return (
    <div style={{ position: 'relative', marginTop: '14px' }}>
      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>MACD (12, 26, 9)</div>
      <div ref={chartContainerRef} style={{ width: '100%' }} />
    </div>
  );
};
