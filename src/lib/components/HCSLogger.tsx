import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useHCS, type HCSMessage } from '../hooks/useHCS';
import { useHedera } from '../hooks/useHedera';

export interface HCSLoggerProps {
  /** Pre-fill the topic ID */
  defaultTopicId?: string;
  /** Auto-poll messages every N ms (0 = disabled) */
  pollInterval?: number;
  /** Max messages to show */
  limit?: number;
  /** Extra CSS classes */
  className?: string;
}

function timeAgo(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function tryParseJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

/**
 * Full-featured HCS logging UI.
 * - Submit messages to any topic
 * - Live feed of messages from Mirror Node
 *
 * @example
 * <HCSLogger defaultTopicId="0.0.12345" pollInterval={10000} />
 */
export function HCSLogger({
  defaultTopicId = '',
  pollInterval = 0,
  limit = 10,
  className = '',
}: HCSLoggerProps) {
  const { isConnected } = useHedera();
  const { submitMessage, fetchMessages, loading, error, lastSequenceNumber, reset } = useHCS();

  const [topicId, setTopicId] = useState(defaultTopicId);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<HCSMessage[]>([]);
  const [fetching, setFetching] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    if (!topicId.trim()) return;
    setFetching(true);
    const msgs = await fetchMessages(topicId.trim(), limit);
    setMessages(msgs);
    setFetching(false);
  };

  // Initial load + poll
  useEffect(() => {
    void loadMessages();
    if (!pollInterval) return;
    const id = setInterval(() => void loadMessages(), pollInterval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, pollInterval, limit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !topicId.trim()) return;

    const seq = await submitMessage(topicId.trim(), message.trim());
    if (seq) {
      setMessage('');
      reset();
      // Optimistic update
      setMessages((prev) => [
        {
          sequenceNumber: Number(seq),
          consensusTimestamp: new Date().toISOString(),
          content: message.trim(),
        },
        ...prev,
      ]);
      // Scroll to top of feed
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className={`rounded-2xl bg-slate-900 border border-slate-800 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-white">HCS Logger</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Log immutable messages to the Hedera Consensus Service
          </p>
        </div>
        {topicId && (
          <button
            onClick={() => void loadMessages()}
            disabled={fetching}
            className="text-xs text-slate-400 hover:text-violet-400 transition-colors disabled:opacity-40"
            title="Refresh messages"
          >
            {fetching ? '⟳ loading…' : '⟳ refresh'}
          </button>
        )}
      </div>

      {/* Topic ID input */}
      <div className="px-5 py-4 border-b border-slate-800">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
          Topic ID
        </label>
        <input
          className="
            w-full px-3 py-2 rounded-lg
            bg-slate-800 border border-slate-700
            text-slate-100 text-sm font-mono placeholder-slate-500
            focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50
            transition-colors
          "
          placeholder="0.0.12345"
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
        />
      </div>

      {/* Submit form */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="px-5 py-4 border-b border-slate-800 flex gap-2"
      >
        <input
          className="
            flex-1 px-3 py-2 rounded-lg
            bg-slate-800 border border-slate-700
            text-slate-100 text-sm placeholder-slate-500
            focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50
            transition-colors
          "
          placeholder='Message or JSON payload…'
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!isConnected}
        />
        <button
          type="submit"
          disabled={loading || !isConnected || !message.trim() || !topicId.trim()}
          className="
            px-4 py-2 rounded-lg
            bg-violet-600 hover:bg-violet-500 active:bg-violet-700
            text-white font-semibold text-sm
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors flex items-center gap-1.5
          "
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <>Log →</>
          )}
        </button>
      </form>

      {/* Status */}
      {error && (
        <div className="px-5 py-2 bg-red-950/30 border-b border-red-800/30">
          <p className="text-red-400 text-xs">⚠️ {error}</p>
        </div>
      )}
      {lastSequenceNumber && (
        <div className="px-5 py-2 bg-emerald-950/30 border-b border-emerald-800/30">
          <p className="text-emerald-400 text-xs">✅ Logged — seq #{lastSequenceNumber}</p>
        </div>
      )}

      {/* Messages feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-2 max-h-64">
        {messages.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-8">
            {topicId ? 'No messages yet.' : 'Enter a topic ID to load messages.'}
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.sequenceNumber}
              className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-violet-400">
                  #{msg.sequenceNumber}
                </span>
                <span className="text-xs text-slate-500">
                  {timeAgo(msg.consensusTimestamp)}
                </span>
              </div>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all font-mono leading-relaxed">
                {tryParseJson(msg.content)}
              </pre>
            </div>
          ))
        )}
      </div>

      {!isConnected && (
        <div className="px-5 pb-4 pt-0">
          <p className="text-center text-slate-600 text-xs">
            Connect your wallet to submit messages.
          </p>
        </div>
      )}
    </div>
  );
}
