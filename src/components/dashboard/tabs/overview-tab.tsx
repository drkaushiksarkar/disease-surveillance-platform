"use client";

import { useSearchParams } from 'next/navigation';
import MetricsPanels from '../metrics-panels';
import CombinedPredictionChart from '../CombinedPredictionChart';
import FilterBar from '../filter-bar';
import DistrictAccelerationCards from '../district-acceleration-cards';
import { getLiveWeatherData } from '@/lib/weather';
import type { WeatherData, DiseaseData, AccelerationAlertData } from '@/lib/types';
import React from 'react';
import { locations, getMonthlyCases } from '@/lib/data';

async function fetchAndFormatWeatherData(): Promise<{data: WeatherData[], error: boolean}> {
  try {
    const liveWeather = await getLiveWeatherData('Dhaka', 'BD');
    if (!liveWeather) return { data: [], error: true };

    const { temp, temp_min, temp_max, humidity, rainfall, weather_description } = liveWeather;

    // Determine temperature category based on thresholds
    let tempCategory = '';
    let tempIcon = '';
    if (temp < 15) {
      tempCategory = 'Cold';
      tempIcon = 'snowflake';
    } else if (temp >= 15 && temp < 20) {
      tempCategory = 'Cool';
      tempIcon = 'wind';
    } else if (temp >= 20 && temp < 25) {
      tempCategory = 'Pleasant';
      tempIcon = 'cloud-sun';
    } else if (temp >= 25 && temp < 30) {
      tempCategory = 'Warm';
      tempIcon = 'sun';
    } else if (temp >= 30 && temp < 35) {
      tempCategory = 'Hot';
      tempIcon = 'flame';
    } else {
      tempCategory = 'Very Hot';
      tempIcon = 'flame';
    }

    const weatherData: WeatherData[] = [
      {
        label: 'Temperature',
        value: `${temp.toFixed(1)}°C`,
        subtitle: tempCategory,
        tempIcon: tempIcon,
        is_extreme: temp > 35
      },
      {
        label: 'Humidity',
        value: `${humidity}%`,
        subtitle: weather_description ? weather_description.charAt(0).toUpperCase() + weather_description.slice(1) : '',
        is_extreme: humidity > 90
      },
      {
        label: 'Rainfall',
        value: `${rainfall}mm`,
        subtitle: rainfall > 0 ? 'Last hour' : 'No rain',
        is_extreme: rainfall > 20
      },
    ];
    return { data: weatherData, error: false };
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    return { data: [], error: true };
  }
}

export default function OverviewTab() {
  const searchParams = useSearchParams();
  const districtId = searchParams.get('district'); // Don't default, allow null
  const disease = searchParams.get('disease') || 'dengue';
  const dateFrom = searchParams.get('from') || '';
  const dateTo = searchParams.get('to') || '';

  const [weatherData, setWeatherData] = React.useState<WeatherData[]>([]);
  const [diseaseData, setDiseaseData] = React.useState<DiseaseData[]>([]);
  const [weatherError, setWeatherError] = React.useState(false);
  const [accelerationAlerts, setAccelerationAlerts] = React.useState<AccelerationAlertData[]>([]);

  React.useEffect(() => {
    async function loadWeather() {
      const { data, error } = await fetchAndFormatWeatherData();
      setWeatherData(data);
      setWeatherError(error);
    }
    loadWeather();

    async function loadMonthlyCases() {
      const fallback = () => {
        const base = getMonthlyCases();
        return base.map(item => ({
          ...item,
          periodLabel: item.periodLabel ?? 'Historical estimate',
          comparisonLabel: item.comparisonLabel ?? 'Previous period',
          comparisonValue: item.comparisonValue ?? '—',
        }));
      };

      try {
        const response = await fetch('/api/monthly-cases', { cache: 'no-cache' });

        if (response.ok) {
          const data = (await response.json()) as { cards?: DiseaseData[] };
          if (data.cards && data.cards.length > 0) {
            setDiseaseData(data.cards);
            return;
          }
          console.warn('Monthly cases API returned no cards, using fallback data');
          setDiseaseData(fallback());
        } else {
          console.error('Failed to fetch monthly cases');
          setDiseaseData(fallback());
        }
      } catch (error) {
        console.error('Error loading monthly cases:', error);
        setDiseaseData(fallback());
      }
    }

    loadMonthlyCases();

    // Fetch acceleration alerts data from API
    async function loadAccelerationAlerts() {
      try {
        const response = await fetch(`/api/acceleration-alerts?disease=${disease}&limit=6`);
        if (response.ok) {
          const alerts = await response.json();
          setAccelerationAlerts(alerts);
        } else {
          console.error('Failed to fetch acceleration alerts');
          setAccelerationAlerts([]);
        }
      } catch (error) {
        console.error('Error loading acceleration alerts:', error);
        setAccelerationAlerts([]);
      }
    }
    loadAccelerationAlerts();
  }, [districtId, dateFrom, dateTo, disease]);

  // Get district name from district ID (with fallback to '47' for Dhaka)
  const districtName = React.useMemo(() => {
    const id = districtId || '47'; // Default to Dhaka district if none selected
    const selectedDistrict = locations.find(l => l.id === id && l.level === 'district');
    return selectedDistrict ? selectedDistrict.name : undefined;
  }, [districtId]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <FilterBar />

      {/* 6 Metric Cards */}
      <MetricsPanels weatherData={weatherData} diseaseData={diseaseData} weatherError={weatherError} />

      {/* Prediction Chart and District Acceleration Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CombinedPredictionChart
          disease={disease}
          district={districtName}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
        <DistrictAccelerationCards data={accelerationAlerts} />
      </div>
    </div>
  );
}
