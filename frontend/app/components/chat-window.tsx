import React, { useRef, useEffect, useState, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  postUrls?: string[];
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend: (question: string) => void;
  isLoading?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSend,
  isLoading = false,
}) => {
  const [input, setInput] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = scrollRef.current;
    if (div) {
      div.scrollTop = div.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    onSend(question);
    setInput("");
  };

  return (
    <Card className="w-full h-full flex flex-col min-h-0">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground italic">
            Ask a question to start.
          </p>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="space-y-1 mb-3">
            <div
              className={`whitespace-pre-wrap ${
                msg.role === "user"
                  ? "font-medium text-foreground text-right"
                  : msg.role === "assistant"
                  ? "prose prose-sm dark:prose-invert max-w-none"
                  : "text-xs text-muted-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "assistant" &&
              msg.postUrls &&
              msg.postUrls.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Sources:
                  </p>
                  <ul className="list-disc list-inside pl-4 space-y-1">
                    {msg.postUrls.map((url, urlIdx) => (
                      <li key={urlIdx} className="text-xs">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        ))}
        {isLoading && (
          <p className="text-muted-foreground italic animate-pulse">
            Thinking...
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 w-full">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            rows={2}
            className="flex-1 resize-none"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatWindow;
