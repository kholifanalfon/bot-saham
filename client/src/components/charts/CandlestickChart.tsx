import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { ISeriesApi } from 'lightweight-charts';

interface CandlestickChartProps {
  data: { time: string; open: number; high: number; low: number; close: number }[];
  ema9Data?: { time: string; value: number }[];
  ema21Data?: { time: string; value: number }[];
  ema50Data?: { time: string; value: number }[];
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  data, 
  ema9Data = [], 
  ema21Data = [], 
  ema50Data = [] 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema9SeriesRef = useRef<any>(null);
  const ema21SeriesRef = useRef<any>(null);
  const ema50SeriesRef = useRef<any>(null);

  // 1. Initialize Chart Canvas & Series once on mount
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
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      // Body fill colors
      upColor: '#10b981',
      downColor: '#ef4444',
      // Border must match body color for solid (filled) candle appearance
      borderVisible: true,
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      // Wick colors
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Add EMA line series overlay
    const ema9Series = chart.addLineSeries({
      color: '#3b82f6', // Bright blue for short-term EMA9
      lineWidth: 2,
      title: 'EMA 9',
    });

    const ema21Series = chart.addLineSeries({
      color: '#eab308', // Yellow for EMA21
      lineWidth: 2,
      title: 'EMA 21',
    });

    const ema50Series = chart.addLineSeries({
      color: '#ec4899', // Pink for long-term EMA50
      lineWidth: 2,
      title: 'EMA 50',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    ema9SeriesRef.current = ema9Series;
    ema21SeriesRef.current = ema21Series;
    ema50SeriesRef.current = ema50Series;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
      ema50SeriesRef.current = null;
    };
  }, []);

  // 2. Incremental or batch update series whenever data prop changes
  useEffect(() => {
    if (seriesRef.current && data && data.length > 0) {
      seriesRef.current.setData(data);
      
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Zoom in on mobile to show the last 20 candles for better readability
        const visibleCount = Math.min(20, data.length);
        chartRef.current?.timeScale().setVisibleLogicalRange({
          from: data.length - visibleCount,
          to: data.length + 1,
        });
      } else {
        // Fit all content on desktop
        chartRef.current?.timeScale().fitContent();
      }
    }
  }, [data]);

  // Update EMA series data
  useEffect(() => {
    if (ema9SeriesRef.current) {
      ema9SeriesRef.current.setData(ema9Data);
    }
  }, [ema9Data]);

  useEffect(() => {
    if (ema21SeriesRef.current) {
      ema21SeriesRef.current.setData(ema21Data);
    }
  }, [ema21Data]);

  useEffect(() => {
    if (ema50SeriesRef.current) {
      ema50SeriesRef.current.setData(ema50Data);
    }
  }, [ema50Data]);

  return <div ref={chartContainerRef} style={{ width: '100%', position: 'relative' }} />;
};
