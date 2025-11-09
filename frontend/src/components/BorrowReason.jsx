import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, postBorrowReason } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';
import { setSessionValue } from '../session';
import { saveUser } from '../storage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowRight, Sparkles, Heart } from 'lucide-react';
import FlowProgress from './FlowProgress';
import { BORROWER_FLOW_STEPS } from '../lib/flowSteps';

const suggestions = [
  { icon: '🏠', text: 'Home improvement', value: 'home improvement' },
  { icon: '📚', text: 'Education costs', value: 'education expenses' },
  { icon: '💼', text: 'Business growth', value: 'growing my business' },
  { icon: '🚗', text: 'Transportation', value: 'transportation needs' },
  { icon: '💊', text: 'Medical expenses', value: 'medical costs' },
  { icon: '💡', text: 'Something else', value: '' },
];

export default function BorrowReason() {
  const navigate = useNavigate();
  const user = useRequiredUser();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleNext(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please share your story with the community.');
      return;
    }
    if (!user?.userId) {
      setError('Could not find your profile. Please restart the flow.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await postBorrowReason({ user_id: user.userId, reason });
      setSessionValue('borrow_reason', reason);
      navigate('/borrow/amount');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const status = err.response?.status;
      if (status === 400 && detail === 'Only borrowers can set reasons.') {
        try {
          const created = await createUser({ role: 'borrower' });
          saveUser({
            userId: created.user_id,
            role: created.role,
            isBorrower: Boolean(created.is_borrower),
            isVerified: Boolean(created.is_verified),
          });
          await postBorrowReason({ user_id: created.user_id, reason });
          setSessionValue('borrow_reason', reason);
          navigate('/borrow/amount');
          return;
        } catch (fallbackErr) {
          setError(fallbackErr.response?.data?.detail || 'Could not save reason.');
        }
      } else {
        setError(detail || 'Could not save reason.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <motion.form 
      onSubmit={handleNext}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-4xl"
    >
      <FlowProgress steps={BORROWER_FLOW_STEPS} activeStep="reason" label="Borrower journey" />
      <Card className="relative overflow-visible">
        {/* Floating decorations */}
        <motion.div
          className="absolute -top-16 right-10 h-32 w-32 rounded-full bg-gradient-to-br from-pink-400/30 to-rose-500/30 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            y: [0, -20, 0],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        <CardHeader className="text-center">
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, 3, -3, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-2xl shadow-blue-500/50"
          >
            <MessageSquare className="h-14 w-14 text-white" />
          </motion.div>
          <CardTitle className="text-4xl md:text-5xl mb-4">
            Share Your Story
          </CardTitle>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Help the community understand your needs. Transparency builds trust.
          </p>
        </CardHeader>

        <CardContent className="space-y-8 pb-12">
          {/* Quick suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Quick picks
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {suggestions.map((item, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => item.value && setReason(item.value)}
                  className="group relative overflow-hidden rounded-2xl border-2 border-cyan-200/60 bg-white/80 p-5 text-left backdrop-blur-sm transition-all hover:border-cyan-400 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.icon}</span>
                    <span className="text-base font-semibold text-foreground">{item.text}</span>
                  </div>
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-100/0 via-blue-100/50 to-cyan-100/0 opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Text area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-5 w-5 text-rose-500" />
              <p className="text-lg font-semibold text-foreground">
                Your story (in your own words)
              </p>
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us more... For example: I'm saving for my daughter's college tuition, or I need to cover unexpected medical bills, or I'm investing in tools for my small business..."
              className="min-h-[200px] text-lg"
            />
            <p className="text-sm text-muted-foreground italic">
              💙 Your story helps lenders understand your needs and builds community trust.
            </p>
          </motion.div>

          {/* Error message */}
          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-lg text-destructive font-semibold"
            >
              {error}
            </motion.p>
          )}

          {/* Submit button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              type="submit" 
              size="lg"
              disabled={loading}
              className="w-full text-xl py-8 group"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <MessageSquare className="h-7 w-7" />
                </motion.span>
              ) : (
                <>
                  <span>Continue Your Journey</span>
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
