"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { WeeklyNationalData } from '@/lib/types';
import InfoButton from './InfoButton';

interface NationalCasesBaselineChartProps {
  data: WeeklyNationalData[];
  year: number;
  disease?: string;
}

export default function NationalCasesBaselineChart({ data, year, disease = 'dengue' }: NationalCasesBaselineChartProps) {
  // Determine if this is monthly data
  const isMonthly = disease === 'malaria_pf' || disease === 'malaria_pv';
  const periodLabel = isMonthly ? 'monthly' : 'weekly';

  // Determine the year range from the data
  const years = [...new Set(data.map(item => item.year))].sort();
  const yearRange = years.length > 1 ? `${years[0]}-${years[years.length - 1]}` : years[0]?.toString() || year.toString();
  const isMultiYear = years.length > 1;

  // Month names for monthly data
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = data.map(item => {
    let label = '';
    if (isMonthly) {
      // For monthly data, show month abbreviation
      const monthIndex = item.week - 1; // week contains month number (1-12)
      label = isMultiYear ? `${monthNames[monthIndex]}'${item.year.toString().slice(-2)}` : monthNames[monthIndex];
    } else {
      // For weekly data, show week number
      label = isMultiYear ? `W${item.week}'${item.year.toString().slice(-2)}` : `W${item.week}`;
    }

    return {
      weekLabel: label,
      week: item.week,
      year: item.year,
      nationalCases: item.cases,
      threshold: Math.round(item.baseline),
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">National {periodLabel} cases vs baseline ({yearRange})</CardTitle>
        <InfoButton
          title="National Cases vs Baseline"
          content={
            <>
              <p className="mb-3">
                Compares actual {periodLabel} cases to the historical baseline threshold.
              </p>
              <p>
                When the blue line exceeds the dashed baseline, it signals an outbreak requiring immediate attention.
              </p>
            </>
          }
        />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 13 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 13 }}
              stroke="#6b7280"
              label={{ value: 'Cases', angle: -90, position: 'insideLeft', style: { fontSize: 13 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'nationalCases') return [value.toLocaleString(), 'National cases'];
                if (name === 'threshold') return [value.toLocaleString(), 'Threshold (baseline)'];
                return [value, name];
              }}
              labelFormatter={(label) => label}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
              iconType="line"
              formatter={(value) => {
                if (value === 'nationalCases') return 'National cases';
                if (value === 'threshold') return 'Threshold (baseline)';
                return value;
              }}
            />
            <Line
              type="monotone"
              dataKey="threshold"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="threshold"
            />
            <Line
              type="monotone"
              dataKey="nationalCases"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              name="nationalCases"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
