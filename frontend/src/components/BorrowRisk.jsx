import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBorrowRisk, postBorrowDecline } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, CheckCircle, ShoppingBag, Sparkles } from 'lucide-react';
import FlowProgress from './FlowProgress';
import { BORROWER_FLOW_STEPS } from '../lib/flowSteps';

export default function BorrowRisk() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const [risk, setRisk] = useState(null);
  const [decline, setDecline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [declineLoading, setDeclineLoading] = useState(false);
  const [error, setError] = useState('');
  const [grokLoading, setGrokLoading] = useState(false);
  const [isGrokScore, setIsGrokScore] = useState(false);
  const handleProgressSelect = useCallback(
    (nextStep) => {
      if (!nextStep?.path) return;
      navigate(nextStep.path);
    },
    [navigate],
  );

  useEffect(() => {
    if (!user?.userId) return;
    let mounted = true;
    async function loadRisk() {
      setLoading(true);
       setGrokLoading(true);
       setIsGrokScore(false);
      try {
        const resp = await fetchBorrowRisk(user.userId);
        if (mounted) {
          setRisk(resp);
          setIsGrokScore(resp.analysis_source === 'grok');
          setGrokLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.detail || 'Could not fetch risk.');
          setGrokLoading(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRisk();
    return () => {
      mounted = false;
    };
  }, [user?.userId]);

  const fetchDeclineFeedback = useCallback(async () => {
    if (!user?.userId) return;
    setDeclineLoading(true);
    try {
      const resp = await postBorrowDecline(user.userId);
      setDecline(resp.feedback);
    } catch (err) {
      setDecline(err.response?.data?.detail || 'Could not fetch feedback.');
    } finally {
      setDeclineLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (risk?.recommendation === 'no') {
      fetchDeclineFeedback();
    } else {
      setDecline(null);
    }
  }, [risk?.recommendation, fetchDeclineFeedback]);

  const improvementTips = useMemo(() => {
    if (!risk) return [];
    const tips = [];
    const avgSpend = risk.knot_summary?.avg_monthly_spend;
    if (typeof avgSpend === 'number' && avgSpend > 0) {
      const trimAmount = Math.max(25, Math.round(avgSpend * 0.25));
      tips.push({
        title: 'Resize the request',
        detail: `Try trimming about $${trimAmount} from this request so it lines up with your monthly spend.`,
      });
    } else {
      tips.push({
        title: 'Resize the request',
        detail: 'Aim for a request that is about 20% lower to match your current cash flow.',
      });
    }
    const essentialsRatio = risk.knot_summary?.essentials_ratio;
    if (typeof essentialsRatio === 'number' && essentialsRatio < 0.65) {
      tips.push({
        title: 'Boost essentials share',
        detail: 'Shift a few recent purchases toward groceries, utilities, or medical costs to show more essential spending.',
      });
    }
    const merchantsLinked = risk.knot_summary?.merchants?.length ?? 0;
    if (merchantsLinked < 2) {
      tips.push({
        title: 'Link another shop or bill',
        detail: 'Adding one more Knot merchant gives Finance Bot clearer insight into your day-to-day habits.',
      });
    }
    tips.push({
      title: 'Build a small safety buffer',
      detail: 'Setting aside even $25 each week in savings signals lenders you can absorb surprises.',
    });
    return tips;
  }, [risk]);

  async function handleDecline() {
    await fetchDeclineFeedback();
  }

  if (!user) return null;

  if (loading) {
    const LoaderIcon = grokLoading ? Sparkles : TrendingUp;
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-4 h-16 w-16"
          >
            <LoaderIcon className="h-full w-full text-primary" />
          </motion.div>
          <p className="text-lg text-muted-foreground">
            {grokLoading ? 'Calling xAI Grok to weigh your spending patterns…' : 'Analyzing your profile...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-12">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <p className="text-lg">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!risk) return null;

  const showOptions = risk.recommendation === 'yes' || risk.recommendation === 'maybe';
  const getScoreColor = (score) => {
    if (score >= 70) return 'from-emerald-400 to-teal-500';
    if (score >= 45) return 'from-amber-400 to-orange-500';
    return 'from-rose-400 to-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <FlowProgress
        steps={BORROWER_FLOW_STEPS}
        activeStep="risk"
        label="Borrower journey"
        onStepSelect={handleProgressSelect}
      />
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrendingUp className="h-8 w-8 text-primary" />
            </motion.div>
            Risk Check
          </CardTitle>
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-base text-muted-foreground leading-relaxed">{risk.explanation}</p>
            {risk.analysis_source === 'grok' && (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" />
                xAI Grok analysis
                {risk.analysis_model && <span className="text-[10px] text-primary/80">{risk.analysis_model}</span>}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Score Display */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="relative"
          >
            <div className="text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {risk.analysis_source === 'grok' ? 'Grok clarity score' : 'Clarity score'}
              </p>
              <motion.div
                className={`mx-auto inline-flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${getScoreColor(risk.score)} text-white shadow-2xl`}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-5xl font-black">{risk.score}</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Gauge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative">
              <div className="gauge-track">
                <div className="h-full flex-1 bg-gradient-to-r from-rose-300 to-rose-400" />
                <div className="h-full flex-1 bg-gradient-to-r from-amber-300 to-amber-400" />
                <div className="h-full flex-1 bg-gradient-to-r from-emerald-300 to-emerald-400" />
              </div>
              <div
                className="gauge-needle"
                style={{ left: `calc(${risk.score}% - 3px)` }}
              />
            </div>
          </motion.div>

          {isGrokScore && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary"
            >
              <Sparkles className="h-4 w-4" />
              Score pulled fresh from Grok using your recent transactions.
            </motion.div>
          )}

          {risk.knot_summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"
            >
              <div className="flex items-start gap-3">
                <ShoppingBag className="h-8 w-8 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Linked spending</p>
                  <p className="text-base text-foreground">
                    {risk.knot_summary.merchants.join(', ')} · last sync{' '}
                    {risk.knot_summary.last_sync
                      ? new Date(risk.knot_summary.last_sync).toLocaleString()
                      : 'moments ago'}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3 text-center">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Avg monthly spend</p>
                  <p className="text-xl font-bold text-primary">${risk.knot_summary.avg_monthly_spend}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Orders analyzed</p>
                  <p className="text-xl font-bold text-primary">{risk.knot_summary.orders}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Essentials share</p>
                  <p className="text-xl font-bold text-primary">
                    {risk.knot_summary.essentials_ratio != null
                      ? `${Math.round(risk.knot_summary.essentials_ratio * 100)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Recommendation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            <div className={`rounded-2xl p-6 ${showOptions ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300'}`}>
              <div className="flex items-start gap-3">
                {showOptions ? (
                  <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                )}
                <div>
                  <p className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Recommendation
                  </p>
                  <p className="text-2xl font-black text-primary">
                    {risk.recommendation.toUpperCase()}
                  </p>
                  {risk.analysis_source === 'grok' && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        <Sparkles className="h-3 w-3" />
                        Grok’s rationale
                      </span>{' '}
                      {risk.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {showOptions ? (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg" 
                  className="w-full" 
                  onClick={() => navigate('/borrow/options')}
                >
                  Explore Options
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-rose-100 bg-rose-50/70 p-6 shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                    Why it was paused
                  </p>
                  <p className="mt-2 text-base text-rose-900">{risk.explanation}</p>
                  {decline && (
                    <p className="mt-3 rounded-2xl border border-dashed border-rose-200 bg-white/80 p-3 text-sm text-rose-800">
                      {decline}
                    </p>
                  )}
                  <div className="mt-4 space-y-3">
                    {improvementTips.map((tip) => (
                      <div
                        key={tip.title}
                        className="rounded-2xl border border-white/40 bg-white/85 p-3 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-rose-900">{tip.title}</p>
                        <p className="text-sm text-muted-foreground">{tip.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleDecline} 
                  disabled={declineLoading}
                >
                  {declineLoading ? 'Refreshing guidance…' : 'Refresh guidance'}
                </Button>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/dashboard/borrower')}
                  >
                    View Dashboard
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/')}
                  >
                    Try Later
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
