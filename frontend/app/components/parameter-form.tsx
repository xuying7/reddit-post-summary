import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Types for parameter data (without the question)
export interface ParamData {
  subreddit: string;
  keyword: string;
  numberOfPosts: string;
  repeatHours: string;
  repeatMinutes: string;
  sortOrder: string;
}

interface ParameterFormProps {
  params: ParamData;
  onParamsChange: (newParams: ParamData) => void;
}

const ParameterForm: React.FC<ParameterFormProps> = ({
  params,
  onParamsChange,
}) => {
  // Local state mirrors parent but allows isolated updates
  const [localParams, setLocalParams] = useState<ParamData>(params);

  // Sync local changes upward whenever they change
  useEffect(() => {
    onParamsChange(localParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localParams]);

  // Generate options for number of posts
  const postNumberOptions = Array.from({ length: 25 }, (_, i) =>
    (i + 1).toString()
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Prevent negative numbers for repeat fields
    if (name === "repeatHours" || name === "repeatMinutes") {
      if (parseInt(value, 10) < 0) return;
    }

    setLocalParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleSortOrderChange = (value: string) => {
    onParamsChange({ ...params, sortOrder: value });
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>Parameters</CardTitle>
        <CardDescription>
          Configure the parameters for the Reddit analysis.
        </CardDescription>
      </CardHeader>
      <form className="flex flex-col flex-grow">
        <CardContent className="space-y-4 flex-grow overflow-y-auto">
          {/* Subreddit */}
          <div className="space-y-2">
            <Label htmlFor="subreddit">Subreddit</Label>
            <Input
              id="subreddit"
              name="subreddit"
              value={localParams.subreddit}
              onChange={handleChange}
              placeholder="e.g., nextjs"
              required
            />
          </div>

          {/* Keyword */}
          <div className="space-y-2">
            <Label htmlFor="keyword">Keyword</Label>
            <Input
              id="keyword"
              name="keyword"
              value={localParams.keyword}
              onChange={handleChange}
              placeholder="e.g., data fetching"
              required
            />
          </div>

          {/* Number of Posts */}
          <div className="space-y-2">
            <Label htmlFor="numberOfPosts">Number of Posts (1-25)</Label>
            <Select
              value={localParams.numberOfPosts}
              onValueChange={(val) =>
                setLocalParams((prev) => ({ ...prev, numberOfPosts: val }))
              }
            >
              <SelectTrigger id="numberOfPosts">
                <SelectValue placeholder="Select number" />
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

          {/* Sort Order Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="sortOrder">Sort by</Label>
            <Select
              value={params.sortOrder}
              onValueChange={handleSortOrderChange}
            >
              <SelectTrigger id="sortOrder">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">Hottest</SelectItem>
                <SelectItem value="new">Newest</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
                {/* Add other sort options here if needed */}
              </SelectContent>
            </Select>
          </div>

          {/* Repeat Interval */}
          <fieldset className="space-y-2 border p-3 rounded-md">
            <legend className="text-sm font-medium px-1">
              Repeat Task After (Optional)
            </legend>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="repeatHours">Hours</Label>
                <Input
                  id="repeatHours"
                  name="repeatHours"
                  type="number"
                  min="0"
                  value={localParams.repeatHours}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label htmlFor="repeatMinutes">Minutes</Label>
                <Input
                  id="repeatMinutes"
                  name="repeatMinutes"
                  type="number"
                  min="0"
                  value={localParams.repeatMinutes}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
            </div>
          </fieldset>
        </CardContent>
      </form>
    </Card>
  );
};

export default ParameterForm;
