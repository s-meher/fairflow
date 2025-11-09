import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Sparkles, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { askFinanceBot } from '../api';

const QUICK_PROMPTS = [
  'Remind me of my next payment',
  'Explain my interest',
  'Any savings tips today?',
];

const BOT_AVATAR = '💸';
const GENERIC_ERROR = 'Finance Bot hit a snag. Try again in a moment. ✨';
const HISTORY_LIMIT = 10;

const randomId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

async function fetchFinanceBotReply({ userPrompt, history }) {
  const payload = {
    prompt: userPrompt,
    history: history.slice(-HISTORY_LIMIT).map(({ sender, text }) => ({ sender, text })),
  };
  try {
    const data = await askFinanceBot(payload);
    return data.reply?.trim() || GENERIC_ERROR;
  } catch (error) {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string') {
      throw new Error(detail);
    }
    throw error;
  }
}

function useFinanceBotChat(intro) {
  const [messages, setMessages] = useState(() => [
    { id: randomId(), sender: 'bot', text: intro },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isThinking) return;
      const trimmed = text.trim();
      const historyBeforeSend = messages;
      const userMessage = { id: randomId(), sender: 'user', text: trimmed };
      const conversationWithUser = [...historyBeforeSend, userMessage];
      setMessages(conversationWithUser);
      setInput('');
      setIsThinking(true);

      try {
        const reply = await fetchFinanceBotReply({
          userPrompt: trimmed,
          history: historyBeforeSend,
        });
        setMessages((prev) => [...prev, { id: randomId(), sender: 'bot', text: reply }]);
      } catch (err) {
        const fallback = err?.message || GENERIC_ERROR;
        setMessages((prev) => [...prev, { id: randomId(), sender: 'bot', text: fallback }]);
        console.error('Finance Bot error:', err);
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, messages],
  );

  return {
    messages,
    input,
    setInput,
    isThinking,
    sendMessage,
  };
}

function MessageBubbles({ messages, isThinking, compact = false }) {
  return (
    <div
      className={`space-y-3 ${compact ? 'h-44' : 'h-56'} overflow-y-auto rounded-2xl bg-white/75 p-4 text-sm backdrop-blur-sm`}
    >
      {messages.map((message) => (
        <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
              message.sender === 'user'
                ? 'rounded-br-md bg-gradient-to-br from-violet-500 to-pink-500 text-white'
                : 'rounded-bl-md border border-pink-100 bg-pink-50/80 text-pink-900'
            }`}
          >
            {message.text}
          </div>
        </div>
      ))}
      {isThinking && (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-pink-200 bg-pink-50/60 px-4 py-2 text-pink-700">
          <Sparkles className="h-4 w-4 animate-spin text-pink-400" />
          Dreaming up a reply…
        </div>
      )}
    </div>
  );
}

export function FinanceBotPanel({ role = 'borrower' }) {
  const intro = useMemo(
    () =>
      role === 'lender'
        ? 'Hello! Finance Bot can guide your lending strategy and celebrate every mindful return ✨'
        : 'Hello! Finance Bot is here to keep borrowing plans gentle, clear, and sparkly 🌈',
    [role],
  );
  const { messages, input, setInput, isThinking, sendMessage } = useFinanceBotChat(intro);

  return (
    <Card className="rounded-3xl border-none bg-gradient-to-br from-pink-50 via-rose-50 to-violet-50 shadow-lg ring-1 ring-pink-100/70">
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-inner">
          {BOT_AVATAR}
        </div>
        <div>
          <CardTitle className="text-xl text-pink-900">Finance Bot</CardTitle>
          <p className="text-sm text-pink-600">Friendly nudges for your plan</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MessageBubbles messages={messages} isThinking={isThinking} />
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full border border-pink-100 bg-white/80 text-pink-700 hover:bg-pink-100/70"
              onClick={() => sendMessage(prompt)}
              disabled={isThinking}
            >
              {prompt}
            </Button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask Finance Bot anything…"
            className="border-pink-100 bg-white/80"
            disabled={isThinking}
          />
          <Button
            type="submit"
            className="shrink-0 bg-gradient-to-br from-violet-500 to-pink-500 text-white hover:from-violet-400 hover:to-pink-400"
            disabled={!input.trim() || isThinking}
          >
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function FloatingFinanceBot() {
  const intro =
    'Hi! I am Mini Finance Bot. Tap a bubble whenever you want a sparkly budget boost 💕';
  const { messages, input, setInput, isThinking, sendMessage } = useFinanceBotChat(intro);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="pointer-events-auto w-72 rounded-3xl border border-pink-100 bg-white/95 p-4 shadow-2xl shadow-pink-200/70 backdrop-blur"
          >
            <div className="mb-3 flex items-center justify-between text-pink-700">
              <div className="flex items-center gap-2 font-semibold">
                <Bot className="h-5 w-5" />
                Mini Finance Bot
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-pink-50 p-1 text-pink-400 transition hover:bg-pink-100 hover:text-pink-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <MessageBubbles messages={messages} isThinking={isThinking} compact />
            <form
              className="mt-3 flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(input);
              }}
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Hi Finance Bot…"
                className="h-10 border-pink-100 text-xs"
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="sm"
                className="h-10 shrink-0 rounded-full bg-pink-500 px-3 text-xs text-white hover:bg-pink-400"
                disabled={!input.trim() || isThinking}
              >
                Send
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-400/40 transition hover:scale-105 hover:shadow-pink-400/60"
      >
        <span className="text-3xl">{isOpen ? '💖' : '🪙'}</span>
        <span className="sr-only">Toggle Finance Bot</span>
      </button>
      {!isOpen && (
        <div className="pointer-events-none rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-pink-600 shadow">
          Chat with Finance Bot?
        </div>
      )}
    </div>
  );
}
