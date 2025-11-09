import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBorrowRisk, postBorrowDecline } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, CheckCircle, ShoppingBag, Sparkles } from 'lucide-react';

export default function BorrowRisk() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const [risk, setRisk] = useState(null);
  const [decline, setDecline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [declineLoading, setDeclineLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.userId) return;
    let mounted = true;
    async function loadRisk() {
      setLoading(true);
      try {
        const resp = await fetchBorrowRisk(user.userId);
        if (mounted) {
          setRisk(resp);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.detail || 'Could not fetch risk.');
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

  async function handleDecline() {
    setDeclineLoading(true);
    try {
      const resp = await postBorrowDecline(user.userId);
      setDecline(resp.feedback);
    } catch (err) {
      setDecline(err.response?.data?.detail || 'Could not fetch feedback.');
    } finally {
      setDeclineLoading(false);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-4 h-16 w-16"
          >
            <TrendingUp className="h-full w-full text-primary" />
          </motion.div>
          <p className="text-lg text-muted-foreground">Analyzing your profile...</p>
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
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrendingUp className="h-8 w-8 text-primary" />
            </motion.div>
            Water Check
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
              <motion.div 
                className="gauge-needle" 
                style={{ left: `calc(${risk.score}% - 3px)` }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, type: "spring" }}
              />
            </div>
          </motion.div>

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
                    {Math.round((risk.knot_summary.essentials_ratio || 0) * 100)}%
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
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleDecline} 
                  disabled={declineLoading}
                >
                  {declineLoading ? 'Analyzing...' : 'Tell me more'}
                </Button>
                {decline && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 border-cyan-200 bg-white/90 p-6 backdrop-blur-sm"
                  >
                    <p className="mb-4 text-base leading-relaxed">{decline}</p>
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
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
