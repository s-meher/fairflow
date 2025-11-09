import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const containerRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className={`space-y-3 ${compact ? 'h-48' : 'h-64'} overflow-y-auto rounded-3xl bg-gradient-to-b from-sky-50/80 via-white to-white/80 p-4 text-sm shadow-inner shadow-sky-100 backdrop-blur`}
    >
      {messages.map((message) => (
        <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] rounded-3xl px-4 py-2 shadow-sm ${
              message.sender === 'user'
                ? 'rounded-br-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white'
                : 'rounded-bl-xl border border-sky-100 bg-white/80 text-sky-900'
            }`}
          >
            {message.text}
          </div>
        </div>
      ))}
      {isThinking && (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 px-4 py-2 text-sky-700">
          <Sparkles className="h-4 w-4 animate-bounce text-sky-400" />
          Crafting a reply…
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
        : 'Finance Bot studies your linked shopping habits to sketch realistic savings moves and repayment pacing.',
    [role],
  );
  const { messages, input, setInput, isThinking, sendMessage } = useFinanceBotChat(intro);

  return (
    <Card className="rounded-3xl border-none bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 shadow-lg ring-1 ring-sky-100/70">
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-inner">
          {BOT_AVATAR}
        </div>
        <div>
          <CardTitle className="text-xl text-sky-900">Finance Bot</CardTitle>
          <p className="text-sm text-sky-600">Friendly nudges for your plan</p>
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
              className="rounded-full border border-sky-100 bg-white/80 text-sky-700 hover:bg-sky-100/70"
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
            className="border-sky-100 bg-white/80"
            disabled={isThinking}
          />
          <Button
            type="submit"
            className="shrink-0 bg-gradient-to-br from-sky-500 to-indigo-500 text-white hover:brightness-110"
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
    'Hello, I am FairFlow’s finance bot. Tap the bubble whenever you need borrowing or lending guidance.';
  const { messages, input, setInput, isThinking, sendMessage } = useFinanceBotChat(intro);
  const [isOpen, setIsOpen] = useState(false);

  const waveBackground =
    'radial-gradient(circle at 10% 20%, rgba(186,230,253,0.8), transparent 50%), radial-gradient(circle at 80% 0%, rgba(191,219,254,0.7), transparent 55%), linear-gradient(140deg, #e0f2ff 0%, #eff6ff 45%, #ffffff 100%)';

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="pointer-events-auto w-80 rounded-[32px] border border-sky-100/70 p-5 shadow-2xl shadow-sky-200/70 backdrop-blur"
            style={{ backgroundImage: waveBackground }}
          >
            <div className="mb-3 flex items-center justify-between text-sky-700">
              <div className="flex items-center gap-3 font-semibold">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-inner shadow-sky-100">
                  <Bot className="h-5 w-5 text-sky-500" />
                </div>
                Finance Bot
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-white/60 p-1 text-sky-400 transition hover:bg-sky-50 hover:text-sky-600"
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
                placeholder="Ask Finance Bot anything…"
                className="h-11 border-sky-100 bg-white/70 text-xs text-sky-900 placeholder:text-sky-400"
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="sm"
                className="h-11 shrink-0 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-4 text-xs font-semibold text-white shadow-lg shadow-sky-300/50 hover:brightness-110"
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
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-400/50 transition hover:scale-105 hover:shadow-blue-500/60"
      >
        <span className="text-3xl">{isOpen ? '💬' : '🌊'}</span>
        <span className="sr-only">Toggle Finance Bot</span>
      </button>
      {!isOpen && (
        <div className="pointer-events-none rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-sky-600 shadow">
          Chat with Finance Bot?
        </div>
      )}
    </div>
  );
}
