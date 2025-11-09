import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBorrowOptions, requestLoan, transferNessie } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { getSessionValue, setSessionValue } from '../session';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Waves, Users, Check, ArrowRight, Share2, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import FlowProgress from './FlowProgress';
import { BORROWER_FLOW_STEPS } from '../lib/flowSteps';

export default function BorrowOptions() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [match, setMatch] = useState(null);
  const [transferMsg, setTransferMsg] = useState('');
  const [requesting, setRequesting] = useState(false);
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
    async function loadOptions() {
      setLoading(true);
      try {
        const resp = await fetchBorrowOptions(user.userId);
        if (mounted) {
          setOptions(resp.combos);
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.detail || 'Could not load options.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadOptions();
    return () => {
      mounted = false;
    };
  }, [user?.userId]);

  async function handleRequest() {
    if (!selected) return;
    setError('');
    setRequesting(true);
    try {
      const resp = await requestLoan(user.userId);
      setMatch(resp);
      setSessionValue('match_id', resp.match_id);
      setSessionValue('match_lenders', resp.lenders);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not request loan.');
    } finally {
      setRequesting(false);
    }
  }

  async function handleTransfer() {
    const matchId = match?.match_id || getSessionValue('match_id');
    if (!matchId) {
      setTransferMsg('Request a match first.');
      return;
    }
    setTransferMsg('');
    try {
      const resp = await transferNessie(matchId);
      setTransferMsg(`${resp.message} (${resp.txn_id})`);
    } catch (err) {
      setTransferMsg(err.response?.data?.detail || 'Transfer failed');
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-4 h-16 w-16"
          >
            <Waves className="h-full w-full text-primary" />
          </motion.div>
          <p className="text-lg text-muted-foreground">Finding community pools...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-4xl"
    >
      <FlowProgress
        steps={BORROWER_FLOW_STEPS}
        activeStep="options"
        label="Borrower journey"
        onStepSelect={handleProgressSelect}
      />
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Community Pools
          </CardTitle>
          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-destructive font-semibold"
            >
              {error}
            </motion.p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <AnimatePresence>
              {options.map((combo, idx) => {
                const active = selected?.id === combo.id;
                return (
                  <motion.div
                    key={combo.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(combo)}
                      className={cn(
                        'group relative w-full overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-300',
                        active 
                          ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-xl shadow-emerald-200/50' 
                          : 'border-cyan-200 bg-white/90 hover:border-cyan-400 hover:shadow-lg backdrop-blur-sm',
                      )}
                    >
                      {/* Selected indicator */}
                      <AnimatePresence>
                        {active && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg"
                          >
                            <Check className="h-6 w-6" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-start justify-between">
                        <div>
                          <p className="mb-3 text-3xl font-black text-primary">
                            ${combo.total}
                          </p>
                          <ul className="space-y-2">
                            {combo.parts.map((part, partIdx) => (
                              <motion.li 
                                key={part.lenderId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 + partIdx * 0.05 }}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                                <span className="font-semibold">{part.lenderId}:</span>
                                <span className="font-mono">${part.amount}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Hover wave effect */}
                      <motion.div
                        className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-100/50 to-blue-100/50"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.6 }}
                      />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              className="w-full group" 
              size="lg" 
              disabled={!selected || requesting} 
              onClick={handleRequest}
            >
              {requesting ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <Zap className="h-5 w-5" />
                </motion.span>
              ) : (
                <>
                  <span>Request Pool</span>
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </motion.div>

          <AnimatePresence>
            {match && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div className="overflow-hidden rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-xl">
                  <div className="mb-4 flex items-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg"
                    >
                      <Check className="h-7 w-7" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Pool Ready
                      </p>
                      <p className="text-xl font-black text-primary">
                        Match #{match.match_id}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl bg-white/80 p-4 backdrop-blur-sm">
                    <p className="mb-3 text-base leading-relaxed text-foreground">
                      {match.ai_advice}
                    </p>
                    <div className="space-y-2">
                      {match.lenders.map((l) => (
                        <div key={l.id} className="flex items-center gap-2 text-sm">
                          <div className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
                          <span className="font-semibold">{l.id}:</span>
                          <span className="font-mono">${l.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={() => navigate('/dashboard/borrower')}
                      className="flex-1"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      View dashboard
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleTransfer}
                      className="flex-1"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Simulate Flow
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/post/preview')}
                      className="flex-1"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share (optional)
                    </Button>
                  </div>

                  {transferMsg && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-sm text-muted-foreground"
                    >
                      {transferMsg}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
