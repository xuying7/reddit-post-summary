"use client";

import React, { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define the structure of the form data, including new fields
interface FormData {
  subreddit: string;
  keyword: string;
  question: string;
  numberOfPosts: string; // This will be converted to 'limit' when sending to backend
  repeatHours: string;
  repeatMinutes: string;
}

// Define the props for the component (if any are needed later)
interface QueryFormProps {
  onSubmit?: (formData: any) => void;
  setIsLoading?: (isLoading: boolean) => void;
}

const QueryForm: React.FC<QueryFormProps> = ({
  onSubmit,
  setIsLoading: setParentLoading,
}) => {
  // State to hold the form input values, initialized with new fields
  const [formData, setFormData] = useState<FormData>({
    subreddit: "",
    keyword: "",
    question: "",
    numberOfPosts: "10", // Default value for number of posts (must be a string)
    repeatHours: "0",
    repeatMinutes: "0",
  });
  // State to manage loading status during submission
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State to show submission status (success/error)
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Generate options for the Select component (1 to 25)
  const postNumberOptions = Array.from({ length: 25 }, (_, i) =>
    (i + 1).toString()
  );

  // Handle changes in standard input/textarea fields
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    // Prevent negative numbers for hours/minutes
    if (
      (name === "repeatHours" || name === "repeatMinutes") &&
      type === "number"
    ) {
      const numValue = parseInt(value, 10);
      if (numValue < 0) {
        return; // Ignore negative input
      }
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle changes specifically for the Select component
  const handleSelectChange = (value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      numberOfPosts: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (setParentLoading) setParentLoading(true);
    setStatusMessage(null);

    // Convert numeric fields to ensure backend receives what it expects
    const submissionData = {
      ...formData,
      // Convert values to match what the backend expects
      numberOfPosts: formData.numberOfPosts,
      repeatHours: formData.repeatHours,
      repeatMinutes: formData.repeatMinutes,
    };

    console.log("Submitting form data:", submissionData);

    // Call the parent's onSubmit handler if provided
    if (onSubmit) {
      onSubmit(submissionData);
      setIsLoading(false);
      if (setParentLoading) setParentLoading(false);
      return; // Parent will handle everything else
    }

    // Otherwise use regular fetch (fallback for non-SSE behavior)
    try {
      // Send form data to the backend API route
      // Replace '/api/submit' with your actual backend endpoint
      const response = await fetch("http://localhost:8000/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData), // Send potentially converted data
      });

      // Check if the request was successful
      if (!response.ok) {
        // Try to get error message from response body
        let errorMsg = `HTTP error! Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) {
          // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }

      // Handle successful submission
      const result = await response.json(); // Assuming backend sends a JSON response
      console.log("Submission successful:", result);
      setStatusMessage("Form submitted successfully!");
      // Optionally reset the form, including new fields
      // setFormData({
      //   subreddit: '', keyword: '', question: '',
      //   numberOfPosts: '10', repeatHours: '0', repeatMinutes: '0'
      // });
    } catch (error) {
      // Handle errors during submission
      console.error("Submission failed:", error);
      setStatusMessage(
        `Submission failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoading(false);
      if (setParentLoading) setParentLoading(false);
    }
  };

  return (
    // Adjusted Card styling for potentially taller content
    <Card className="w-full max-w-lg mx-auto h-full flex flex-col">
      <CardHeader>
        <CardTitle>Submit Your Query</CardTitle>
        <CardDescription>
          Enter the details below to submit your query to the backend.
        </CardDescription>
      </CardHeader>
      {/* Make form grow to fill card height */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
        {/* Allow content to scroll if needed, and grow */}
        <CardContent className="space-y-4 flex-grow overflow-y-auto">
          {/* Subreddit Input */}
          <div className="space-y-2">
            <Label htmlFor="subreddit">Subreddit</Label>
            <Input
              id="subreddit"
              name="subreddit"
              type="text"
              placeholder="e.g., nextjs"
              value={formData.subreddit}
              onChange={handleChange}
              required
              className="rounded-md"
            />
          </div>

          {/* Keyword Input */}
          <div className="space-y-2">
            <Label htmlFor="keyword">Keyword</Label>
            <Input
              id="keyword"
              name="keyword"
              type="text"
              placeholder="e.g., data fetching"
              value={formData.keyword}
              onChange={handleChange}
              required
              className="rounded-md"
            />
          </div>

          {/* Number of Posts Select */}
          <div className="space-y-2">
            <Label htmlFor="numberOfPosts">
              Number of Posts to Analyze (1-25)
            </Label>
            <Select
              name="numberOfPosts" // Name attribute for potential non-JS form submission
              value={formData.numberOfPosts}
              onValueChange={handleSelectChange} // Use onValueChange for Select
              required
            >
              <SelectTrigger id="numberOfPosts" className="w-full rounded-md">
                <SelectValue placeholder="Select number of posts" />
              </SelectTrigger>
              <SelectContent>
                {postNumberOptions.map((num) => (
                  <SelectItem key={num} value={num}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Repeat Task Interval */}
          <fieldset className="space-y-2 border p-3 rounded-md">
            <legend className="text-sm font-medium px-1">
              Repeat Task After (Optional)
            </legend>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Hours Input */}
              <div className="space-y-1 flex-1">
                <Label htmlFor="repeatHours">Hours</Label>
                <Input
                  id="repeatHours"
                  name="repeatHours"
                  type="number"
                  min="0" // Prevent negative numbers via HTML5 validation
                  placeholder="0"
                  value={formData.repeatHours}
                  onChange={handleChange}
                  className="rounded-md w-full"
                />
              </div>
              {/* Minutes Input */}
              <div className="space-y-1 flex-1">
                <Label htmlFor="repeatMinutes">Minutes</Label>
                <Input
                  id="repeatMinutes"
                  name="repeatMinutes"
                  type="number"
                  min="0" // Prevent negative numbers via HTML5 validation
                  placeholder="0"
                  value={formData.repeatMinutes}
                  onChange={handleChange}
                  className="rounded-md w-full"
                />
              </div>
            </div>
          </fieldset>

          {/* Question Textarea */}
          <div className="space-y-2">
            <Label htmlFor="question">Your Question</Label>
            <Textarea
              id="question"
              name="question"
              placeholder="Enter your question here..."
              value={formData.question}
              onChange={handleChange}
              required
              rows={4}
              className="rounded-md mb-2"
            />
          </div>
        </CardContent>
        {/* Footer sticks to bottom */}
        <CardFooter className="flex flex-col items-start space-y-3 mt-4 border-t pt-4">
          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md"
          >
            {isLoading ? "Submitting..." : "Submit Query"}
          </Button>

          {/* Status Message Area */}
          {statusMessage && (
            <p
              className={`text-sm ${
                statusMessage.includes("failed")
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {statusMessage}
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};

export default QueryForm;
