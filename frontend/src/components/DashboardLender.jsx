import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLenderDashboard } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { FinanceBotPanel } from './FinanceBot';

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
            <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
              Next payment: ${data.next_payment.amount} in {data.next_payment.due_in_weeks}{' '}
              {data.next_payment.due_in_weeks === 1 ? 'week' : 'weeks'}
            </Card>
            <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
              Expected revenue: ${data.expected_revenue_year} over the next year
            </Card>
          </>
        ) : (
          <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
            Gathering your lending sunshine…
          </Card>
        )}
        <FinanceBotPanel role="lender" />
      </div>
    </div>
  );
}
