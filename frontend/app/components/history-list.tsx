import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface HistoryItem {
  id: string;
  question: string;
  subreddit: string;
  keyword: string;
  messages: import("./chat-window").ChatMessage[];
  timestamp?: string;
}

interface HistoryListProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  selectedId?: HistoryItem["id"];
}

const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onSelect,
  selectedId,
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent className="max-h-60 overflow-y-auto space-y-2">
        {history.length === 0 && (
          <p className="text-muted-foreground italic">No history available.</p>
        )}
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`block w-full text-left p-2 rounded-md hover:bg-muted transition-colors ${
              selectedId === item.id ? "bg-muted" : ""
            }`}
          >
            <span className="font-medium truncate block">{item.question}</span>
            <span className="text-xs text-muted-foreground">
              r/{item.subreddit} | {item.keyword}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
};

export default HistoryList;
