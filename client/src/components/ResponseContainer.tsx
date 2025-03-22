import { useState } from "react";
import { 
  Copy, Download, ThumbsUp, ThumbsDown, 
  MessageSquare, Loader2, AlertTriangle, Bot 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ResponseContainerProps {
  hasResponse: boolean;
  isLoading: boolean;
  responseText: string;
  errorMessage: string;
  currentModel: string;
  onRetry: () => void;
}

export default function ResponseContainer({ 
  hasResponse, 
  isLoading, 
  responseText, 
  errorMessage, 
  currentModel,
  onRetry 
}: ResponseContainerProps) {
  const { toast } = useToast();
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  // Format current date and time
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', options);
  const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const timestamp = `${formattedDate} • ${formattedTime}`;

  // Calculate approximate token count (simple estimate)
  const tokenCount = Math.floor(responseText.length / 4);

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(responseText)
      .then(() => {
        toast({
          title: "Copied!",
          description: "Response copied to clipboard",
          duration: 2000,
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Could not copy to clipboard",
          variant: "destructive",
        });
      });
  };

  const handleDownloadResponse = () => {
    const blob = new Blob([responseText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-response-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Response saved as a text file",
      duration: 2000,
    });
  };

  const handleFeedbackPositive = () => {
    setFeedbackGiven('positive');
    toast({
      title: "Thank you!",
      description: "We appreciate your feedback",
      duration: 2000,
    });
  };

  const handleFeedbackNegative = () => {
    setFeedbackGiven('negative');
    toast({
      title: "Feedback received",
      description: "We'll work to improve our responses",
      duration: 2000,
    });
  };

  // Empty state
  if (!hasResponse && !isLoading && !errorMessage) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 mb-4">
          <MessageSquare className="text-blue-500 text-lg" />
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-1">No Response Yet</h3>
        <p className="text-gray-500">Enter a prompt and click Send to get a response from the AI</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <div>
            <h3 className="font-medium text-gray-800">Generating response...</h3>
            <p className="text-sm text-gray-500">This may take a few seconds</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full max-w-md"></div>
          <div className="mt-3 h-4 bg-gray-200 rounded animate-pulse w-full max-w-sm"></div>
          <div className="mt-3 h-4 bg-gray-200 rounded animate-pulse w-full max-w-lg"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMessage) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="text-red-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-1">Error Processing Request</h3>
            <p className="text-sm text-gray-600 mb-3">{errorMessage}</p>
            <button 
              className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onClick={onRetry}>
              <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M8 16H3v5"></path>
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Response content
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 mr-3">
            <Bot className="text-blue-500 h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">
              Response from <span className="font-semibold">{currentModel}</span>
            </h3>
            <p className="text-xs text-gray-500">{timestamp}</p>
          </div>
        </div>
        <div className="flex space-x-1">
          <button 
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" 
            onClick={handleCopyResponse} 
            title="Copy to clipboard">
            <Copy className="h-4 w-4" />
          </button>
          <button 
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" 
            onClick={handleDownloadResponse} 
            title="Download response">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="p-6 font-normal text-gray-700 whitespace-pre-wrap">
        {responseText}
      </div>
      
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <span>{tokenCount}</span> tokens used
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className={`text-sm ${feedbackGiven === 'positive' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'} flex items-center`}
              onClick={handleFeedbackPositive}>
              <ThumbsUp className="h-4 w-4 mr-1.5" />
              Helpful
            </button>
            <button 
              className={`text-sm ${feedbackGiven === 'negative' ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'} flex items-center`}
              onClick={handleFeedbackNegative}>
              <ThumbsDown className="h-4 w-4 mr-1.5" />
              Not helpful
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
