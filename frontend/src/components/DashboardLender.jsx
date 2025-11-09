import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { fetchLenderDashboard } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

export default function DashboardLender() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.userId) return;
    async function load() {
      try {
        // GET /dashboard/lender -> {next_payment,expected_revenue_year}
        const resp = await fetchLenderDashboard(user.userId);
        setData(resp);
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not load dashboard.');
      }
    }
    load();
  }, [user?.userId]);

  if (!user) return null;

  const revenueForecast = useMemo(() => {
    if (!data) return [];
    const annualRevenue = Number(data.expected_revenue_year) || 0;
    const monthlyRevenue = annualRevenue / 12;
    return Array.from({ length: 6 }, (_, index) => ({
      label: `Month ${index + 1}`,
      revenue: Math.round(monthlyRevenue * (index + 1)),
      reinvest: Math.round((monthlyRevenue * (index + 1)) * 0.35),
    }));
  }, [data]);

  const paymentPipeline = useMemo(() => {
    if (!data) return [];
    const nextAmount = Number(data.next_payment?.amount) || 0;
    return Array.from({ length: 8 }, (_, index) => ({
      label: `Week ${index + 1}`,
      repayments: Math.round(nextAmount * (1 - Math.min(index * 0.08, 0.4))),
    }));
  }, [data]);

  const revenueChartConfig = {
    revenue: { label: 'Projected revenue', color: 'hsl(25.5 95% 53.5%)' },
    reinvest: { label: 'Reinvested', color: 'hsl(217.2 91.2% 59.8%)' },
  };

  const pipelineChartConfig = {
    repayments: { label: 'Expected repayments', color: 'hsl(142.1 70.6% 45.3%)' },
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lender dashboard</h1>
          <p className="text-muted-foreground">
            Monitor repayments, forecast revenue, and support more borrowers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Dashboard home
          </Button>
          <Button onClick={() => navigate('/dashboard/borrower')}>Switch to borrowing</Button>
        </div>
      </div>

      <Tabs value="lender" className="w-full">
        <TabsList className="w-full justify-start gap-2 rounded-2xl bg-muted p-1">
          <TabsTrigger value="borrower" className="flex-1" onClick={() => navigate('/dashboard/borrower')}>
            Borrowing
          </TabsTrigger>
          <TabsTrigger value="lender" className="flex-1">
            Lending
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="text-destructive">{error}</p>}
      <div className="grid gap-4">
        {data ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
                Next payment: ${data.next_payment.amount} in {data.next_payment.due_in_weeks}{' '}
                {data.next_payment.due_in_weeks === 1 ? 'week' : 'weeks'}
              </Card>
              <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
                Expected revenue: ${data.expected_revenue_year} over the next year
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-3xl border border-border/60 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Revenue outlook</CardTitle>
                  <CardDescription>Forecast of monthly income and reinvestment potential</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {revenueForecast.length ? (
                    <ChartContainer config={revenueChartConfig} className="h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueForecast} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fill-revenue-lender" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="fill-reinvest-lender" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-reinvest)" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="var(--color-reinvest)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 8" vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis width={0} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="var(--color-revenue)"
                            fill="url(#fill-revenue-lender)"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Area
                            type="monotone"
                            dataKey="reinvest"
                            stroke="var(--color-reinvest)"
                            fill="url(#fill-reinvest-lender)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Projecting revenue curve…</p>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-3xl border border-border/60 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Repayment pipeline</CardTitle>
                  <CardDescription>Weekly repayments trending across active pools</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {paymentPipeline.length ? (
                    <ChartContainer config={pipelineChartConfig} className="h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={paymentPipeline} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fill-repayments-lender" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-repayments)" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="var(--color-repayments)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 8" vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis width={0} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                          <Area
                            type="monotone"
                            dataKey="repayments"
                            stroke="var(--color-repayments)"
                            fill="url(#fill-repayments-lender)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Mapping repayments pipeline…</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
            Gathering your lending sunshine…
          </Card>
        )}
      </div>
    </div>
  );
}
