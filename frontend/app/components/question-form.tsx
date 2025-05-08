import React, { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ParamData } from "./parameter-form";

interface QuestionFormProps {
  params: ParamData; // Current parameters selected
  onSubmit: (data: ParamData & { question: string }) => void;
  isLoading?: boolean;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  params,
  onSubmit,
  isLoading = false,
}) => {
  const [question, setQuestion] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) {
      setStatusMessage("Question cannot be empty");
      return;
    }
    setStatusMessage(null);
    onSubmit({ ...params, question });
    // Optionally reset question
    // setQuestion("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ask a Question</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Your Question</Label>
            <Textarea
              id="question"
              name="question"
              placeholder="Enter your question here..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-3 border-t pt-4">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Submitting..." : "Submit Query"}
          </Button>
          {statusMessage && (
            <p className="text-sm text-red-600">{statusMessage}</p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};

export default QuestionForm;
