import { useTopicMessages, type TopicMessage } from '../hooks/useTopicMessages';

export interface TopicMessageFeedProps {
  topicId: string;
  /** Polling interval in ms. Default: 5000 */
  pollInterval?: number;
  /** Max messages to display */
  maxMessages?: number;
  /** Show raw base64 alongside decoded */
  showRaw?: boolean;
  className?: string;
}

function MessageCard({ msg, showRaw }: { msg: TopicMessage; showRaw: boolean }) {
  let parsedJson: object | null = null;
  try {
    parsedJson = JSON.parse(msg.messageDecoded);
  } catch {
    // Not JSON
  }

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-violet-950/40 text-violet-300 border border-violet-800/30 px-2 py-0.5 rounded font-mono">
            #{msg.sequenceNumber}
          </span>
          {msg.chunkInfo && (
            <span className="text-xs text-slate-500">
              chunk {msg.chunkInfo.number}/{msg.chunkInfo.total}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {new Date(Number(msg.consensusTimestamp.split('.')[0]) * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>

      {/* Message content */}
      {parsedJson ? (
        <pre className="text-xs text-emerald-300 bg-slate-900 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(parsedJson, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-slate-200 break-all">{msg.messageDecoded}</p>
      )}

      {showRaw && (
        <p className="text-xs text-slate-600 font-mono mt-2 break-all truncate">
          raw: {msg.message}
        </p>
      )}
    </div>
  );
}

/**
 * Live-updating feed of messages from a Hedera Consensus Service (HCS) topic.
 * Automatically polls the Mirror Node for new messages.
 *
 * @example
 * <TopicMessageFeed topicId="0.0.9999999" pollInterval={3000} />
 */
export function TopicMessageFeed({
  topicId,
  pollInterval = 5000,
  maxMessages = 50,
  showRaw = false,
  className = '',
}: TopicMessageFeedProps) {
  const { messages, loading, error, isPolling, startPolling, stopPolling, clearMessages } =
    useTopicMessages(topicId, { pollInterval, maxMessages });

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">HCS Message Feed</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{topicId}</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => (isPolling ? stopPolling() : startPolling())}
            className={`
              flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
              ${isPolling
                ? 'bg-red-950/30 border-red-800/30 text-red-400 hover:bg-red-900/40'
                : 'bg-emerald-950/30 border-emerald-800/30 text-emerald-400 hover:bg-emerald-900/40'}
            `}
          >
            {isPolling ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Stop
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Listen
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/20 border border-red-800/30 p-3 mb-3">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      <div className="space-y-2">
        {loading && messages.length === 0 ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-3.5 animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-5 w-12 bg-slate-700 rounded" />
                <div className="h-4 w-16 bg-slate-700 rounded" />
              </div>
              <div className="h-4 bg-slate-700 rounded w-3/4" />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 text-center">
            <svg className="w-8 h-8 text-slate-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-slate-500 text-sm">
              {isPolling ? 'Waiting for messages…' : 'No messages yet — press Listen'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageCard
              key={`${msg.topicId}-${msg.sequenceNumber}`}
              msg={msg}
              showRaw={showRaw}
            />
          ))
        )}
      </div>
    </div>
  );
}
