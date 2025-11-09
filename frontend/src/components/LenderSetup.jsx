import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '../api';
import { saveUser } from '../storage';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { motion } from 'framer-motion';
import { Users, TrendingUp, ArrowRight, Sparkles, DollarSign, Percent } from 'lucide-react';
import FlowProgress from './FlowProgress';
import { LENDER_FLOW_STEPS } from '../lib/flowSteps';

const capitalSuggestions = [1000, 2500, 5000, 10000];
const rateSuggestions = [2, 3, 4, 5];

export default function LenderSetup() {
  const navigate = useNavigate();
  const [capital, setCapital] = useState('');
  const [minRate, setMinRate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!capital) {
      setError('Please enter your capital amount.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await createUser({
        role: 'lender',
        min_rate: Number(minRate) || 2,
        max_amount: Number(capital),
      });
      saveUser({
        userId: resp.user_id,
        role: resp.role,
        isBorrower: Boolean(resp.is_borrower),
        isVerified: Boolean(resp.is_verified),
      });
      navigate('/dashboard/lender');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save lender profile.');
    } finally {
      setLoading(false);
    }
  }

  const numericCapital = Number(capital) || 0;
  const numericRate = Number(minRate) || 2;
  const estimatedReturn = (numericCapital * numericRate * 0.01).toFixed(2);

  return (
    <motion.form 
      onSubmit={handleSubmit}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-4xl"
    >
      <FlowProgress
        steps={LENDER_FLOW_STEPS}
        activeStep="setup"
        label="Lender journey"
        accent="from-purple-500 via-pink-500 to-rose-500"
      />
      <Card className="relative overflow-visible">
        {/* Floating decorations */}
        <motion.div
          className="absolute -top-16 right-10 h-40 w-40 rounded-full bg-gradient-to-br from-purple-400/30 to-pink-500/30 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <CardHeader className="text-center">
          <motion.div
            animate={{
              y: [0, -12, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600 shadow-2xl shadow-purple-500/50"
          >
            <Users className="h-14 w-14 text-white" />
          </motion.div>
          <CardTitle className="text-4xl md:text-5xl mb-4">
            Setup Your Lending Pool
          </CardTitle>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Decide how much you want to lend and at what rate. Build wealth while building community.
          </p>
        </CardHeader>

        <CardContent className="space-y-8 pb-12">
          {/* Capital input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <Label htmlFor="capital" className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-emerald-600" />
              Available Capital
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {capitalSuggestions.map((amount, idx) => (
                <motion.button
                  key={amount}
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCapital(amount.toString())}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    Number(capital) === amount
                      ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg'
                      : 'border-cyan-200/60 bg-white/80 hover:border-cyan-400'
                  }`}
                >
                  <p className="text-2xl font-black text-primary">${amount.toLocaleString()}</p>
                </motion.button>
              ))}
            </div>
            <div className="relative">
              <DollarSign className="absolute left-5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="capital" 
                type="number" 
                value={capital} 
                onChange={(e) => setCapital(e.target.value)}
                placeholder="Enter custom amount"
                className="pl-16 text-2xl font-bold h-16"
              />
            </div>
          </motion.div>

          {/* Rate input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <Label htmlFor="min-rate" className="text-xl font-bold flex items-center gap-2">
              <Percent className="h-6 w-6 text-cyan-600" />
              Minimum Interest Rate
            </Label>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {rateSuggestions.map((rate, idx) => (
                <motion.button
                  key={rate}
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMinRate(rate.toString())}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    Number(minRate) === rate
                      ? 'border-cyan-400 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg'
                      : 'border-cyan-200/60 bg-white/80 hover:border-cyan-400'
                  }`}
                >
                  <p className="text-3xl font-black text-primary">{rate}%</p>
                </motion.button>
              ))}
            </div>
            <div className="relative">
              <Percent className="absolute left-5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="min-rate" 
                type="number" 
                value={minRate} 
                onChange={(e) => setMinRate(e.target.value)}
                placeholder="2"
                step="0.5"
                className="pl-16 text-2xl font-bold h-16"
              />
            </div>
          </motion.div>

          {/* Earnings projection */}
          {numericCapital > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 p-8"
            >
              <div className="flex items-start gap-6">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-xl flex-shrink-0"
                >
                  <TrendingUp className="h-10 w-10" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    Estimated Annual Return
                  </p>
                  <p className="text-5xl font-black text-primary mb-2">
                    ${estimatedReturn}
                  </p>
                  <p className="text-base text-muted-foreground">
                    Based on ${numericCapital.toLocaleString()} at {numericRate}% minimum rate. Actual returns may vary based on loan performance.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid md:grid-cols-3 gap-4"
          >
            {[
              { icon: '🤝', title: 'Build Trust', text: 'Support neighbors directly' },
              { icon: '💰', title: 'Fair Returns', text: 'Better than savings accounts' },
              { icon: '🌊', title: 'Local Impact', text: 'Strengthen your community' },
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + idx * 0.1 }}
                className="flex items-start gap-3 rounded-xl bg-white/80 p-5 border border-cyan-200/60"
              >
                <span className="text-3xl">{benefit.icon}</span>
                <div>
                  <p className="font-bold text-foreground mb-1">{benefit.title}</p>
                  <p className="text-sm text-muted-foreground">{benefit.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Error */}
          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg text-destructive font-semibold"
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              type="submit" 
              size="lg"
              disabled={loading || !capital}
              className="w-full text-xl py-8 group"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <Users className="h-7 w-7" />
                </motion.span>
              ) : (
                <>
                  <span>Join the Pool</span>
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
