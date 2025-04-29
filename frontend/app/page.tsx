"use client"; // Required for useState hook

import React, { useState } from "react";
// Using user's provided import paths
import QueryForm from "./components/form";
import AnalysisDisplay from "./components/result";
// Note: Removed unused 'next/image' import for clarity

export default function Home() {
  // State to hold the analysis result from the backend
  // This will be updated by your form submission logic or SSE connection
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  // State to manage loading status during analysis
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);

  // --- Placeholder for Form Submission / SSE Update Logic ---
  // Your logic to handle form submission (likely within QueryForm or here)
  // or to listen for SSE messages would update the state:
  // Example:
  // const handleFormSubmit = async (formData) => {
  //   setIsAnalysisLoading(true);
  //   // ... fetch request ...
  //   const result = await response.json();
  //   setAnalysisResult(result.analysis); // Assuming result structure
  //   setIsAnalysisLoading(false);
  // }
  // Or an SSE listener:
  // eventSource.onmessage = (event) => {
  //   setAnalysisResult(prev => prev + event.data); // Append data, for example
  //   setIsAnalysisLoading(false); // Or manage loading differently for streams
  // };
  // --- End Placeholder ---

  return (
    // Make the main container a flex column to ensure footer (if any) stays down
    // Use min-h-screen to ensure it takes at least the full viewport height
    <main className="container mx-auto p-4 md:p-8 flex flex-col min-h-screen">
      {/* Page Title */}
      <h1 className="text-3xl font-bold tracking-tight mb-6 text-foreground text-center md:text-left">
        Reddit Analyzer
      </h1>

      {/* Flex Container for Form and Analysis */}
      {/* flex-grow allows this container to take up available vertical space */}
      {/* Stacks vertically on mobile (flex-col), side-by-side on medium screens+ (md:flex-row) */}
      <div className="flex flex-col md:flex-row flex-grow gap-6 md:gap-8">
        {/* Form Section - takes half width on medium screens+ */}
        <div className="w-full md:w-1/2">
          {/*
             You might need to pass props to QueryForm if it needs to
             trigger state updates in this parent component (e.g., set loading state)
             Example: <QueryForm setIsLoading={setIsAnalysisLoading} setResult={setAnalysisResult} />
           */}
          <QueryForm />
        </div>

        {/* Analysis Display Section - takes half width on medium screens+ */}
        <div className="w-full md:w-1/2">
          <AnalysisDisplay
            analysisText={analysisResult}
            isLoading={isAnalysisLoading}
          />
        </div>
      </div>
    </main>
    // Removed the outer redundant div from user's code
  );
}
