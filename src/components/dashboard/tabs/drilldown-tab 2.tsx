"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Loader2, TrendingUp, Activity, Droplets, Thermometer, CloudRain } from 'lucide-react';
import { fetchDengueData, fetchAWDData, fetchMalariaData, DengueData, AWDData, MalariaData } from '@/lib/drilldown-api';
import { locations, weatherDiseaseTriggers } from '@/lib/data';
import WeatherDiseaseTriggers from '../WeatherDiseaseTriggers';

type WeatherVariable = 'temperature' | 'humidity' | 'rainfall' | 'all';

export default function DrilldownTab() {
  const [disease, setDisease] = useState<'dengue' | 'awd' | 'malaria'>('dengue');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [dengueData, setDengueData] = useState<DengueData[]>([]);
  const [awdData, setAWDData] = useState<AWDData[]>([]);
  const [malariaData, setMalariaData] = useState<MalariaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [weatherVariable, setWeatherVariable] = useState<WeatherVariable>('all');
  const [error, setError] = useState<string | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([2024, 2025]);

  const districts = locations.filter(l => l.level === 'district');

  // Get available year range from data
  const availableYears = useMemo(() => {
    if (disease === 'dengue' && dengueData.length > 0) {
      const years = [...new Set(dengueData.map(d => d.year))].sort((a, b) => a - b);
      console.log('Dengue years available:', years);
      return { min: years[0], max: years[years.length - 1] };
    } else if (disease === 'awd' && awdData.length > 0) {
      const years = [...new Set(awdData.map(d => new Date(d.date).getFullYear()))].sort((a, b) => a - b);
      console.log('AWD years available:', years);
      console.log('AWD sample dates:', awdData.slice(0, 5).map(d => d.date));
      return { min: years[0], max: years[years.length - 1] };
    } else if (disease === 'malaria' && malariaData.length > 0) {
      const years = [...new Set(malariaData.map(d => new Date(d.date).getFullYear()))].sort((a, b) => a - b);
      console.log('Malaria years available:', years);
      return { min: years[0], max: years[years.length - 1] };
    }
    return { min: 2019, max: 2024 };
  }, [disease, dengueData, awdData, malariaData]);

  // Update year range when disease changes (keep default 2024-2025 on initial load)
  useEffect(() => {
    // Only reset to default 2024-2025 when disease changes, not on initial data load
    setYearRange([2024, 2025]);
  }, [disease]);

  // Fetch data on mount with smart caching
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Try to get cached data
        const cachedDengue = localStorage.getItem('drilldown_dengue_cache');
        const cachedAWD = localStorage.getItem('drilldown_awd_cache');
        const cachedMalaria = localStorage.getItem('drilldown_malaria_cache');
        const cacheTimestamp = localStorage.getItem('drilldown_cache_timestamp');
        const now = Date.now();
        const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours

        let dengue = null;
        let awd = null;
        let malaria = null;

        // Use cache if it's less than 24 hours old
        if (cachedDengue && cachedAWD && cacheTimestamp && (now - parseInt(cacheTimestamp)) < cacheMaxAge) {
          console.log('Using cached data');
          try {
            dengue = JSON.parse(cachedDengue);
            awd = JSON.parse(cachedAWD);
            malaria = []; // Malaria disabled for now
          } catch (parseError) {
            console.warn('Failed to parse cached data, fetching fresh data');
            // Clear corrupted cache
            localStorage.removeItem('drilldown_dengue_cache');
            localStorage.removeItem('drilldown_awd_cache');
            localStorage.removeItem('drilldown_malaria_cache');
            localStorage.removeItem('drilldown_cache_timestamp');
          }
        }

        // Fetch fresh data if cache is not available
        if (!dengue || !awd) {
          console.log('Fetching fresh data from APIs');
          [dengue, awd] = await Promise.all([
            fetchDengueData(),
            fetchAWDData(),
          ]);
          // Malaria is disabled for now
          malaria = [];

          // Try to cache the data with size check
          try {
            if (dengue) {
              const dengueString = JSON.stringify(dengue);
              const dengueSizeKB = new Blob([dengueString]).size / 1024;
              console.log(`Dengue data size: ${dengueSizeKB.toFixed(2)} KB`);

              // Only cache if less than 2MB to avoid quota issues
              if (dengueSizeKB < 2048) {
                localStorage.setItem('drilldown_dengue_cache', dengueString);
              } else {
                console.warn('Dengue data too large to cache, skipping');
              }
            }

            if (awd) {
              const awdString = JSON.stringify(awd);
              const awdSizeKB = new Blob([awdString]).size / 1024;
              console.log(`AWD data size: ${awdSizeKB.toFixed(2)} KB`);

              // Only cache if less than 2MB to avoid quota issues
              if (awdSizeKB < 2048) {
                localStorage.setItem('drilldown_awd_cache', awdString);
              } else {
                console.warn('AWD data too large to cache, skipping');
              }
            }

            if (malaria) {
              const malariaString = JSON.stringify(malaria);
              const malariaSizeKB = new Blob([malariaString]).size / 1024;
              console.log(`Malaria data size: ${malariaSizeKB.toFixed(2)} KB`);

              // Only cache if less than 2MB to avoid quota issues
              if (malariaSizeKB < 2048) {
                localStorage.setItem('drilldown_malaria_cache', malariaString);
              } else {
                console.warn('Malaria data too large to cache, skipping');
              }
            }

            localStorage.setItem('drilldown_cache_timestamp', now.toString());
          } catch (cacheError) {
            // Quota exceeded or other storage error - just log and continue
            console.warn('Failed to cache data (quota exceeded), continuing without cache:', cacheError);
            // Clear any partial cache
            try {
              localStorage.removeItem('drilldown_dengue_cache');
              localStorage.removeItem('drilldown_awd_cache');
              localStorage.removeItem('drilldown_malaria_cache');
              localStorage.removeItem('drilldown_cache_timestamp');
            } catch (clearError) {
              // Ignore errors when clearing
            }
          }
        }

        console.log('Dengue data loaded:', dengue?.length || 0, 'records');
        console.log('AWD data loaded:', awd?.length || 0, 'records');

        if (dengue && dengue.length > 0) {
          console.log('Sample dengue record:', dengue[0]);
          setDengueData(dengue);
        } else {
          console.error('No dengue data received');
          setError('Failed to load dengue data. Please check your network connection.');
        }

        if (awd && awd.length > 0) {
          console.log('Sample AWD record:', awd[0]);
          setAWDData(awd);
        } else {
          console.error('No AWD data received');
          if (!dengue || dengue.length === 0) {
            setError('Failed to load data from APIs. This may be due to CORS or network issues.');
          }
        }

        // Malaria is disabled, set empty array
        setMalariaData([]);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to fetch data from APIs. Please check console for details.');
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Filter data by selected district and year range
  const filteredData = useMemo(() => {
    console.log('Filtering data with year range:', yearRange);
    if (disease === 'dengue') {
      let data = dengueData.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]);
      if (selectedDistrict !== 'all') {
        data = data.filter(d => d.district.toLowerCase() === selectedDistrict.toLowerCase());
      }
      console.log('Filtered dengue data:', data.length, 'records');
      return data;
    } else if (disease === 'awd') {
      let data = awdData.filter(d => {
        const year = new Date(d.date).getFullYear();
        return year >= yearRange[0] && year <= yearRange[1];
      });
      if (selectedDistrict !== 'all') {
        data = data.filter(d => d.district.toLowerCase() === selectedDistrict.toLowerCase());
      }
      console.log('Filtered AWD data:', data.length, 'records');
      console.log('Sample filtered AWD dates:', data.slice(0, 5).map(d => ({ date: d.date, year: new Date(d.date).getFullYear() })));
      return data;
    } else {
      let data = malariaData.filter(d => {
        const year = new Date(d.date).getFullYear();
        return year >= yearRange[0] && year <= yearRange[1];
      });
      if (selectedDistrict !== 'all') {
        data = data.filter(d => d.district.toLowerCase() === selectedDistrict.toLowerCase());
      }
      console.log('Filtered Malaria data:', data.length, 'records');
      return data;
    }
  }, [disease, selectedDistrict, yearRange, dengueData, awdData, malariaData]);

  // Calculate statistics with insights
  const statistics = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalCases: 0,
        avgTemp: '0',
        minTemp: 0,
        maxTemp: 0,
        avgHumidity: '0',
        avgRainfall: '0',
        minRainfall: 0,
        maxRainfall: 0,
        peakCasesPeriod: '',
        lowCasesPeriod: '',
        peakRainfallWeek: '',
        lowRainfallWeek: '',
        peakTempWeek: '',
        lowTempWeek: '',
      };
    }

    if (disease === 'dengue') {
      const data = filteredData as DengueData[];
      const totalCases = data.reduce((sum, item) => sum + item.weekly_hospitalised_cases, 0);
      const avgTemp = data.reduce((sum, item) => sum + item.avg_temperature, 0) / data.length;
      const avgHumidity = data.reduce((sum, item) => sum + item.avg_humidity, 0) / data.length;
      const avgRainfall = data.reduce((sum, item) => sum + item.total_rainfall, 0) / data.length;

      const rainfalls = data.map(d => d.total_rainfall);
      const temperatures = data.map(d => d.avg_temperature);
      const minRainfall = Math.min(...rainfalls);
      const maxRainfall = Math.max(...rainfalls);
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);

      // Find peak rainfall week
      const maxRainfallItem = data.find(d => d.total_rainfall === maxRainfall);
      const minRainfallItem = data.find(d => d.total_rainfall === minRainfall);
      const peakRainfallWeek = maxRainfallItem ? `${maxRainfallItem.year} Week ${maxRainfallItem.epi_week}` : '';
      const lowRainfallWeek = minRainfallItem ? `${minRainfallItem.year} Week ${minRainfallItem.epi_week}` : '';

      // Find peak temperature week
      const maxTempItem = data.find(d => d.avg_temperature === maxTemp);
      const minTempItem = data.find(d => d.avg_temperature === minTemp);
      const peakTempWeek = maxTempItem ? `${maxTempItem.year} Week ${maxTempItem.epi_week}` : '';
      const lowTempWeek = minTempItem ? `${minTempItem.year} Week ${minTempItem.epi_week}` : '';

      // Find peak cases period (by year)
      const casesByYear: { [key: number]: number } = {};
      data.forEach(item => {
        casesByYear[item.year] = (casesByYear[item.year] || 0) + item.weekly_hospitalised_cases;
      });
      const years = Object.keys(casesByYear).map(Number);
      const maxCasesYear = years.reduce((a, b) => casesByYear[a] > casesByYear[b] ? a : b, years[0]);
      const minCasesYear = years.reduce((a, b) => casesByYear[a] < casesByYear[b] ? a : b, years[0]);

      return {
        totalCases,
        avgTemp: avgTemp.toFixed(1),
        minTemp: minTemp.toFixed(1),
        maxTemp: maxTemp.toFixed(1),
        avgHumidity: avgHumidity.toFixed(1),
        avgRainfall: avgRainfall.toFixed(1),
        minRainfall: minRainfall.toFixed(1),
        maxRainfall: maxRainfall.toFixed(1),
        peakCasesPeriod: `${maxCasesYear} (${casesByYear[maxCasesYear].toLocaleString()})`,
        lowCasesPeriod: `${minCasesYear} (${casesByYear[minCasesYear].toLocaleString()})`,
        peakRainfallWeek,
        lowRainfallWeek,
        peakTempWeek,
        lowTempWeek,
      };
    } else if (disease === 'awd') {
      const data = filteredData as AWDData[];
      const totalCases = data.reduce((sum, item) => sum + item.daily_cases, 0);
      const avgTemp = data.reduce((sum, item) => sum + item.temperature, 0) / data.length;
      const avgHumidity = data.reduce((sum, item) => sum + item.humidity, 0) / data.length;
      const avgRainfall = data.reduce((sum, item) => sum + item.rainfall, 0) / data.length;

      const rainfalls = data.map(d => d.rainfall);
      const temperatures = data.map(d => d.temperature);
      const minRainfall = Math.min(...rainfalls);
      const maxRainfall = Math.max(...rainfalls);
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);

      // Find peak rainfall date
      const maxRainfallItem = data.find(d => d.rainfall === maxRainfall);
      const minRainfallItem = data.find(d => d.rainfall === minRainfall);
      const peakRainfallWeek = maxRainfallItem ? new Date(maxRainfallItem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      const lowRainfallWeek = minRainfallItem ? new Date(minRainfallItem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

      // Find peak temperature date
      const maxTempItem = data.find(d => d.temperature === maxTemp);
      const minTempItem = data.find(d => d.temperature === minTemp);
      const peakTempWeek = maxTempItem ? new Date(maxTempItem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      const lowTempWeek = minTempItem ? new Date(minTempItem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

      // Find peak cases period (by month)
      const casesByMonth: { [key: string]: number } = {};
      data.forEach(item => {
        const monthKey = new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        casesByMonth[monthKey] = (casesByMonth[monthKey] || 0) + item.daily_cases;
      });
      const months = Object.keys(casesByMonth);
      const maxCasesMonth = months.reduce((a, b) => casesByMonth[a] > casesByMonth[b] ? a : b, months[0]);
      const minCasesMonth = months.reduce((a, b) => casesByMonth[a] < casesByMonth[b] ? a : b, months[0]);

      return {
        totalCases,
        avgTemp: avgTemp.toFixed(1),
        minTemp: minTemp.toFixed(1),
        maxTemp: maxTemp.toFixed(1),
        avgHumidity: avgHumidity.toFixed(1),
        avgRainfall: avgRainfall.toFixed(1),
        minRainfall: minRainfall.toFixed(1),
        maxRainfall: maxRainfall.toFixed(1),
        peakCasesPeriod: `${maxCasesMonth} (${casesByMonth[maxCasesMonth].toLocaleString()})`,
        lowCasesPeriod: `${minCasesMonth} (${casesByMonth[minCasesMonth].toLocaleString()})`,
        peakRainfallWeek,
        lowRainfallWeek,
        peakTempWeek,
        lowTempWeek,
      };
    } else {
      const data = filteredData as MalariaData[];
      const totalCases = data.reduce((sum, item) => sum + item.weekly_cases, 0);
      const avgTemp = data.reduce((sum, item) => sum + item.temperature, 0) / data.length;
      const avgHumidity = data.reduce((sum, item) => sum + item.humidity, 0) / data.length;
      const avgRainfall = data.reduce((sum, item) => sum + item.rainfall, 0) / data.length;

      const rainfalls = data.map(d => d.rainfall);
      const temperatures = data.map(d => d.temperature);
      const minRainfall = Math.min(...rainfalls);
      const maxRainfall = Math.max(...rainfalls);
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);

      // Find peak rainfall date
      const maxRainfallItem = data.find(d => d.rainfall === maxRainfall);
      const minRainfallItem = data.find(d => d.rainfall === minRainfall);
      const peakRainfallWeek = maxRainfallItem ? new Date(maxRainfallItem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      const lowRainfallWeek = minRainfallItem ? new Date(minRainfallItem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

      // Find peak temperature date
      const maxTempItem = data.find(d => d.temperature === maxTemp);
      const minTempItem = data.find(d => d.temperature === minTemp);
      const peakTempWeek = maxTempItem ? new Date(maxTempItem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      const lowTempWeek = minTempItem ? new Date(minTempItem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

      // Find peak cases period (by month)
      const casesByMonth: { [key: string]: number } = {};
      data.forEach(item => {
        const monthKey = new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        casesByMonth[monthKey] = (casesByMonth[monthKey] || 0) + item.weekly_cases;
      });
      const months = Object.keys(casesByMonth);
      const maxCasesMonth = months.reduce((a, b) => casesByMonth[a] > casesByMonth[b] ? a : b, months[0]);
      const minCasesMonth = months.reduce((a, b) => casesByMonth[a] < casesByMonth[b] ? a : b, months[0]);

      return {
        totalCases,
        avgTemp: avgTemp.toFixed(1),
        minTemp: minTemp.toFixed(1),
        maxTemp: maxTemp.toFixed(1),
        avgHumidity: avgHumidity.toFixed(1),
        avgRainfall: avgRainfall.toFixed(1),
        minRainfall: minRainfall.toFixed(1),
        maxRainfall: maxRainfall.toFixed(1),
        peakCasesPeriod: `${maxCasesMonth} (${casesByMonth[maxCasesMonth].toLocaleString()})`,
        lowCasesPeriod: `${minCasesMonth} (${casesByMonth[minCasesMonth].toLocaleString()})`,
        peakRainfallWeek,
        lowRainfallWeek,
        peakTempWeek,
        lowTempWeek,
      };
    }
  }, [disease, filteredData]);

  // Prepare time series data for weather vs cases
  const timeSeriesData = useMemo(() => {
    if (disease === 'dengue') {
      const data = filteredData as DengueData[];

      // Aggregate data by year and week (sum cases, average weather variables)
      const aggregatedMap = new Map<string, {
        year: number,
        epi_week: number,
        cases: number,
        temperature: number[],
        humidity: number[],
        rainfall: number[]
      }>();

      data.forEach(item => {
        const key = `${item.year}-W${item.epi_week}`;
        if (!aggregatedMap.has(key)) {
          aggregatedMap.set(key, {
            year: item.year,
            epi_week: item.epi_week,
            cases: 0,
            temperature: [],
            humidity: [],
            rainfall: [],
          });
        }
        const agg = aggregatedMap.get(key)!;
        agg.cases += item.weekly_hospitalised_cases;
        agg.temperature.push(item.avg_temperature);
        agg.humidity.push(item.avg_humidity);
        agg.rainfall.push(item.total_rainfall);
      });

      // Convert to array and sort
      const aggregatedData = Array.from(aggregatedMap.values())
        .map(item => ({
          year: item.year,
          epi_week: item.epi_week,
          cases: item.cases,
          temperature: item.temperature.reduce((a, b) => a + b, 0) / item.temperature.length,
          humidity: item.humidity.reduce((a, b) => a + b, 0) / item.humidity.length,
          rainfall: item.rainfall.reduce((a, b) => a + b, 0) / item.rainfall.length,
        }))
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.epi_week - b.epi_week;
        });

      // Sample data evenly to show the full date range
      const sampleSize = 100;
      let sampledData = aggregatedData;
      if (aggregatedData.length > sampleSize) {
        const step = aggregatedData.length / sampleSize;
        sampledData = Array.from({ length: sampleSize }, (_, i) => aggregatedData[Math.floor(i * step)]);
      }

      return sampledData.map(item => ({
        date: `${item.year}-W${item.epi_week}`,
        cases: item.cases,
        temperature: item.temperature,
        humidity: item.humidity,
        rainfall: item.rainfall,
      }));
    } else if (disease === 'awd') {
      const data = filteredData as AWDData[];

      // Aggregate data by date (sum cases, average weather variables)
      const aggregatedMap = new Map<string, {
        date: string,
        cases: number,
        temperature: number[],
        humidity: number[],
        rainfall: number[]
      }>();

      data.forEach(item => {
        const dateKey = item.date.split('T')[0]; // Get date part only
        if (!aggregatedMap.has(dateKey)) {
          aggregatedMap.set(dateKey, {
            date: dateKey,
            cases: 0,
            temperature: [],
            humidity: [],
            rainfall: [],
          });
        }
        const agg = aggregatedMap.get(dateKey)!;
        agg.cases += item.daily_cases;
        agg.temperature.push(item.temperature);
        agg.humidity.push(item.humidity);
        agg.rainfall.push(item.rainfall);
      });

      // Convert to array and sort
      const aggregatedData = Array.from(aggregatedMap.values())
        .map(item => ({
          date: item.date,
          cases: item.cases,
          temperature: item.temperature.reduce((a, b) => a + b, 0) / item.temperature.length,
          humidity: item.humidity.reduce((a, b) => a + b, 0) / item.humidity.length,
          rainfall: item.rainfall.reduce((a, b) => a + b, 0) / item.rainfall.length,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Sample data evenly to show the full date range
      const sampleSize = 100;
      let sampledData = aggregatedData;
      if (aggregatedData.length > sampleSize) {
        const step = aggregatedData.length / sampleSize;
        sampledData = Array.from({ length: sampleSize }, (_, i) => aggregatedData[Math.floor(i * step)]);
      }

      return sampledData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        cases: item.cases,
        temperature: item.temperature,
        humidity: item.humidity,
        rainfall: item.rainfall,
      }));
    } else {
      const data = filteredData as MalariaData[];

      // Aggregate data by date (sum cases, average weather variables)
      const aggregatedMap = new Map<string, {
        date: string,
        cases: number,
        temperature: number[],
        humidity: number[],
        rainfall: number[]
      }>();

      data.forEach(item => {
        const dateKey = item.date.split('T')[0]; // Get date part only
        if (!aggregatedMap.has(dateKey)) {
          aggregatedMap.set(dateKey, {
            date: dateKey,
            cases: 0,
            temperature: [],
            humidity: [],
            rainfall: [],
          });
        }
        const agg = aggregatedMap.get(dateKey)!;
        agg.cases += item.weekly_cases;
        agg.temperature.push(item.temperature);
        agg.humidity.push(item.humidity);
        agg.rainfall.push(item.rainfall);
      });

      // Convert to array and sort
      const aggregatedData = Array.from(aggregatedMap.values())
        .map(item => ({
          date: item.date,
          cases: item.cases,
          temperature: item.temperature.reduce((a, b) => a + b, 0) / item.temperature.length,
          humidity: item.humidity.reduce((a, b) => a + b, 0) / item.humidity.length,
          rainfall: item.rainfall.reduce((a, b) => a + b, 0) / item.rainfall.length,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Sample data evenly to show the full date range
      const sampleSize = 100;
      let sampledData = aggregatedData;
      if (aggregatedData.length > sampleSize) {
        const step = aggregatedData.length / sampleSize;
        sampledData = Array.from({ length: sampleSize }, (_, i) => aggregatedData[Math.floor(i * step)]);
      }

      return sampledData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        cases: item.cases,
        temperature: item.temperature,
        humidity: item.humidity,
        rainfall: item.rainfall,
      }));
    }
  }, [disease, filteredData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Fetching data from APIs...</p>
      </div>
    );
  }

  if (error || (dengueData.length === 0 && awdData.length === 0)) {
    return (
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="text-red-500 text-center">
              <h3 className="text-lg font-semibold mb-2">Unable to Load Data</h3>
              <p className="text-sm mb-4">{error || 'No data available from the APIs.'}</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>APIs: Dengue and AWD data endpoints</p>
                <p className="mt-4">This may be due to:</p>
                <ul className="list-disc list-inside text-left max-w-md mx-auto">
                  <li>CORS restrictions (the API may not allow browser requests)</li>
                  <li>Network connectivity issues</li>
                  <li>API server is down or unreachable</li>
                </ul>
                <p className="mt-4 font-medium">Check browser console for detailed error messages.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-md border-2 border-gray-200">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Disease</Label>
              <Select value={disease} onValueChange={(val: 'dengue' | 'awd' | 'malaria') => setDisease(val)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dengue">Dengue</SelectItem>
                  <SelectItem value="awd">Acute Watery Diarrhoea</SelectItem>
                  <SelectItem value="malaria" disabled>Malaria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">District</Label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Districts</SelectItem>
                  {districts.map(district => (
                    <SelectItem key={district.id} value={district.name}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Year Range: {yearRange[0]} - {yearRange[1]}
              </Label>
              <div className="flex gap-2 items-center">
                <Slider
                  value={yearRange}
                  onValueChange={(val) => setYearRange(val as [number, number])}
                  min={availableYears.min}
                  max={availableYears.max}
                  step={1}
                  minStepsBetweenThumbs={0}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">
                Available: {availableYears.min} - {availableYears.max}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-md bg-red-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Cases</CardTitle>
            <Activity className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{statistics.totalCases.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">
              {disease === 'dengue' ? 'Weekly hospitalized' : disease === 'awd' ? 'Daily cases' : 'Weekly cases'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Peak: {statistics.peakCasesPeriod}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Temperature</CardTitle>
            <Thermometer className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{statistics.avgTemp}°C</div>
            <p className="text-xs text-gray-600 mt-1">
              Range: {statistics.minTemp}°C - {statistics.maxTemp}°C
            </p>
            <p className="text-xs text-gray-500 mt-1">Peak: {statistics.peakTempWeek}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Humidity</CardTitle>
            <Droplets className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{statistics.avgHumidity}%</div>
            <p className="text-xs text-gray-600 mt-1">Average humidity</p>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-cyan-50 border-cyan-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Rainfall</CardTitle>
            <CloudRain className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-700">{statistics.avgRainfall} mm</div>
            <p className="text-xs text-gray-600 mt-1">
              Range: {statistics.minRainfall} - {statistics.maxRainfall} mm
            </p>
            <p className="text-xs text-gray-500 mt-1">Peak: {statistics.peakRainfallWeek}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weather Variables vs Cases */}
      <div className="grid gap-6 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-headline">Disease Cases vs Weather Variables</CardTitle>
                  <CardDescription>Correlation between cases and environmental factors</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={weatherVariable === 'temperature' ? 'default' : 'outline'}
                    className={weatherVariable === 'temperature' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    onClick={() => setWeatherVariable('temperature')}
                  >
                    <Thermometer className="h-4 w-4 mr-1" />
                    Temp
                  </Button>
                  <Button
                    size="sm"
                    variant={weatherVariable === 'humidity' ? 'default' : 'outline'}
                    className={weatherVariable === 'humidity' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    onClick={() => setWeatherVariable('humidity')}
                  >
                    <Droplets className="h-4 w-4 mr-1" />
                    Humidity
                  </Button>
                  <Button
                    size="sm"
                    variant={weatherVariable === 'rainfall' ? 'default' : 'outline'}
                    className={weatherVariable === 'rainfall' ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                    onClick={() => setWeatherVariable('rainfall')}
                  >
                    <CloudRain className="h-4 w-4 mr-1" />
                    Rainfall
                  </Button>
                  <Button
                    size="sm"
                    variant={weatherVariable === 'all' ? 'default' : 'outline'}
                    className={weatherVariable === 'all' ? 'bg-black hover:bg-gray-800' : ''}
                    onClick={() => setWeatherVariable('all')}
                  >
                    All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={'preserveStartEnd'}
                    tick={{ fontSize: 9 }}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cases"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Cases"
                    dot={false}
                  />
                  {(weatherVariable === 'temperature' || weatherVariable === 'all') && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#f97316"
                      strokeWidth={2}
                      name="Temperature (°C)"
                      dot={false}
                    />
                  )}
                  {(weatherVariable === 'humidity' || weatherVariable === 'all') && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="humidity"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Humidity (%)"
                      dot={false}
                    />
                  )}
                  {(weatherVariable === 'rainfall' || weatherVariable === 'all') && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="rainfall"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      name="Rainfall (mm)"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <WeatherDiseaseTriggers data={weatherDiseaseTriggers} />
        </div>
      </div>
    </div>
  );
}
