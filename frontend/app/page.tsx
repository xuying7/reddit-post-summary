"use client";

import React, { useEffect, useRef, useState } from "react";
import QueryForm from "./components/form";
import AnalysisDisplay from "./components/result";

// Interface for the final analysis result structure from backend
interface AnalysisResult {
  question: string;
  subreddit: string;
  keyword: string;
  num_posts_analyzed: number;
  total_comments: number;
  analysis: string;
  // Add any other fields your backend result includes
}

interface WebSocketMessage {
  status?: string;
  error?: string;
  results?: AnalysisResult;
}

export default function Home() {
  // State for the final analysis result object
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  // State for streaming progress/status messages
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  // State for loading status
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  // State for WebSocket connection status
  const [isConnected, setIsConnected] = useState<boolean>(false);
  // Ref to hold the WebSocket instance
  const wsRef = useRef<WebSocket | null>(null);

  // Helper function to safely add messages to the progress log
  const addProgressMessage = (message: string) => {
    setProgressMessages((prev) => [...prev, message]);
  };

  // Cleanup function for WebSocket connection
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Function to handle the form submission
  const handleFormSubmit = async (formData: any) => {
    // Reset states
    setIsAnalysisLoading(true);
    setProgressMessages([]);
    setAnalysisResult(null);

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
      };

      // Create a new WebSocket connection
      const ws = new WebSocket("ws://localhost:8000/ws/query");
      wsRef.current = ws;

      // Set up WebSocket event handlers
      ws.onopen = () => {
        setIsConnected(true);
        addProgressMessage("Connected to server");

        // Send the query data once connected
        ws.send(JSON.stringify(queryData));
        addProgressMessage("Query sent to server");
      };

      ws.onmessage = (event) => {
        try {
          console.log("Raw WebSocket message:", event.data);
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log("Parsed data:", data);

          // Handle status updates
          if (data.status && typeof data.status === "string") {
            addProgressMessage(data.status);
            console.log("Status message:", data.status);

            // Explicitly check for "Query completed" status
            if (data.status === "Query completed") {
              setIsAnalysisLoading(false);
            }

            // If results are included in the message, this is the final message
            if (data.results) {
              console.log("Final results received:", data.results);
              setAnalysisResult(data.results);
              setIsAnalysisLoading(false);
            }
          }

          // Handle error messages
          if (data.error && typeof data.error === "string") {
            addProgressMessage(`Error: ${data.error}`);
            setIsAnalysisLoading(false);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          addProgressMessage(`Error parsing message: ${errorMsg}`);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        addProgressMessage("WebSocket error: Connection failed");
        setIsAnalysisLoading(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        if (isAnalysisLoading) {
          addProgressMessage("Connection closed before analysis completed");
          setIsAnalysisLoading(false);
        }
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      addProgressMessage(`Connection error: ${errorMsg}`);
      setIsAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (analysisResult) {
      console.log("Analysis result set, setting loading to false");
      setIsAnalysisLoading(false);
    }
  }, [analysisResult]);

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col h-screen">
      <h1 className="text-3xl font-bold tracking-tight mb-6 text-foreground text-center md:text-left">
        Reddit Analyzer
      </h1>
      <div className="flex flex-col md:flex-row flex-grow gap-6 md:gap-8 overflow-hidden min-h-0">
        <div className="w-full md:w-1/2 flex flex-col overflow-hidden min-h-0">
          <QueryForm onSubmit={handleFormSubmit} setIsLoading={() => {}} />
        </div>
        <div className="w-full md:w-1/2 flex flex-col overflow-hidden min-h-0">
          <AnalysisDisplay
            analysisResult={analysisResult}
            progressMessages={progressMessages}
            isLoading={isAnalysisLoading}
          />
        </div>
      </div>
    </main>
  );
}
