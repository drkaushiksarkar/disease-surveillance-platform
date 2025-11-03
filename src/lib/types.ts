export type Location = {
  id: string;
  name: string;
  level: 'country' | 'division' | 'district' | 'upazila' | 'union';
  parent_id?: string;
};

export type Disease = {
  id: string;
  name: string;
};

export type TimeSeriesDataPoint = {
  date: string;
  district?: string;
  actual?: number | null;
  predicted: number;
  uncertainty?: [number, number]; // [low, high]
  is_outbreak?: boolean;
};

export type RiskData = {
  id: string;
  location: string;
  risk_score: number;
  change: number;
  risk_category: 'Low' | 'Medium' | 'High';
};

export type FeatureImportance = {
  feature: string;
  importance: number;
};

export type WeatherData = {
  label: 'Temperature' | 'Humidity' | 'Rainfall';
  value: string;
  is_extreme?: boolean;
  subtitle?: string;
  temp_min?: number;
  temp_max?: number;
  tempIcon?: string;
};

export type DiseaseData = {
  label: 'Malaria' | 'Dengue' | 'Diarrhoea';
  value: string;
  is_high?: boolean;
  trend?: number;
  periodLabel?: string;
  comparisonLabel?: string;
  comparisonValue?: string;
};

export type LiveWeatherData = {
  temp: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  rainfall: number;
  weather_description?: string;
};

export type WeatherDiseaseTrigger = {
  id: number;
  variable: string;
  icon: 'Thermometer' | 'Droplets' | 'CloudRain';
  diseases: string[];
  impact: string;
};

export type BaselineMethod = 'p95' | 'mean2sd' | 'endemic';

export type DistrictWeekData = {
  district: string;
  week: number;
  year: number;
  cases: number;
  baseline: number;
  isOnAlert: boolean;
};

export type AlertStats = {
  currentWeekCases: number;
  previousWeekCases: number;
  percentChange: number;
  districtsOnAlert: number;
  totalDistricts: number;
  nationalRiskLevel: 'Low' | 'Medium' | 'High';
  latestDataDate?: string;
};

export type WeeklyNationalData = {
  week: number;
  year: number;
  date: string;
  cases: number;
  baseline: number;
};

export type AccelerationAlertData = {
  district: string;
  year: number;
  epi_week: number;
  last_week_cases: number;
  this_week_actual: number;
  this_week_predicted: number;
  next_week_forecast: number;
  growth_rate_wow: number;
  growth_flag: string;
};
