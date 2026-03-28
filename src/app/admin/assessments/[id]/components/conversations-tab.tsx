"use client";

import { useState } from "react";
import {
  MessageSquare,
  Mic,
  ChevronDown,
  ChevronRight,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage, TranscriptMessage } from "@/types";
import type {
  SerializedConversation,
  SerializedVoiceSession,
} from "./types";
import { formatDuration, formatTime } from "./utils";

interface ConversationsTabProps {
  conversations: SerializedConversation[];
  voiceSessions: SerializedVoiceSession[];
}

interface ConnectionEvent {
  type: string;
  timestamp: string;
  details?: string;
}

// Group conversations and voice sessions by coworker
interface CoworkerGroup {
  coworkerId: string;
  coworkerName: string;
  coworkerRole: string;
  textConversations: SerializedConversation[];
  voiceConversations: SerializedConversation[];
  voiceSessions: SerializedVoiceSession[];
  totalMessages: number;
}

function groupByCoworker(
  conversations: SerializedConversation[],
  voiceSessions: SerializedVoiceSession[]
): CoworkerGroup[] {
  const groups = new Map<string, CoworkerGroup>();

  for (const conv of conversations) {
    const key = conv.coworkerId ?? "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        coworkerId: key,
        coworkerName: conv.coworker?.name ?? "Unknown",
        coworkerRole: conv.coworker?.role ?? "",
        textConversations: [],
        voiceConversations: [],
        voiceSessions: [],
        totalMessages: 0,
      });
    }
    const group = groups.get(key)!;
    if (conv.type === "voice") {
      group.voiceConversations.push(conv);
    } else {
      group.textConversations.push(conv);
    }
    const messages = conv.transcript as ChatMessage[];
    group.totalMessages += Array.isArray(messages) ? messages.length : 0;
  }

  for (const vs of voiceSessions) {
    const key = vs.coworkerId;
    if (!groups.has(key)) {
      groups.set(key, {
        coworkerId: key,
        coworkerName: vs.coworker.name,
        coworkerRole: vs.coworker.role,
        textConversations: [],
        voiceConversations: [],
        voiceSessions: [],
        totalMessages: 0,
      });
    }
    const group = groups.get(key)!;
    group.voiceSessions.push(vs);
    const transcript = vs.transcript as TranscriptMessage[];
    group.totalMessages += Array.isArray(transcript) ? transcript.length : 0;
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.coworkerName.localeCompare(b.coworkerName)
  );
}

function formatMessageTime(timestamp: string): string {
  try {
    return formatTime(timestamp);
  } catch {
    return "";
  }
}

function calculateConversationDuration(messages: { timestamp: string }[]): number | null {
  if (messages.length < 2) return null;
  const first = new Date(messages[0].timestamp).getTime();
  const last = new Date(messages[messages.length - 1].timestamp).getTime();
  const duration = last - first;
  return duration > 0 ? duration : null;
}

function ChatBubble({
  message,
}: {
  message: ChatMessage | TranscriptMessage;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.text}</p>
        <p
          className={`mt-1 text-xs ${
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {formatMessageTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function ConnectionEventItem({ event }: { event: ConnectionEvent }) {
  const isConnect = event.type === "connected" || event.type === "connect";
  const isDisconnect = event.type === "disconnected" || event.type === "disconnect";
  const Icon = isDisconnect ? WifiOff : isConnect ? Wifi : Clock;

  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <div className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="capitalize">{event.type}</span>
        {event.timestamp && (
          <span>at {formatMessageTime(event.timestamp)}</span>
        )}
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function ConversationView({
  conversation,
}: {
  conversation: SerializedConversation;
}) {
  const messages = (conversation.transcript as ChatMessage[]) ?? [];
  const duration = calculateConversationDuration(messages);
  const isVoice = conversation.type === "voice";
  const Icon = isVoice ? Mic : MessageSquare;
  const label = isVoice ? "Voice conversation" : "Text conversation";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        <span>&middot;</span>
        <span>{messages.length} messages</span>
        {duration && (
          <>
            <span>&middot;</span>
            <span>{formatDuration(duration)}</span>
          </>
        )}
      </div>
      <div className="space-y-2">
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
        {messages.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No messages in this conversation
          </p>
        )}
      </div>
    </div>
  );
}

function VoiceSessionView({
  session,
}: {
  session: SerializedVoiceSession;
}) {
  const transcript = (session.transcript as TranscriptMessage[]) ?? [];
  const events = (session.connectionEvents as ConnectionEvent[]) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mic className="h-3.5 w-3.5" />
        <span>Voice session</span>
        <span>&middot;</span>
        <span>{transcript.length} messages</span>
        {session.durationMs && (
          <>
            <span>&middot;</span>
            <span>{formatDuration(session.durationMs)}</span>
          </>
        )}
        {session.errorMessage && (
          <Badge variant="destructive" className="ml-1 gap-1 text-xs">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        )}
      </div>

      {session.errorMessage && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {session.errorMessage}
        </div>
      )}

      <div className="space-y-2">
        {/* Interleave connection events and transcript by timestamp */}
        {events.length > 0 && (
          <div className="space-y-1">
            {events.map((event, i) => (
              <ConnectionEventItem key={`event-${i}`} event={event} />
            ))}
          </div>
        )}
        {transcript.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
        {transcript.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No transcript available for this voice session
          </p>
        )}
      </div>
    </div>
  );
}

function CoworkerSection({ group }: { group: CoworkerGroup }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card data-testid={`coworker-${group.coworkerId}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between border-b border-border p-4 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {group.coworkerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium">{group.coworkerName}</h3>
            <p className="text-xs text-muted-foreground">{group.coworkerRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {group.textConversations.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {group.textConversations.length} text
              </Badge>
            )}
            {(group.voiceConversations.length > 0 || group.voiceSessions.length > 0) && (
              <Badge variant="secondary" className="gap-1">
                <Mic className="h-3 w-3" />
                {group.voiceConversations.length + group.voiceSessions.length} voice
              </Badge>
            )}
            <Badge variant="outline">{group.totalMessages} msgs</Badge>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <CardContent className="space-y-6 p-4">
          {group.textConversations.map((conv) => (
            <ConversationView key={conv.id} conversation={conv} />
          ))}
          {group.voiceConversations.map((conv) => (
            <ConversationView key={conv.id} conversation={conv} />
          ))}
          {group.voiceSessions.map((vs) => (
            <VoiceSessionView key={vs.id} session={vs} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export function ConversationsTab({
  conversations,
  voiceSessions,
}: ConversationsTabProps) {
  const groups = groupByCoworker(conversations, voiceSessions);
  const totalMessages = groups.reduce((sum, g) => sum + g.totalMessages, 0);
  const textCount = conversations.filter((c) => c.type !== "voice").length;
  const voiceCount = conversations.filter((c) => c.type === "voice").length + voiceSessions.length;
  const totalConversations = textCount + voiceCount;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card data-testid="conversations-summary">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                COWORKERS
              </p>
              <p className="text-2xl font-semibold">{groups.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                CONVERSATIONS
              </p>
              <p className="text-2xl font-semibold">{totalConversations}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                TEXT / VOICE
              </p>
              <p className="text-2xl font-semibold">
                {textCount} / {voiceCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                TOTAL MESSAGES
              </p>
              <p className="text-2xl font-semibold">{totalMessages}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coworker groups */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No conversations recorded for this assessment
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <CoworkerSection key={group.coworkerId} group={group} />
        ))
      )}
    </div>
  );
}
