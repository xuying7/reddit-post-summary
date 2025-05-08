"use client";

import React, { useEffect, useRef, useState } from "react";
import Login from "./components/login";
import Signup from "./components/signup";
import ParameterForm, { ParamData } from "./components/parameter-form";
import HistoryList, { HistoryItem } from "./components/history-list";
import ChatWindow, { ChatMessage } from "./components/chat-window";

// Interface for the final analysis result structure from backend
interface AnalysisResult {
  question: string;
  subreddit: string;
  keyword: string;
  num_posts_analyzed: number;
  total_comments: number;
  analysis: string;
  post_urls?: string[];
}

interface WebSocketMessage {
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
}

export default function Home() {
  // State for loading status
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  // State for WebSocket connection status
  const [isConnected, setIsConnected] = useState<boolean>(false);
  // Ref to hold the WebSocket instance
  const wsRef = useRef<WebSocket | null>(null);
  const [params, setParams] = useState<ParamData>({
    subreddit: "",
    keyword: "",
    numberOfPosts: "10",
    repeatHours: "0",
    repeatMinutes: "0",
    sortOrder: "hot",
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<
    HistoryItem["id"] | undefined
  >();

  // Cleanup function for WebSocket connection
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleHistorySelect = (item: HistoryItem) => {
    setSelectedHistoryId(item.id);
    setParams({
      subreddit: item.subreddit,
      keyword: item.keyword,
      numberOfPosts: "10",
      repeatHours: "0",
      repeatMinutes: "0",
      sortOrder: "hot",
    });
    setMessages(item.messages);
  };

  // Function to handle the form submission
  const handleFormSubmit = async (
    formData: ParamData & { question: string }
  ) => {
    // Reset states
    setIsAnalysisLoading(true);

    // Save to history list client-side (could be replaced by backend fetch)
    const newHistId = Date.now();
    setHistory((prev) => [
      {
        id: newHistId,
        question: formData.question,
        subreddit: formData.subreddit,
        keyword: formData.keyword,
        messages: [],
      },
      ...prev,
    ]);
    setSelectedHistoryId(newHistId);
    setMessages([]);

    // Close existing WebSocket connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Format the form data to match what the backend expects
      const queryData = {
        subreddit: formData.subreddit,
        keyword: formData.keyword,
        question: formData.question,
        limit: parseInt(formData.numberOfPosts),
        repeatHours: parseInt(formData.repeatHours || "0"),
        repeatMinutes: parseInt(formData.repeatMinutes || "0"),
        sort_order: formData.sortOrder,
      };

      // Create a new WebSocket connection
      const ws = new WebSocket("ws://localhost:8000/ws/query");
      wsRef.current = ws;

      // Set up WebSocket event handlers
      ws.onopen = () => {
        setIsConnected(true);
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "Connected to server" },
        ]);

        // Send the query data once connected
        ws.send(JSON.stringify(queryData));
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "Query sent to server" },
        ]);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);

          // Handle status updates
          if (data.status && typeof data.status === "string") {
            // Push status as system message (skip noisy early statuses if desired)
            setMessages((prev) => [
              ...prev,
              { role: "system", content: data.status as string },
            ]);

            if (data.status === "Query completed") {
              setIsAnalysisLoading(false);
            }
          }

          // Handle results
          if (data.results) {
            const content =
              typeof data.results.analysis === "string"
                ? data.results.analysis
                : JSON.stringify(data.results.analysis, null, 2);

            const postUrls = data.results.post_urls;

            setMessages((prev) => [
              ...prev,
              { role: "assistant", content, postUrls },
            ]);
            setIsAnalysisLoading(false);

            // update history
            setHistory((prev) =>
              prev.map((h) =>
                h.id === newHistId
                  ? {
                      ...h,
                      messages: [
                        ...prev.find((x) => x.id === newHistId)!.messages,
                        { role: "assistant", content, postUrls },
                      ],
                    }
                  : h
              )
            );
          }

          // Handle individual comments (if backend sends them with a specific type)
          if (data.type === "comment" && data.comment) {
            const postTitle = data.post?.title || "a post";
            const commentAuthor = data.comment?.author || "Someone";
            const commentBody = data.comment?.body || "said something.";
            const commentContent = `💬 Comment from u/${commentAuthor} on "${postTitle}":\\n"${commentBody}"`;
            setMessages((prev) => [
              ...prev,
              { role: "system", content: commentContent },
            ]);
            setHistory((prev) =>
              prev.map((h) =>
                h.id === newHistId
                  ? {
                      ...h,
                      messages: [
                        ...prev.find((x) => x.id === newHistId)!.messages,
                        { role: "system", content: commentContent },
                      ],
                    }
                  : h
              )
            );
          }

          // Handle error
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
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsAnalysisLoading(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        if (isAnalysisLoading) {
          console.error("Connection closed before analysis completed");
          setIsAnalysisLoading(false);
        }
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Connection error: ${errorMsg}`);
      setIsAnalysisLoading(false);
    }
  };

  const sendQuestion = async (question: string) => {
    const formData = {
      ...params,
      question,
    } as ParamData & { question: string };

    // Append user message
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setHistory((prev) =>
      prev.map((h) =>
        h.id === selectedHistoryId
          ? {
              ...h,
              messages: [...h.messages, { role: "user", content: question }],
            }
          : h
      )
    );

    await handleFormSubmit(formData);
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
            history={history}
            onSelect={handleHistorySelect}
            selectedId={selectedHistoryId ?? undefined}
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
