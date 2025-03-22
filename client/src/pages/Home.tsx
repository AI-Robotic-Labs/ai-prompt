import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { HelpCircle, Cog, Bot, Info, ShieldCheck, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userSubscription, setUserSubscription] = useState<string>('free');
  const [_, setLocation] = useLocation();
  
  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    
    if (token && userJson) {
      try {
        const userData = JSON.parse(userJson);
        setIsAuthenticated(true);
        if (userData.subscription_tier) {
          setUserSubscription(userData.subscription_tier);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

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

  // Function to handle login/register navigation
  const handleLogin = () => setLocation('/login');
  const handleSignup = () => setLocation('/register');
  const handleUpgrade = () => setLocation('/plans');
  
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
              {isAuthenticated && (
                <div className="flex items-center mr-2">
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                    <ShieldCheck className="mr-1 h-3 w-3" /> {userSubscription.toUpperCase()}
                  </span>
                </div>
              )}
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

        {/* Authentication warning banner */}
        {!isAuthenticated && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start">
            <Info className="text-amber-500 mr-3 mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-medium text-amber-800">Authentication Required</h3>
              <p className="text-amber-700 text-sm mt-1">
                You are currently using the app in guest mode with limited access. 
                Please log in or register to save your history and access premium features.
              </p>
              <div className="flex space-x-3 mt-3">
                <button
                  onClick={handleLogin}
                  className="text-xs bg-transparent hover:bg-amber-500 text-amber-700 font-semibold hover:text-white py-1 px-3 border border-amber-500 hover:border-transparent rounded"
                >
                  Log In
                </button>
                <button
                  onClick={handleSignup}
                  className="text-xs bg-amber-500 hover:bg-amber-700 text-white font-semibold py-1 px-3 border border-transparent rounded"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Subscription upgrade banner */}
        {isAuthenticated && userSubscription === 'free' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
            <Zap className="text-blue-500 mr-3 mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800">Upgrade Your Experience</h3>
              <p className="text-blue-700 text-sm mt-1">
                You're currently on the Free tier with limited requests. Upgrade to access more models,
                increased daily requests, and premium features.
              </p>
              <div className="mt-3">
                <button
                  onClick={handleUpgrade}
                  className="text-xs bg-blue-500 hover:bg-blue-700 text-white font-semibold py-1 px-3 border border-transparent rounded"
                >
                  View Premium Plans
                </button>
              </div>
            </div>
          </div>
        )}

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
