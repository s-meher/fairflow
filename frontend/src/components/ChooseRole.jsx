import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '../api';
import { getUser, saveUser } from '../storage';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { motion } from 'framer-motion';
import { Users, TrendingUp, ArrowRight, Sparkles, Waves } from 'lucide-react';

export default function ChooseRole() {
  const navigate = useNavigate();
  const existing = getUser();
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  async function handleBorrowing() {
    setError('');
    if (existing?.userId && (existing.role === 'borrower' || existing.isBorrower)) {
      saveUser({ role: 'borrower', isBorrower: true });
      navigate('/borrow/reason');
      return;
    }
    setLoading('borrow');
    try {
      const resp = await createUser({ role: 'borrower' });
      saveUser({
        userId: resp.user_id,
        role: resp.role,
        isBorrower: Boolean(resp.is_borrower),
        isVerified: Boolean(resp.is_verified),
      });
      navigate('/borrow/reason');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start borrow flow.');
    } finally {
      setLoading('');
    }
  }

  async function handleLending() {
    setError('');
    setLoading('lend');
    navigate('/lender/setup');
  }

  function handleDashboard() {
    if (existing?.role === 'lender') {
      navigate('/dashboard/lender');
    } else if (existing?.role === 'borrower') {
      navigate('/dashboard/borrower');
    } else {
      navigate('/');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, type: "spring" }}
      className="mx-auto w-full max-w-5xl"
    >
      <Card className="relative overflow-visible">
        {/* Floating decorations */}
        <motion.div
          className="absolute -top-20 -left-20 h-48 w-48 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-500/20 blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <CardHeader className="text-center pb-8">
          <motion.div
            animate={{
              y: [0, -15, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-2xl shadow-cyan-500/50"
          >
            <Waves className="h-16 w-16 text-white" />
          </motion.div>
          <CardTitle className="text-5xl md:text-6xl mb-4">
            Dive Into Your Journey
          </CardTitle>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Choose your role in the ecosystem. Both paths strengthen our community.
          </p>
        </CardHeader>

        <CardContent className="space-y-10 pb-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Borrowing Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.03, y: -8 }}
              className="group relative"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-0 blur-xl transition-opacity group-hover:opacity-30" />
              <div className="relative rounded-3xl border-3 border-cyan-300 bg-gradient-to-br from-cyan-50/90 to-blue-50/90 p-8 backdrop-blur-sm h-full flex flex-col">
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-2xl shadow-cyan-500/50"
                >
                  <TrendingUp className="h-12 w-12" />
                </motion.div>
                <h3 className="text-3xl font-black text-primary mb-3 text-center">Borrowing</h3>
                <p className="text-base text-muted-foreground mb-6 text-center flex-grow">
                  Get fair rates from your community. Skip the sharks, keep it local.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
                    <Sparkles className="h-5 w-5 text-cyan-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">Rates from 0-5%</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
                    <Sparkles className="h-5 w-5 text-cyan-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">Transparent scoring</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
                    <Sparkles className="h-5 w-5 text-cyan-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">Community pooling</span>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  className="w-full mt-6 text-lg py-7"
                  onClick={handleBorrowing} 
                  disabled={loading === 'borrow'}
                >
                  {loading === 'borrow' ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      <TrendingUp className="h-6 w-6" />
                    </motion.span>
                  ) : (
                    <>
                      Start Borrowing
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Lending Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.03, y: -8 }}
              className="group relative"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-400 to-pink-600 opacity-0 blur-xl transition-opacity group-hover:opacity-30" />
              <div className="relative rounded-3xl border-3 border-purple-300 bg-gradient-to-br from-purple-50/90 to-pink-50/90 p-8 backdrop-blur-sm h-full flex flex-col">
                <motion.div
                  animate={{
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-pink-600 text-white shadow-2xl shadow-purple-500/50"
                >
                  <Users className="h-12 w-12" />
                </motion.div>
                <h3 className="text-3xl font-black text-primary mb-3 text-center">Lending</h3>
                <p className="text-base text-muted-foreground mb-6 text-center flex-grow">
                  Earn returns while strengthening your neighborhood. Invest in people.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
                    <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">Steady returns</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
                    <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">Choose your risk</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
                    <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">Build community</span>
                  </div>
                </div>
                <Button 
                  size="lg"
                  variant="secondary"
                  className="w-full mt-6 text-lg py-7"
                  onClick={handleLending}
                  disabled={loading === 'lend'}
                >
                  {loading === 'lend' ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      <Users className="h-6 w-6" />
                    </motion.span>
                  ) : (
                    <>
                      Start Lending
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Error message */}
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-lg text-destructive font-semibold"
            >
              {error}
            </motion.p>
          )}

          {/* Dashboard link */}
          {existing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <button 
                type="button" 
                className="text-lg font-bold text-primary underline decoration-2 underline-offset-4 hover:text-accent transition-colors"
                onClick={handleDashboard}
              >
                ← Return to Dashboard
              </button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
