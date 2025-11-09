import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { motion } from 'framer-motion';
import { Heart, Repeat2, MessageCircleMore } from 'lucide-react';
import { fetchXFeed } from '../api';
import { useRequiredUser } from '../hooks/useRequiredUser';

export default function CommunityFeed() {
  const user = useRequiredUser();
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const resp = await fetchXFeed('raymo8980');
        if (active) {
          setTweets(resp.tweets || []);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.detail || 'Could not load live feed.');
          setTweets([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-3xl"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Live from @raymo8980</CardTitle>
          <p className="text-sm text-muted-foreground">
            Real-time updates pulled directly from X to keep borrowers motivated.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Fetching the latest posts…</p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && tweets.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent posts yet.</p>
          )}
          {tweets.map((tweet) => (
            <div
              key={tweet.id}
              className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary">@raymo8980</p>
                  <p className="text-xs text-muted-foreground">
                    {tweet.created_at ? new Date(tweet.created_at).toLocaleString() : 'Just now'}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {tweet.text}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" /> {tweet.like_count ?? 0}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Repeat2 className="h-3.5 w-3.5" /> {tweet.retweet_count ?? 0}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircleMore className="h-3.5 w-3.5" /> {tweet.reply_count ?? 0}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
