import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConversationsTab } from "./conversations-tab";
import type {
  SerializedConversation,
  SerializedVoiceSession,
} from "./types";

const mockConversations: SerializedConversation[] = [
  {
    id: "conv-1",
    coworkerId: "cw-1",
    type: "text",
    transcript: [
      { role: "model", text: "Hi there!", timestamp: "2024-01-15T10:00:00Z" },
      {
        role: "user",
        text: "Hello, nice to meet you!",
        timestamp: "2024-01-15T10:00:30Z",
      },
      {
        role: "model",
        text: "Let me explain the task.",
        timestamp: "2024-01-15T10:01:00Z",
      },
    ],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:01:00Z",
    coworker: { id: "cw-1", name: "Alex Chen", role: "Tech Lead" },
  },
  {
    id: "conv-2",
    coworkerId: "cw-2",
    type: "text",
    transcript: [
      {
        role: "model",
        text: "Welcome aboard!",
        timestamp: "2024-01-15T10:05:00Z",
      },
    ],
    createdAt: "2024-01-15T10:05:00Z",
    updatedAt: "2024-01-15T10:05:00Z",
    coworker: { id: "cw-2", name: "Jordan Lee", role: "HR Manager" },
  },
];

const mockVoiceSessions: SerializedVoiceSession[] = [
  {
    id: "vs-1",
    coworkerId: "cw-1",
    startTime: "2024-01-15T10:30:00Z",
    endTime: "2024-01-15T10:35:00Z",
    durationMs: 300000,
    transcript: [
      { role: "model", text: "Let's discuss the PR.", timestamp: "2024-01-15T10:30:00Z" },
      { role: "user", text: "Sure, I'll walk you through it.", timestamp: "2024-01-15T10:30:15Z" },
    ],
    connectionEvents: [
      { type: "connected", timestamp: "2024-01-15T10:30:00Z" },
      { type: "disconnected", timestamp: "2024-01-15T10:35:00Z" },
    ],
    tokenName: "token-1",
    errorMessage: null,
    coworker: { id: "cw-1", name: "Alex Chen", role: "Tech Lead" },
  },
];

describe("ConversationsTab", () => {
  it("renders summary stats", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    const summary = screen.getByTestId("conversations-summary");
    expect(summary).toBeInTheDocument();
    // 2 coworkers
    expect(summary).toHaveTextContent("2");
    // 3 total conversations
    expect(summary).toHaveTextContent("3");
    // Total messages: 3 + 1 + 2 = 6
    expect(summary).toHaveTextContent("6");
  });

  it("groups conversations by coworker", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Tech Lead")).toBeInTheDocument();
    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.getByText("HR Manager")).toBeInTheDocument();
  });

  it("shows conversation type badges", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    // Both coworkers have text badges, Alex also has voice
    const textBadges = screen.getAllByText("1 text");
    expect(textBadges).toHaveLength(2); // Alex and Jordan both have 1 text
    expect(screen.getByText("1 voice")).toBeInTheDocument(); // Alex has 1 voice
  });

  it("renders chat bubbles with messages", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    expect(screen.getByText("Hi there!")).toBeInTheDocument();
    expect(screen.getByText("Hello, nice to meet you!")).toBeInTheDocument();
    expect(screen.getByText("Let me explain the task.")).toBeInTheDocument();
  });

  it("renders user messages with primary styling", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    const userMessages = screen.getAllByTestId("message-user");
    expect(userMessages.length).toBeGreaterThan(0);
    // User message bubble has bg-primary class
    expect(userMessages[0].querySelector(".bg-primary")).toBeInTheDocument();
  });

  it("renders model messages with muted styling", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    const modelMessages = screen.getAllByTestId("message-model");
    expect(modelMessages.length).toBeGreaterThan(0);
    expect(modelMessages[0].querySelector(".bg-muted")).toBeInTheDocument();
  });

  it("collapses coworker section when clicked", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    // Messages should be visible initially
    expect(screen.getByText("Hi there!")).toBeInTheDocument();

    // Click to collapse the Alex Chen section
    const alexHeader = screen.getByText("Alex Chen").closest("button")!;
    fireEvent.click(alexHeader);

    // Messages should now be hidden
    expect(screen.queryByText("Hi there!")).not.toBeInTheDocument();
  });

  it("shows empty state when no conversations", () => {
    render(
      <ConversationsTab conversations={[]} voiceSessions={[]} />
    );

    expect(
      screen.getByText("No conversations recorded for this assessment")
    ).toBeInTheDocument();
  });

  it("renders voice session with transcript", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    expect(screen.getByText("Let's discuss the PR.")).toBeInTheDocument();
    expect(
      screen.getByText("Sure, I'll walk you through it.")
    ).toBeInTheDocument();
  });

  it("shows voice session duration", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    expect(screen.getByText("5m")).toBeInTheDocument();
  });

  it("shows voice session error when present", () => {
    const errorSession: SerializedVoiceSession = {
      ...mockVoiceSessions[0],
      id: "vs-error",
      errorMessage: "Connection lost unexpectedly",
    };

    render(
      <ConversationsTab
        conversations={[]}
        voiceSessions={[errorSession]}
      />
    );

    expect(
      screen.getByText("Connection lost unexpectedly")
    ).toBeInTheDocument();
  });

  it("shows message count badges per coworker", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    // Alex: 3 text + 2 voice = 5 msgs
    expect(screen.getByText("5 msgs")).toBeInTheDocument();
    // Jordan: 1 msg
    expect(screen.getByText("1 msgs")).toBeInTheDocument();
  });

  it("renders connection events for voice sessions", () => {
    render(
      <ConversationsTab
        conversations={mockConversations}
        voiceSessions={mockVoiceSessions}
      />
    );

    // Connection events should be rendered
    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(screen.getByText("disconnected")).toBeInTheDocument();
  });
});
