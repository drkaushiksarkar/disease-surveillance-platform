"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import NationalCasesBaselineChart from '@/components/dashboard/NationalCasesBaselineChart';
import { diseases } from '@/lib/data';
import { BaselineMethod, WeeklyNationalData, AlertStats } from '@/lib/types';
import { Info, Loader2, Mail, Send } from 'lucide-react';
import InfoButton from '@/components/dashboard/InfoButton';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Removed hardcoded TARGET_YEAR - now dynamically fetched from API

export default function AlertTab() {
  const [selectedDisease, setSelectedDisease] = useState<string>('dengue');
  const [baselineMethod, setBaselineMethod] = useState<BaselineMethod>('p95');
  const [weeklyData, setWeeklyData] = useState<WeeklyNationalData[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to determine if disease uses monthly or weekly data
  const isMonthlyDisease = (disease: string) => {
    return disease === 'malaria_pf' || disease === 'malaria_pv';
  };

  const getPeriodLabel = (disease: string) => {
    return isMonthlyDisease(disease) ? 'Month' : 'Week';
  };
  const [receiverEmail, setReceiverEmail] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [alertStats, setAlertStats] = useState<AlertStats>({
    currentWeekCases: 0,
    previousWeekCases: 0,
    percentChange: 0,
    districtsOnAlert: 0,
    totalDistricts: 64,
    nationalRiskLevel: 'Low',
    latestDataDate: '',
  });

  // Fetch alert stats from new API
  useEffect(() => {
    async function loadAlertStats() {
      try {
        const response = await fetch(`/api/alerts/stats?disease=${selectedDisease}&method=${baselineMethod}`);
        if (!response.ok) {
          throw new Error('Failed to fetch alert stats');
        }
        const stats = await response.json();
        setAlertStats({
          currentWeekCases: stats.currentPeriodCases,
          previousWeekCases: stats.previousPeriodCases,
          percentChange: stats.percentChange,
          districtsOnAlert: stats.districtsOnAlert,
          totalDistricts: stats.totalDistricts,
          nationalRiskLevel: stats.nationalRiskLevel,
          latestDataDate: stats.latestDataDate,
        });
      } catch (error) {
        console.error('Error loading alert stats:', error);
      }
    }
    loadAlertStats();
  }, [selectedDisease, baselineMethod]);

  // Fetch national data from new API
  useEffect(() => {
    async function loadWeeklyData() {
      setLoading(true);
      try {
        const response = await fetch(`/api/alerts/national-data?disease=${selectedDisease}&method=${baselineMethod}`);
        if (!response.ok) {
          throw new Error('Failed to fetch national data');
        }
        const data = await response.json();
        console.log('Loaded national data:', data.length, 'data points');

        // Transform to match WeeklyNationalData format
        const transformedData = data.map((item: any) => {
          let week = 1;
          let year = 2024;

          // Parse period based on format
          if (item.period.includes('-W')) {
            // Weekly format: "2025-W22"
            const parts = item.period.split('-W');
            year = parseInt(parts[0]);
            week = parseInt(parts[1]);
          } else if (item.period.includes('T')) {
            // Date format for diarrhoea: "2025-05-31T..."
            const date = new Date(item.period);
            year = date.getFullYear();
            const startOfYear = new Date(year, 0, 1);
            const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
            week = Math.ceil((dayOfYear + 1) / 7);
          } else {
            // Monthly format for malaria: "2024-12"
            const parts = item.period.split('-');
            year = parseInt(parts[0]);
            week = parseInt(parts[1]); // month number
          }

          return {
            week,
            year,
            date: item.period,
            cases: item.cases,
            baseline: item.baseline,
          };
        });

        setWeeklyData(transformedData);
      } catch (error) {
        console.error('Error loading national data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadWeeklyData();
  }, [selectedDisease, baselineMethod]);

  // Generate email body based on districts on alert
  useEffect(() => {
    async function generateEmailBody() {
      try {
        const response = await fetch(`/api/alerts/districts?disease=${selectedDisease}&method=${baselineMethod}`);
        if (!response.ok) {
          throw new Error('Failed to fetch district data');
        }
        const districtData = await response.json();
        const districtsOnAlert = districtData.filter((d: any) => d.isOnAlert);

    if (districtsOnAlert.length === 0) {
      setEmailBody(`Subject: Disease Alert - No Districts Currently at Risk

Dear Health Officials,

This is an automated alert from the Bangladesh Early Warning Alert and Response System (EWARS).

Current Status: No districts are currently exceeding baseline thresholds for ${diseases.find(d => d.id === selectedDisease)?.name || selectedDisease}.

Analysis Parameters:
- Disease: ${diseases.find(d => d.id === selectedDisease)?.name || selectedDisease}
- Baseline Method: ${baselineMethod.toUpperCase()}
- Latest Data Date: ${alertStats.latestDataDate || 'N/A'}

All districts are within expected disease occurrence levels. Continue routine surveillance.

---
This is an automated message from Bangladesh EWARS
For questions, contact: bangladesh-ewars@email.com`);
    } else {
      const districtList = districtsOnAlert
        .map(d => `  • ${d.district}: ${d.cases.toFixed(0)} cases (Baseline: ${d.baseline.toFixed(0)})`)
        .join('\n');

      setEmailBody(`Subject: URGENT - Disease Alert for ${districtsOnAlert.length} District${districtsOnAlert.length > 1 ? 's' : ''}

Dear Health Officials,

This is an automated alert from the Bangladesh Early Warning Alert and Response System (EWARS).

⚠️ ALERT: ${districtsOnAlert.length} district${districtsOnAlert.length > 1 ? 's have' : ' has'} exceeded baseline thresholds for ${diseases.find(d => d.id === selectedDisease)?.name || selectedDisease}.

Districts on Alert:
${districtList}

Analysis Parameters:
- Disease: ${diseases.find(d => d.id === selectedDisease)?.name || selectedDisease}
- Baseline Method: ${baselineMethod.toUpperCase()}
- Latest Data Date: ${alertStats.latestDataDate || 'N/A'}
- Total Districts Monitored: ${districtData.length}

Recommended Actions:
1. Verify case counts with local health facilities
2. Assess resource needs in affected districts
3. Initiate enhanced surveillance protocols
4. Consider public health interventions as needed

Please take immediate action to investigate and respond to this alert.

---
This is an automated message from Bangladesh EWARS
For questions, contact: bangladesh-ewars@email.com`);
      }
      } catch (error) {
        console.error('Error generating email body:', error);
      }
    }
    generateEmailBody();
  }, [selectedDisease, baselineMethod, alertStats.latestDataDate]);

  const baselineMethodInfo = {
    p95: '95th percentile of historical cases for the week',
    mean2sd: 'Mean + 2 standard deviations from historical data',
    endemic: 'Median + 2 × IQR (robust statistical measure)',
  };

  const handleSendEmail = async () => {
    if (!receiverEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    setIsSending(true);

    try {
      // Extract subject from email body (first line after "Subject: ")
      const subjectMatch = emailBody.match(/Subject: (.+)/);
      const subject = subjectMatch ? subjectMatch[1] : 'Disease Alert from EWARS Bangladesh';

      // Remove the subject line from the body
      const bodyWithoutSubject = emailBody.replace(/Subject: .+\n\n?/, '');

      const response = await fetch('/api/send-alert-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: receiverEmail,
          subject: subject,
          body: bodyWithoutSubject,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      alert('Alert email sent successfully!');
      setIsDialogOpen(false);
      setReceiverEmail(''); // Clear the email field
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Calculate district distribution for pie chart
  const [districtDistribution, setDistrictDistribution] = useState<{ name: string; value: number; }[]>([]);

  useEffect(() => {
    async function loadDistrictDistribution() {
      try {
        const response = await fetch(`/api/alerts/districts?disease=${selectedDisease}&method=${baselineMethod}`);
        if (!response.ok) {
          throw new Error('Failed to fetch district data');
        }
        const districtData = await response.json();
        const distribution = districtData
          .sort((a: any, b: any) => b.cases - a.cases)
          .slice(0, 10)
          .map((d: any) => ({ name: d.district, value: Math.round(d.cases) }));
        setDistrictDistribution(distribution);
      } catch (error) {
        console.error('Error loading district distribution:', error);
      }
    }
    loadDistrictDistribution();
  }, [selectedDisease, baselineMethod]);

  const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF', '#4CAF50', '#E91E63'];

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Alert Dashboard</h2>
            <p className="text-muted-foreground">
              Monitor disease alerts based on baseline thresholds
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-sm font-medium text-blue-900">
              Latest Data: {alertStats.latestDataDate || 'Loading...'}
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Email Alert
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          {/* Disease Selector */}
          <div className="flex items-center gap-2">
            <Select value={selectedDisease} onValueChange={setSelectedDisease}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {diseases.map((disease) => (
                  <SelectItem key={disease.id} value={disease.id}>
                    {disease.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Baseline Method Selector */}
          <div className="flex items-center gap-2">
            <Select
              value={baselineMethod}
              onValueChange={(value) => setBaselineMethod(value as BaselineMethod)}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="p95">95th Percentile (p95)</SelectItem>
                <SelectItem value="mean2sd">Mean + 2 standard deviations (mean2sd)</SelectItem>
                <SelectItem value="endemic">Endemic channel (median + 2*IQR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Baseline Method Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3 px-4">
          <div className="flex gap-3 items-center">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              <span className="font-medium">Baseline: {baselineMethod.toUpperCase()}</span> — {baselineMethodInfo[baselineMethod]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert Statistics Cards with District Alert Dial */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Current Period Cases Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Current {getPeriodLabel(selectedDisease)} Cases</CardDescription>
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold mt-1">
              {alertStats.currentWeekCases.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            <div className="flex items-center gap-2">
              {alertStats.percentChange > 0 ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                  <span className="text-xs font-medium text-red-500">
                    +{Math.abs(alertStats.percentChange).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                    <polyline points="17 18 23 18 23 12"></polyline>
                  </svg>
                  <span className="text-xs font-medium text-green-500">
                    {Math.abs(alertStats.percentChange).toFixed(1)}%
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground">vs last {getPeriodLabel(selectedDisease).toLowerCase()}</span>
            </div>
            <div className="pt-1.5 border-t">
              <p className="text-xs text-muted-foreground">Previous: <span className="font-medium text-foreground">{alertStats.previousWeekCases.toLocaleString()}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Districts on Alert Text Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Districts on Alert</CardDescription>
              <div className="p-1.5 bg-orange-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                  <path d="M12 2 2 7l10 5 10-5-10-5z"></path>
                  <path d="m2 17 10 5 10-5"></path>
                  <path d="m2 12 10 5 10-5"></path>
                </svg>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold mt-1">
              {alertStats.districtsOnAlert}<span className="text-xl text-muted-foreground"> / {alertStats.totalDistricts}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${alertStats.districtsOnAlert > 0 ? 'bg-orange-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-xs font-medium">
                {((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100).toFixed(1)}% exceeding baseline
              </span>
            </div>
            <div className="pt-1.5 border-t">
              <p className="text-xs text-muted-foreground">
                {alertStats.districtsOnAlert > 0 ? (
                  <span className="text-orange-600 font-medium">⚠ Intervention required</span>
                ) : (
                  <span className="text-green-600 font-medium">✓ Normal range</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* National Risk Level Card */}
        <Card
          className={`border-2 ${
            alertStats.nationalRiskLevel === 'High' ? 'border-red-500 bg-red-50' :
            alertStats.nationalRiskLevel === 'Medium' ? 'border-yellow-500 bg-yellow-50' :
            'border-green-500 bg-green-50'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>National Risk Level</CardDescription>
              <div className={`p-1.5 rounded-lg ${
                alertStats.nationalRiskLevel === 'High' ? 'bg-red-200' :
                alertStats.nationalRiskLevel === 'Medium' ? 'bg-yellow-200' :
                'bg-green-200'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={
                  alertStats.nationalRiskLevel === 'High' ? 'text-red-700' :
                  alertStats.nationalRiskLevel === 'Medium' ? 'text-yellow-700' :
                  'text-green-700'
                }>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold flex items-center gap-2 mt-1">
              <span
                className={
                  alertStats.nationalRiskLevel === 'High' ? 'text-red-600' :
                  alertStats.nationalRiskLevel === 'Medium' ? 'text-yellow-600' :
                  'text-green-600'
                }
              >
                {alertStats.nationalRiskLevel}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            <div className="flex items-center gap-2">
              {alertStats.nationalRiskLevel === 'High' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              )}
              <p className="text-xs text-muted-foreground">
                {((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100) > 50
                  ? '>50% districts at risk'
                  : ((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100) > 25
                  ? '25-50% districts at risk'
                  : '<25% districts at risk'}
              </p>
            </div>
            <div className="pt-1.5 border-t">
              <p className="text-xs font-medium">
                {alertStats.nationalRiskLevel === 'High' ? 'Immediate action needed' :
                 alertStats.nationalRiskLevel === 'Medium' ? 'Monitor closely' :
                 'Continue surveillance'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* District Alert Dial Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Alert Distribution</CardDescription>
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                  <line x1="12" y1="20" x2="12" y2="10"></line>
                  <line x1="18" y1="20" x2="18" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="16"></line>
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0 pb-3">
            <div className="w-full">
              <div className="h-[90px] flex items-center justify-center">
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <svg viewBox="0 0 200 100" className="w-full h-full">
                    {/* Background arc */}
                    <path
                      d="M 20 88 A 80 80 0 0 1 180 88"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="14"
                    />
                    {/* Colored arc based on percentage */}
                    <path
                      d="M 20 88 A 80 80 0 0 1 180 88"
                      fill="none"
                      stroke={
                        ((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100) > 50 ? '#ef4444' :
                        ((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100) > 25 ? '#eab308' :
                        '#22c55e'
                      }
                      strokeWidth="14"
                      strokeDasharray={`${(((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100) / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                    {/* Center text */}
                    <text
                      x="100"
                      y="75"
                      textAnchor="middle"
                      fontSize="28"
                      fontWeight="bold"
                      fill={
                        ((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100) > 50 ? '#ef4444' :
                        ((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100) > 25 ? '#eab308' :
                        '#22c55e'
                      }
                    >
                      {((alertStats.districtsOnAlert / alertStats.totalDistricts) * 100).toFixed(1)}%
                    </text>
                  </svg>
                </div>
              </div>
              <div className="pt-1.5 border-t mt-1.5">
                <p className="text-xs text-center text-muted-foreground">
                  <span className="font-medium text-foreground">{alertStats.districtsOnAlert}</span> of <span className="font-medium text-foreground">{alertStats.totalDistricts}</span> on alert
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* National Cases vs Baseline Chart and District Pie Chart */}
      <div className="grid gap-6 lg:grid-cols-[60%_1fr]">
        {/* National Cases vs Baseline Chart - 60% */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ) : (
          <NationalCasesBaselineChart
            data={weeklyData}
            year={parseInt(alertStats.latestDataDate?.split('-')[0] || '2024')}
            disease={selectedDisease}
          />
        )}

        {/* Cases by District Pie Chart - 40% */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="space-y-1.5">
              <CardTitle className="font-headline">Cases by District</CardTitle>
              <CardDescription>Top 10 districts by case count</CardDescription>
            </div>
            <InfoButton
              title="Cases by District"
              content={
                <>
                  <p className="mb-3">
                    Shows the top 10 districts with the highest case counts.
                  </p>
                  <p>
                    Each slice represents a district's share of total cases, helping identify hotspots.
                  </p>
                </>
              }
            />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={districtDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    // Only show label if slice is larger than 5% to prevent overlapping
                    if (percent < 0.05) return '';
                    return `${name} ${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {districtDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => Math.round(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Email Alert Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Send Alert Notification
            </DialogTitle>
            <DialogDescription>
              Email health officials about districts currently at risk
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Sender Email (Greyed Out) */}
              <div className="space-y-2">
                <Label htmlFor="sender-email" className="text-sm font-medium">
                  From
                </Label>
                <Input
                  id="sender-email"
                  type="email"
                  value="ewars.bangladesh@gmail.com"
                  disabled
                  className="bg-gray-50"
                />
              </div>

              {/* Receiver Email */}
              <div className="space-y-2">
                <Label htmlFor="receiver-email" className="text-sm font-medium">
                  To <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="receiver-email"
                  type="email"
                  placeholder="recipient@health.gov.bd"
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <Label htmlFor="email-body" className="text-sm font-medium">
                Message
              </Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="min-h-[280px] font-mono text-xs leading-relaxed"
                placeholder="Email body will be generated automatically..."
              />
            </div>

            {/* Send Button */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {alertStats.districtsOnAlert > 0 ? (
                  <span className="text-orange-600 font-medium">
                    ⚠️ {alertStats.districtsOnAlert} district{alertStats.districtsOnAlert > 1 ? 's' : ''} currently at risk
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">
                    ✓ All districts within normal levels
                  </span>
                )}
              </p>
              <Button
                onClick={handleSendEmail}
                disabled={!receiverEmail || isSending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Alert
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
