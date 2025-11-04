"use client";

import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ErrorBar,
  Scatter,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import InfoButton from './InfoButton';
import { format } from 'date-fns';

interface CombinedPredictionChartProps {
  disease: string;
  district: string | undefined;
  dateFrom?: string;
  dateTo?: string;
}

interface ChartDataPoint {
  date: string;
  cases?: number;
  allCases?: number;
  predicted?: number;
  uncertainity_low?: number;
  uncertainity_high?: number;
  error?: [number, number];
}

export default function CombinedPredictionChart({ disease, district, dateFrom, dateTo }: CombinedPredictionChartProps) {
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchData() {
      // District is required for fetching data
      if (!district) {
        setChartData([]);
        setLoading(false);
        setError('Loading...');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Build query params with date range
        const params = new URLSearchParams({
          disease,
          district: district,
        });

        // Default to last one year if no date range specified
        if (dateFrom) {
          params.set('from', dateFrom);
        }
        if (dateTo) {
          params.set('to', dateTo);
        }

        const response = await fetch(`/api/prediction-chart?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();

        // Combine historical and prediction data
        const combined: ChartDataPoint[] = [];

        // Add historical data - filter out null/undefined cases
        if (data.historical && data.historical.length > 0) {
          data.historical.forEach((point: any) => {
            // Only include points with valid numeric case values
            const cases = parseFloat(point.cases);
            if (!isNaN(cases) && cases !== null && cases !== undefined) {
              combined.push({
                date: point.date,
                cases: cases,
                allCases: cases,
              });
            }
          });
        }

        // Add prediction as the last point - it extends the historical line
        if (data.prediction) {
          const pred = data.prediction;
          const predicted = parseFloat(pred.predicted);
          const uncLow = parseFloat(pred.uncertainity_low);
          const uncHigh = parseFloat(pred.uncertainity_high);

          // Only add prediction if all values are valid numbers
          if (!isNaN(predicted) && !isNaN(uncLow) && !isNaN(uncHigh)) {
            combined.push({
              date: pred.date,
              cases: predicted, // Continue the main line
              allCases: predicted,
              predicted: predicted,
              uncertainity_low: uncLow,
              uncertainity_high: uncHigh,
              error: [
                predicted - uncLow,
                uncHigh - predicted,
              ],
            });
          }
        }

        setChartData(combined);

        // If we have no data, set an appropriate error message
        if (combined.length === 0) {
          setError(`No ${disease} data available for ${district}. This disease may not be tracked in this district.`);
        }
      } catch (err) {
        console.error('Error fetching prediction chart data:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [disease, district, dateFrom, dateTo]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="space-y-1.5">
            <CardTitle className="font-headline">Predicted Cases & Uncertainty</CardTitle>
            <CardDescription>Historical trend with predicted values</CardDescription>
          </div>
          <InfoButton
            title="Predicted Cases & Uncertainty"
            content={
              <>
                <p className="mb-3">
                  Shows historical disease cases with AI-predicted values and confidence intervals.
                </p>
                <p>
                  The error bars on the predicted point show the uncertainty range.
                </p>
              </>
            }
          />
        </CardHeader>
        <CardContent className="flex h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Loading data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="space-y-1.5">
            <CardTitle className="font-headline">Predicted Cases & Uncertainty</CardTitle>
            <CardDescription>Historical trend with predicted values</CardDescription>
          </div>
          <InfoButton
            title="Predicted Cases & Uncertainty"
            content={
              <>
                <p className="mb-3">
                  Shows historical disease cases with AI-predicted values and confidence intervals.
                </p>
                <p>
                  The error bars on the predicted point show the uncertainty range.
                </p>
              </>
            }
          />
        </CardHeader>
        <CardContent className="flex h-[400px] items-center justify-center">
          <p className="text-muted-foreground">
            {error || 'No prediction data available for the selected district.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Format dates for display and add unique IDs
  const formattedData = chartData.map((point, index) => ({
    ...point,
    dateFormatted: point.date ? format(new Date(point.date), 'MMM yyyy') : '',
    id: `${point.date}-${index}`, // Add unique ID for each point
  }));

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1.5">
          <CardTitle className="font-headline">Predicted Cases & Uncertainty</CardTitle>
          <CardDescription>Historical trend with predicted values and uncertainty</CardDescription>
        </div>
        <InfoButton
          title="Predicted Cases & Uncertainty"
          content={
            <>
              <p className="mb-3">
                Shows historical disease case trends with the latest AI-predicted value.
              </p>
              <p>
                The trend line shows historical data with the predicted point highlighted in red at the end.
                Error bars indicate the prediction uncertainty range (low to high).
              </p>
            </>
          }
        />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              label={{ value: 'Cases', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
              labelStyle={{
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value: any, name: string, props: any) => {
                const payload = props.payload;

                // If this point has prediction data, show detailed uncertainty info
                if (payload && payload.predicted) {
                  if (name === 'Cases') {
                    return [
                      <div key="predicted-info" className="space-y-1">
                        <div className="font-semibold">Predicted Cases: {Math.round(payload.predicted)}</div>
                        <div className="text-xs text-muted-foreground">
                          Uncertainty Range: {Math.round(payload.uncertainity_low)} - {Math.round(payload.uncertainity_high)}
                        </div>
                      </div>,
                      ''
                    ];
                  }
                  // Hide the "Predicted" entry in tooltip since we're showing it in Cases
                  if (name === 'Predicted') return [null, ''];
                }

                // For historical data points
                if (name === 'Cases') return [Math.round(value), 'Cases'];
                if (name === 'Predicted') return [Math.round(value), 'Predicted'];
                return [Math.round(value), name];
              }}
            />
            <Legend
              content={(props) => {
                const { payload } = props;
                return (
                  <div className="flex justify-center gap-6 text-sm">
                    {payload && payload.map((entry: any, index: number) => (
                      <span key={`legend-${index}`} style={{ color: entry.color }}>
                        {entry.value}
                      </span>
                    ))}
                    <span style={{ color: 'hsl(var(--destructive))' }}>
                      ● Predicted (Current Week)
                    </span>
                  </div>
                );
              }}
            />

            {/* Main trend line (historical + predicted) */}
            <Line
              type="monotone"
              dataKey="allCases"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, index, payload } = props;
                // Only show dot for the predicted point (last point with predicted field)
                // Validate that cx and cy are valid numbers
                if (payload.predicted && !isNaN(cx) && !isNaN(cy)) {
                  return (
                    <circle
                      key={`dot-${payload.id || index}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="hsl(var(--destructive))"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              }}
              name="Cases"
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Error bars for predicted point */}
            <Scatter
              dataKey="predicted"
              fill="transparent"
              shape={() => null}
              name="Predicted"
              legendType="none"
              isAnimationActive={false}
            >
              <ErrorBar
                dataKey="error"
                width={8}
                strokeWidth={2}
                stroke="hsl(var(--destructive))"
                opacity={0.6}
              />
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
