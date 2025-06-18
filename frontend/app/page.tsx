"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Login from "./components/login";
import Signup from "./components/signup";
import ParameterForm, { ParamData } from "./components/parameter-form";
import HistoryList, {
  HistoryItem as ImportedHistoryItem,
} from "./components/history-list";
import ChatWindow, { ChatMessage } from "./components/chat-window";

// Define the shape of the list item coming from the backend GET /api/history
interface BackendHistoryListItem {
  session_uuid: string;
  title: string | null;
  created_at: string; // comes as ISO string from JSON
}

// Frontend state item
export interface PageHistoryItem {
  id: string;
  question: string; // Corresponds to backend 'title'
  subreddit: string; // Will be empty initially, fetched in Phase 3
  keyword: string; // Will be empty initially, fetched in Phase 3
  messages: ChatMessage[]; // Will be empty initially, fetched in Phase 3
  timestamp?: string; // Corresponds to backend 'created_at'
}

interface AnalysisResult {
  question: string;
  subreddit: string;
  keyword: string;
  num_posts_analyzed: number;
  total_comments: number;
  analysis: string;
  post_urls?: string[];
}

interface WebSocketResponseData {
  status?: string;
  error?: string;
  results?: AnalysisResult;
  type?: "comment";
  post?: { id?: string; title?: string; author?: string };
  comment?: {
    author?: string;
    body?: string;
    score?: number;
    created_utc?: number;
  };
  chat_id?: string;
}

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();

  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [params, setParams] = useState<ParamData>({
    subreddit: "",
    keyword: "",
    numberOfPosts: "10",
    repeatHours: "0",
    repeatMinutes: "0",
    sortOrder: "hot",
  });
  const [history, setHistory] = useState<PageHistoryItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [tempClientSideHistoryId, setTempClientSideHistoryId] = useState<
    string | null
  >(null);

  // --- Phase 2: Fetch History List ---
  useEffect(() => {
    const fetchHistoryList = async () => {
      if (sessionStatus === "authenticated" && session?.backendToken) {
        console.log("Fetching history list...");
        try {
          const response = await fetch("/api/history", {
            headers: {
              Authorization: `Bearer ${session.backendToken}`,
            },
          });
          if (response.ok) {
            const backendList: BackendHistoryListItem[] = await response.json();
            console.log("Fetched history list data:", backendList);
            // Transform backend data to frontend PageHistoryItem
            const frontendHistory = backendList.map((item) => ({
              id: item.session_uuid, // Use session_uuid as the unique ID
              question: item.title || "Untitled Analysis", // Use title for display
              subreddit: "", // Will be populated when selected in Phase 3
              keyword: "", // Will be populated when selected in Phase 3
              messages: [], // Will be populated when selected in Phase 3
              timestamp: item.created_at, // Store the creation timestamp
            }));
            setHistory(frontendHistory);
          } else {
            console.error(
              "Failed to fetch history list:",
              response.status,
              response.statusText
            );
            setHistory([]); // Clear history on error
          }
        } catch (error) {
          console.error("Error fetching history list:", error);
          setHistory([]); // Clear history on error
        }
      } else {
        // Clear history if user logs out or is not authenticated
        setHistory([]);
      }
    };

    fetchHistoryList();
  }, [sessionStatus, session?.backendToken]); // Re-fetch if auth status or token changes
  // --- End Phase 2 Fetch ---

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleHistorySelect = (item: ImportedHistoryItem) => {
    // This will be expanded in Phase 3 to fetch full data from backend
    setActiveChatId(item.id);
    // For now, populate from client-side item if available (partial data)
    setParams({
      subreddit: item.subreddit,
      keyword: item.keyword,
      numberOfPosts: "10", // Default, or store/fetch this
      repeatHours: "0",
      repeatMinutes: "0",
      sortOrder: "hot", // Default, or store/fetch this
    });
    setMessages(item.messages);
  };

  const handleFormSubmit = async (
    formData: ParamData & { question: string }
  ) => {
    if (sessionStatus === "loading") {
      setMessages([
        {
          role: "system",
          content: "Authenticating... please wait.",
        },
      ]);
      return;
    }

    const authToken = session?.backendToken as string | undefined;

    if (!authToken) {
      setMessages([
        {
          role: "system",
          content: "Authentication token not found. Please log in.",
        },
      ]);
      setIsAnalysisLoading(false);
      return;
    }

    setIsAnalysisLoading(true);
    setMessages([]);

    const tempId = `temp-${Date.now()}`;
    setTempClientSideHistoryId(tempId);

    setActiveChatId(null); // Start with no active chat ID until backend confirms
    setTempClientSideHistoryId(null);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    wsRef.current = null;

    try {
      const queryDataForBackend = {
        subreddit: formData.subreddit,
        keyword: formData.keyword,
        question: formData.question,
        limit: parseInt(formData.numberOfPosts),
        sort_order: formData.sortOrder,
      };

      const ws = new WebSocket(
        `ws://localhost:8000/ws/query?token=${authToken}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "Connected. Starting analysis..." },
        ]);
        ws.send(
          JSON.stringify({
            type: "new_analysis",
            data: queryDataForBackend,
          })
        );
      };

      ws.onmessage = (event) => {
        console.log("Raw WS message received:", event.data);
        try {
          const data: WebSocketResponseData = JSON.parse(event.data);

          if (data.chat_id && !activeChatId) {
            const backendChatId = data.chat_id;
            setActiveChatId(backendChatId);
          }

          const currentChatIdForMessage = data.chat_id || activeChatId;

          if (data.status && typeof data.status === "string") {
            setMessages((prev) => [
              ...prev,
              { role: "system", content: data.status as string },
            ]);
          }

          if (data.results) {
            const content =
              typeof data.results.analysis === "string"
                ? data.results.analysis
                : JSON.stringify(data.results.analysis, null, 2);
            const postUrls = data.results.post_urls;
            const newAssistantMessage: ChatMessage = {
              role: "assistant",
              content,
              postUrls,
            };

            setMessages((prev) => [...prev, newAssistantMessage]);
            setIsAnalysisLoading(false);
          }

          if (data.type === "comment" && data.comment) {
            const postTitle = data.post?.title || "a post";
            const commentAuthor = data.comment?.author || "Someone";
            const commentBody = data.comment?.body || "said something.";
            const commentContent = `💬 Comment from u/${commentAuthor} on "${postTitle}":\n"${commentBody}"`;
            const newSystemMessage: ChatMessage = {
              role: "system",
              content: commentContent,
            };
            setMessages((prev) => [...prev, newSystemMessage]);
          }

          if (data.error && typeof data.error === "string") {
            setMessages((prev) => [
              ...prev,
              { role: "system", content: `Error: ${data.error}` },
            ]);
            setIsAnalysisLoading(false);
            setIsConnected(false);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          setMessages((prev) => [
            ...prev,
            { role: "system", content: "Error processing server message." },
          ]);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "WebSocket connection error." },
        ]);
        setIsAnalysisLoading(false);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        if (isAnalysisLoading && event.code !== 1008 && event.code !== 1000) {
          setMessages((prev) => [
            ...prev,
            { role: "system", content: "Connection closed prematurely." },
          ]);
        }
        setIsAnalysisLoading(false);
        setIsConnected(false);
        wsRef.current = null;
      };
    } catch (error) {
      console.error("WS connection failed:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Connection error: ${errorMsg}` },
      ]);
      setIsAnalysisLoading(false);
    }
  };

  const sendQuestion = async (question: string) => {
    const userMessage: ChatMessage = { role: "user", content: question };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    const currentParams = params;
    await handleFormSubmit({ ...currentParams, question });
  };

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Reddit Analyzer
        </h1>
        <div className="flex gap-4">
          <Signup />
          <Login />
        </div>
      </header>
      <div className="flex flex-col md:flex-row flex-grow gap-6 md:gap-8 overflow-hidden min-h-0">
        <div className="w-full md:w-1/4 flex flex-col gap-4 overflow-hidden min-h-0">
          <HistoryList
            history={history as ImportedHistoryItem[]}
            onSelect={handleHistorySelect}
            selectedId={activeChatId ?? undefined}
          />
          <ParameterForm params={params} onParamsChange={setParams} />
        </div>
        <div className="w-full md:w-3/4 flex flex-col overflow-hidden min-h-0">
          <ChatWindow
            messages={messages}
            onSend={sendQuestion}
            isLoading={isAnalysisLoading}
          />
        </div>
      </div>
    </main>
  );
}
