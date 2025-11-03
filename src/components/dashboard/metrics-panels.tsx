import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Droplets, CloudRain, AlertTriangle, Activity, Bug, Droplet, TrendingUp, TrendingDown, ArrowDown, ArrowUp, Snowflake, Wind, CloudSun, Sun, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeatherData, DiseaseData } from '@/lib/types';

const tempCategoryIcons = {
  'snowflake': Snowflake,
  'wind': Wind,
  'cloud-sun': CloudSun,
  'sun': Sun,
  'flame': Flame,
};

const tempCategoryColors = {
  'Cold': 'text-blue-600',
  'Cool': 'text-cyan-600',
  'Pleasant': 'text-green-600',
  'Warm': 'text-yellow-600',
  'Hot': 'text-orange-600',
  'Very Hot': 'text-red-600',
};

const weatherIconMap = {
  Temperature: Thermometer,
  Humidity: Droplets,
  Rainfall: CloudRain,
};

const diseaseIconMap = {
  'Malaria PF': Bug,
  'Malaria PV': Bug,
  Malaria: Bug,
  Dengue: Activity,
  Diarrhoea: Droplet,
};

const weatherColors = {
  Temperature: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
  },
  Humidity: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
  },
  Rainfall: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
  },
};

const diseaseColors = {
  'Malaria PF': {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
  },
  'Malaria PV': {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
  },
  Malaria: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
  },
  Dengue: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
  },
  Diarrhoea: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
  },
};

interface MetricsPanelsProps {
  weatherData: WeatherData[];
  diseaseData: DiseaseData[];
  weatherError: boolean;
}

export default function MetricsPanels({ weatherData, diseaseData, weatherError }: MetricsPanelsProps) {
  if (weatherError || !weatherData || weatherData.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className="flex flex-col items-center justify-center p-4 sm:col-span-2 md:col-span-3 lg:col-span-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm font-medium text-destructive">Could not load metrics data.</p>
          <p className="text-xs text-muted-foreground">Please check API key or network.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {weatherData.map((item) => {
        const Icon = weatherIconMap[item.label];
        const colors = weatherColors[item.label];
        return (
          <Card key={item.label} className={cn('flex flex-col border-0 shadow-md', colors.bg)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.label}
              </CardTitle>
              <Icon className={cn('h-5 w-5', colors.icon)} />
            </CardHeader>
            <CardContent>
              <div
                className={cn('text-2xl font-bold text-black', item.is_extreme && 'text-red-600')}
              >
                {item.value}
              </div>
              {item.label === 'Temperature' && item.tempIcon && item.subtitle ? (
                <div className="flex items-center gap-1.5 mt-2">
                  {(() => {
                    const TempIcon = tempCategoryIcons[item.tempIcon as keyof typeof tempCategoryIcons];
                    const colorClass = tempCategoryColors[item.subtitle as keyof typeof tempCategoryColors];
                    return TempIcon ? (
                      <>
                        <TempIcon className={cn('h-4 w-4', colorClass)} />
                        <span className={cn('text-sm font-medium', colorClass)}>
                          {item.subtitle}
                        </span>
                      </>
                    ) : null;
                  })()}
                </div>
              ) : item.subtitle ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.subtitle}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
      {diseaseData.map((item) => {
        // Handle malaria with percentage label (e.g., "Malaria (33% PV)")
        const diseaseKey = item.label.startsWith('Malaria') ? 'Malaria' : item.label;
        const Icon = diseaseIconMap[diseaseKey] || diseaseIconMap[item.label];
        const colors = diseaseColors[diseaseKey] || diseaseColors[item.label];
        const hasIncreased = item.trend && item.trend > 0;
        const hasDecreased = item.trend && item.trend < 0;

        return (
          <Card key={item.label} className={cn('flex flex-col border-0 shadow-md', colors?.bg || 'bg-gray-50')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.label}
              </CardTitle>
              {Icon && <Icon className={cn('h-5 w-5', colors?.icon || 'text-gray-600')} />}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div
                  className={cn('text-2xl font-bold text-black', item.is_high && 'text-red-600')}
                >
                  {item.value}
                </div>
                {item.trend !== undefined && (
                  <div className={cn('flex items-center gap-1 text-sm font-medium',
                    hasIncreased ? 'text-red-600' : hasDecreased ? 'text-green-600' : 'text-gray-600'
                  )}>
                    {hasIncreased ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : hasDecreased ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    <span>{Math.abs(item.trend)}%</span>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {item.periodLabel ? (
                  <p>{item.periodLabel}</p>
                ) : (
                  <p>Latest period</p>
                )}
                {item.comparisonLabel ? (
                  <p>
                    {item.comparisonLabel}
                    {item.comparisonValue ? `: ${item.comparisonValue}` : ''}
                  </p>
                ) : (
                  <p>Forecast vs actual</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
