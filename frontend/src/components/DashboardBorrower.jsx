import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { fetchBorrowerDashboard } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Sparkles, ShoppingBag } from 'lucide-react';
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

  const handleScrollToBot = () => {
    if (typeof document === 'undefined') return;
    const panel = document.getElementById('finance-bot-panel');
    panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-3xl border border-border/60 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Repayment glide path</CardTitle>
                  <CardDescription>Projected weekly installments and balance decline</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {paymentSchedule.length ? (
                    <ChartContainer config={paymentChartConfig} className="h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={paymentSchedule} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fill-payment-borrower" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-payment)" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="var(--color-payment)" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="fill-balance-borrower" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 8" vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis width={0} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                          <Area
                            type="monotone"
                            dataKey="payment"
                            stroke="var(--color-payment)"
                            fill="url(#fill-payment-borrower)"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="var(--color-balance)"
                            fill="url(#fill-balance-borrower)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading repayment trend…</p>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-3xl border border-border/60 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Savings momentum</CardTitle>
                  <CardDescription>Compounding advantage compared to a bank loan</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {savingsGrowth.length ? (
                    <ChartContainer config={savingsChartConfig} className="h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={savingsGrowth} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fill-savings-borrower" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-savings)" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="var(--color-savings)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 8" vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis width={0} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                          <Area
                            type="monotone"
                            dataKey="savings"
                            stroke="var(--color-savings)"
                            fill="url(#fill-savings-borrower)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Calculating savings impact…</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
              <Card className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sky-900">
                    <ShoppingBag className="h-5 w-5 text-sky-500" />
                    Shopping habits snapshot
                  </CardTitle>
                  <CardDescription>
                    Symbio watches the merchants you link to estimate what can safely flow into savings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600">
                  <div className="flex items-start gap-3 rounded-2xl border border-dashed border-sky-100/80 bg-white/70 p-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-sky-500" />
                    <p>
                      Finance Bot blends your grocery, utility, and treat spending into a step-by-step savings ladder,
                      then adjusts payments if habits change.
                    </p>
                  </div>
                  <ul className="space-y-2">
                    <li className="rounded-2xl bg-white/80 px-3 py-2">
                      Track how much of last month&apos;s shopping was essential vs. nice-to-have.
                    </li>
                    <li className="rounded-2xl bg-white/80 px-3 py-2">
                      Get nudges on trimming requests or padding savings before reapplying.
                    </li>
                    <li className="rounded-2xl bg-white/80 px-3 py-2">
                      Export a weekly “cash cushion” plan based on your linked merchants.
                    </li>
                  </ul>
                  <Button onClick={handleScrollToBot} className="w-full">
                    Ask Finance Bot for a plan
                  </Button>
                </CardContent>
              </Card>
              <div id="finance-bot-panel" className="h-full">
                <FinanceBotPanel role="borrower" />
              </div>
            </div>
          </>
        ) : (
          <Card className="rounded-3xl border-2 border-dashed border-border bg-white/80 p-6 text-lg font-semibold">
            Loading your progress sparkle…
          </Card>
        )}
      </div>
    </div>
  );
}
