import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBorrowerDashboard } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { FinanceBotPanel } from './FinanceBot';

export default function DashboardBorrower() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.userId) return;
    async function load() {
      try {
        // GET /dashboard/borrower -> {next_payment,total_owed_year,savings_vs_bank_year}
        const resp = await fetchBorrowerDashboard(user.userId);
        setData(resp);
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not load dashboard.');
      }
    }
    load();
  }, [user?.userId]);

  if (!user) return null;

  const paymentSchedule = useMemo(() => {
    if (!data) return [];
    const nextAmount = Number(data.next_payment?.amount) || 0;
    const totalOwed = Number(data.total_owed_year) || 0;
    let remainingBalance = totalOwed;
    return Array.from({ length: 8 }, (_, index) => {
      const installment = Math.max(nextAmount - index * Math.max(nextAmount * 0.12, 10), nextAmount * 0.4);
      remainingBalance = Math.max(remainingBalance - installment, 0);
      return {
        label: `Week ${index + 1}`,
        payment: Math.round(installment),
        balance: Math.round(remainingBalance),
      };
    });
  }, [data]);

  const savingsGrowth = useMemo(() => {
    if (!data) return [];
    const annualSavings = Number(data.savings_vs_bank_year) || 0;
    const monthlySavings = annualSavings / 12;
    return Array.from({ length: 6 }, (_, index) => ({
      label: `Month ${index + 1}`,
      savings: Math.round(monthlySavings * (index + 1)),
    }));
  }, [data]);

  const paymentChartConfig = {
    payment: { label: 'Projected payment', color: 'hsl(217.2 91.2% 59.8%)' },
    balance: { label: 'Remaining balance', color: 'hsl(142.1 70.6% 45.3%)' },
  };

  const savingsChartConfig = {
    savings: { label: 'Savings vs bank', color: 'hsl(25.5 95% 53.5%)' },
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Borrower dashboard</h1>
          <p className="text-muted-foreground">
            Track repayments, savings impact, and stay connected with lenders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Dashboard home
          </Button>
          <Button onClick={() => navigate('/dashboard/lender')}>Switch to lending</Button>
        </div>
      </div>

      <Tabs value="borrower" className="w-full">
        <TabsList className="w-full justify-start gap-2 rounded-2xl bg-muted p-1">
          <TabsTrigger value="borrower" className="flex-1">
            Borrowing
          </TabsTrigger>
          <TabsTrigger value="lender" className="flex-1" onClick={() => navigate('/dashboard/lender')}>
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
              Total owed: ${data.total_owed_year} over the next year
            </Card>
            <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
              Saved vs bank: ${data.savings_vs_bank_year}
            </Card>
          </>
        ) : (
          <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
            Loading your progress sparkle…
          </Card>
        )}
        <FinanceBotPanel role="borrower" />
      </div>
    </div>
  );
}
