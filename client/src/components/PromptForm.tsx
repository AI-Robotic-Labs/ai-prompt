import { useState, ChangeEvent } from "react";
import { X, Send } from "lucide-react";

interface PromptFormProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export default function PromptForm({ onSubmit, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const promptCharCount = prompt.length;

  const handlePromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleClearPrompt = () => {
    setPrompt("");
  };

  const handleSendPrompt = () => {
    if (prompt.trim().length === 0 || isLoading) return;
    onSubmit(prompt);
  };

  return (
    <div className="mb-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Your Prompt
          </label>
          <textarea
            id="prompt"
            rows={5}
            value={prompt}
            onChange={handlePromptChange}
            className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            placeholder="Enter your prompt here..."
          />

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <span>{promptCharCount}</span> characters
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleClearPrompt}
                className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1.5" />
                Clear
              </button>
              <button
                onClick={handleSendPrompt}
                className="inline-flex items-center justify-center px-4 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={prompt.trim().length === 0 || isLoading}
              >
                <span>{isLoading ? "Sending" : "Send"}</span>
                <Send className="h-4 w-4 ml-1.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
