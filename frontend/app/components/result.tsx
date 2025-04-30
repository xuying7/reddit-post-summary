import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Assuming shadcn setup
import { useRef } from "react";

// Define the structure based on what your backend sends
interface AnalysisResult {
  question: string;
  subreddit: string;
  keyword: string;
  num_posts_analyzed: number;
  total_comments: number;
  analysis: string | object;
}

interface AnalysisDisplayProps {
  analysisResult: AnalysisResult | null;
  progressMessages?: string[];
  isLoading: boolean; // Optional: To show a loading state
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({
  analysisResult,
  progressMessages = [], // Default to empty array
  isLoading,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Add debugging to see if component receives props
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }

    console.log("AnalysisDisplay rendered with:", {
      hasResult: !!analysisResult,
      resultData: analysisResult,
      messagesCount: progressMessages.length,
      isLoading,
    });
  }, [analysisResult, progressMessages, isLoading]);

  return (
    <Card className="w-full h-full flex flex-col min-h-0">
      {" "}
      {/* Make card take full height of flex item */}
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
        <CardDescription>
          Results from the backend will appear here.
        </CardDescription>
      </CardHeader>
      <CardContent ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {/* Always show progress messages if available */}
        {progressMessages.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-sm text-foreground space-y-1">
              {progressMessages.map((message, index) => (
                <p key={index} className="border-l-2 border-accent pl-2">
                  {message}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Show loading indicator */}
        {isLoading && (
          <p className="text-muted-foreground italic animate-pulse mb-4">
            Processing...
          </p>
        )}

        {/* Show analysis results if available */}
        {analysisResult && !isLoading && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Summary</h3>
              <p>Question: {analysisResult.question}</p>
              <p>Subreddit: r/{analysisResult.subreddit}</p>
              <p>Keyword: {analysisResult.keyword}</p>
              <p>Posts analyzed: {analysisResult.num_posts_analyzed}</p>
              <p>Total comments: {analysisResult.total_comments}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Analysis</h3>
              <pre className="whitespace-pre-wrap text-sm text-foreground">
                {typeof analysisResult.analysis === "string"
                  ? analysisResult.analysis
                  : JSON.stringify(analysisResult.analysis, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Show placeholder when no analysis and not loading */}
        {!analysisResult && !isLoading && progressMessages.length === 0 && (
          <p className="text-muted-foreground italic">
            Submit the form to see the analysis.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisDisplay;
