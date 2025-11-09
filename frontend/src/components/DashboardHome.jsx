import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HandHeart, Sparkles, Users, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export default function DashboardHome() {
  const navigate = useNavigate();

  const navigationCards = [
    {
      title: 'Borrower overview',
      description: 'Review your repayment plan, savings impact, and community updates.',
      icon: Wallet,
      action: () => navigate('/dashboard/borrower'),
      actionLabel: 'Open borrower dashboard',
    },
    {
      title: 'Lender portfolio',
      description: 'Track repayments, forecast revenue, and reinvest with confidence.',
      icon: HandHeart,
      action: () => navigate('/dashboard/lender'),
      actionLabel: 'Open lender dashboard',
    },
    {
      title: 'Community feed',
      description: 'See real-time stories from neighbors and share your own updates.',
      icon: Users,
      action: () => navigate('/feed'),
      actionLabel: 'Visit the feed',
    },
    {
      title: 'Start something new',
      description: 'Begin a fresh application, invite support, or adjust your goals.',
      icon: Sparkles,
      action: () => navigate('/choose-role'),
      actionLabel: 'Choose a role',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Symbio control center</h1>
          <p className="text-muted-foreground">
            Quickly move between lending and borrowing tools without losing your place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Return home
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {navigationCards.map(({ title, description, icon: Icon, action, actionLabel }) => (
          <Card key={title} className="flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="rounded-2xl bg-muted p-3">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button onClick={action} className="w-full">
                {actionLabel}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
