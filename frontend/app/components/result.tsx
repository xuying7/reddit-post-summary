import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Assuming shadcn setup

interface AnalysisDisplayProps {
  analysisText: string | null; // Prop to receive the text from the backend
  isLoading: boolean; // Optional: To show a loading state
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({
  analysisText,
  isLoading,
}) => {
  return (
    <Card className="w-full h-full flex flex-col">
      {" "}
      {/* Make card take full height of flex item */}
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
        <CardDescription>
          Results from the backend will appear here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {" "}
        {/* Allow content to grow */}
        {isLoading ? (
          <p className="text-muted-foreground italic">Analyzing...</p>
        ) : analysisText ? (
          <pre className="whitespace-pre-wrap text-sm text-foreground">
            {" "}
            {/* Use pre for formatting */}
            {analysisText}
          </pre>
        ) : (
          <p className="text-muted-foreground italic">
            Submit the form to see the analysis.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisDisplay;
