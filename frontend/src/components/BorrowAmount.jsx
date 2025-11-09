import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postBorrowAmount, linkKnotAccount, fetchKnotProfile } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { setSessionValue } from '../session';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, ArrowRight, TrendingUp, Info, Link2, ShieldCheck } from 'lucide-react';
import FlowProgress from './FlowProgress';
import { BORROWER_FLOW_STEPS } from '../lib/flowSteps';
import KnotLogo from '../../KnotLogo.png';

const quickAmounts = [250, 500, 1000, 2000];
const merchantOptions = [
  { id: 45, name: 'Walmart', blurb: 'Groceries & essentials' },
  { id: 19, name: 'DoorDash', blurb: 'Food & delivery patterns' },
];

export default function BorrowAmount() {
  const navigate = useNavigate();
  const user = useRequiredUser();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [knotProfile, setKnotProfile] = useState(null);
  const [knotError, setKnotError] = useState('');
  const [linkingMerchant, setLinkingMerchant] = useState(null);
  const [knotLoading, setKnotLoading] = useState(false);
  const handleProgressSelect = useCallback(
    (nextStep) => {
      if (!nextStep?.path) return;
      navigate(nextStep.path);
    },
    [navigate],
  );

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;
    async function loadProfile() {
      setKnotLoading(true);
      try {
        const profile = await fetchKnotProfile(user.userId);
        if (!cancelled) {
          setKnotProfile(profile);
          setKnotError('');
        }
      } catch (err) {
        if (!cancelled) {
          setKnotError(err.response?.data?.detail || 'Could not load linked purchases.');
        }
      } finally {
        if (!cancelled) setKnotLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const hasLinkedMerchants = knotProfile?.merchants?.length > 0;

  async function handleNext(e) {
    e.preventDefault();
    const numeric = Number(amount);
    if (!numeric || numeric <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await postBorrowAmount({ user_id: user.userId, amount: numeric });
      setSessionValue('borrow_amount', numeric);
      navigate('/borrow/risk');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save amount.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLink(merchantId) {
    if (!user?.userId) return;
    setLinkingMerchant(merchantId);
    setKnotError('');
    try {
      await linkKnotAccount({ user_id: user.userId, merchant_id: merchantId });
      const profile = await fetchKnotProfile(user.userId);
      setKnotProfile(profile);
    } catch (err) {
      setKnotError(err.response?.data?.detail || 'Could not link purchase history.');
    } finally {
      setLinkingMerchant(null);
    }
  }

  if (!user) return null;

  const numericAmount = Number(amount) || 0;

  return (
    <motion.form 
      onSubmit={handleNext}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-4xl"
    >
      <FlowProgress
        steps={BORROWER_FLOW_STEPS}
        activeStep="amount"
        label="Borrower journey"
        onStepSelect={handleProgressSelect}
      />
      <Card className="relative overflow-visible">
        {/* Floating decorations */}
        <motion.div
          className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-500/30 blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            x: [0, 20, 0],
          }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -20, 0],
          }}
          transition={{ duration: 7, repeat: Infinity, delay: 1 }}
        />

        <CardHeader className="text-center">
          <motion.div
            animate={{
              y: [0, -10, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-2xl shadow-emerald-500/50"
          >
            <DollarSign className="h-16 w-16 text-white" />
          </motion.div>
          <CardTitle className="text-4xl md:text-5xl mb-4">
            How Much Do You Need?
          </CardTitle>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Request what you need. The community will pool resources to help.
          </p>
        </CardHeader>

        <CardContent className="space-y-8 pb-12">
          {/* Quick amount buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="mb-4 text-lg font-semibold text-foreground">Quick select</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickAmounts.map((quick, idx) => (
                <motion.button
                  key={quick}
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAmount(quick.toString())}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-center backdrop-blur-sm transition-all ${
                    Number(amount) === quick
                      ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-200/50'
                      : 'border-cyan-200/60 bg-white/80 hover:border-cyan-400 hover:shadow-lg'
                  }`}
                >
                  <p className="text-3xl font-black text-primary">${quick.toLocaleString()}</p>
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-100/0 via-teal-100/50 to-cyan-100/0 opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Custom amount input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <p className="text-lg font-semibold text-foreground">Or enter your own amount</p>
            <div className="relative">
              <DollarSign className="absolute left-5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="0" 
                min="0"
                step="100"
                className="pl-16 text-3xl font-bold h-20"
              />
            </div>

            {/* Amount visualization */}
            <AnimatePresence>
              {numericAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 p-6"
                >
                  <div className="flex items-start gap-4">
                    <TrendingUp className="h-8 w-8 text-cyan-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-2xl font-black text-primary mb-2">
                        ${numericAmount.toLocaleString()}
                      </p>
                      <p className="text-base text-muted-foreground">
                        Your request will be reviewed against community capacity and your profile.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Knot opt-in */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-3xl border-2 border-emerald-200/70 bg-emerald-50/70 p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-10 w-10 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">Opt in to smarter risk analysis</p>
                    <p className="text-sm text-muted-foreground">
                      Share purchase history from a partner like Walmart or DoorDash so we can run xAI Grok on real spending before showing your clarity score. We securely connect through the Knot API, so you stay in control while sharing only what&apos;s needed.
                    </p>
                  </div>
                </div>
                <img
                  src={KnotLogo}
                  alt="Knot logo"
                  className="h-20 w-auto self-start rounded-lg bg-white/80 px-4 py-3 shadow-sm ring-1 ring-emerald-100 lg:h-28"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {merchantOptions.map((merchant) => (
                  <motion.button
                    key={merchant.id}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleLink(merchant.id)}
                    disabled={!!linkingMerchant}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition text-left ${
                      hasLinkedMerchants && knotProfile.merchants.some((m) => m.merchant_id === merchant.id)
                        ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm'
                        : 'border-emerald-200 bg-white/70 text-emerald-600 hover:border-emerald-400'
                    }`}
                  >
                    <Link2 className="h-4 w-4" />
                    <span className="flex flex-col leading-tight">
                      {linkingMerchant === merchant.id ? 'Linking…' : `Link ${merchant.name}`}
                      <span className="text-[11px] font-normal text-muted-foreground">{merchant.blurb}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
            {knotError && (
              <p className="mt-4 text-sm text-red-600">{knotError}</p>
            )}
            {hasLinkedMerchants && (
              <div className="mt-6 rounded-2xl bg-white/70 p-4 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Currently sharing
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {knotProfile.merchants.map((merchant) => (
                    <div
                      key={merchant.merchant_id}
                      className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-4"
                    >
                      <p className="text-sm font-semibold text-foreground">{merchant.merchant_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Avg monthly spend ${merchant.avg_monthly_spend}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Grok will only use this opt-in data to score your request. You can unlink any time by reloading without sharing.
                </p>
              </div>
            )}
          </motion.div>

          {/* Info note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-start gap-3 rounded-2xl bg-blue-50/80 border border-blue-200 p-5"
          >
            <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Community tip:</strong> Requesting amounts that align with your capacity increases approval likelihood. Opting in with one of the purchase sources above lets Grok run a deeper risk check before we show your clarity score.
            </p>
          </motion.div>

          {/* Error message */}
          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg text-destructive font-semibold"
            >
              {error}
            </motion.p>
          )}

          {/* Submit button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              type="submit" 
              size="lg"
              disabled={loading || !amount}
              className="w-full text-xl py-8 group"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <DollarSign className="h-7 w-7" />
                </motion.span>
              ) : (
                <>
                  <span>Check My Clarity Score</span>
                  <ArrowRight className="ml-3 h-7 w-7 transition-transform group-hover:translate-x-2" />
                </>
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.form>
  );
}
