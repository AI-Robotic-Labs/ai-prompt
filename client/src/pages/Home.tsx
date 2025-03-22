import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { HelpCircle, Cog, Bot } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import ApiSelector from '@/components/ApiSelector';
import ModelSelector from '@/components/ModelSelector';
import PromptForm from '@/components/PromptForm';
import ResponseContainer from '@/components/ResponseContainer';
import Footer from '@/components/Footer';
import { getModelsByProvider } from '@/lib/api';

export default function Home() {
  const { toast } = useToast();
  const [selectedApi, setSelectedApi] = useState<string>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4');
  const [hasResponse, setHasResponse] = useState<boolean>(false);
  const [responseText, setResponseText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch available models based on selected API
  const { data: availableModels = [] } = useQuery({
    queryKey: ['/api/models', selectedApi],
    queryFn: () => getModelsByProvider(selectedApi),
  });

  // Update selected model when changing API provider
  const handleApiChange = (api: string) => {
    setSelectedApi(api);
    // Reset model to the first available one for this provider
    if (availableModels.length > 0) {
      setSelectedModel(availableModels[0].id);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  // Send prompt to API
  const promptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest('POST', '/api/prompt', {
        provider: selectedApi,
        model: selectedModel,
        prompt,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResponseText(data.response);
      setHasResponse(true);
      setErrorMessage('');
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Failed to get response from the AI provider.');
      toast({
        title: 'Error',
        description: error.message || 'Failed to get response from the AI provider.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmitPrompt = (prompt: string) => {
    setErrorMessage('');
    promptMutation.mutate(prompt);
  };

  const handleRetry = () => {
    setErrorMessage('');
    // The form should still have the prompt, so just trigger the mutation again
    if (promptMutation.variables) {
      promptMutation.mutate(promptMutation.variables);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <Bot className="text-blue-500 mr-2" />
              AI Prompt Interface
            </h1>
            <div className="flex items-center space-x-3">
              <button className="text-gray-500 hover:text-gray-700 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
              <button className="text-gray-500 hover:text-gray-700 transition-colors">
                <Cog className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">Choose an AI provider and send your prompt to get a response</p>
        </header>

        <main>
          {/* API Selector */}
          <ApiSelector selectedApi={selectedApi} onApiChange={handleApiChange} />

          {/* Model Selector */}
          <ModelSelector 
            selectedModel={selectedModel} 
            availableModels={availableModels} 
            onModelChange={handleModelChange} 
          />

          {/* Prompt Form */}
          <PromptForm 
            onSubmit={handleSubmitPrompt} 
            isLoading={promptMutation.isPending} 
          />

          {/* Response Container */}
          <ResponseContainer 
            hasResponse={hasResponse} 
            isLoading={promptMutation.isPending} 
            responseText={responseText} 
            errorMessage={errorMessage}
            currentModel={selectedModel}
            onRetry={handleRetry}
          />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
