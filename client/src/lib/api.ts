// Available models for each provider
const models = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ],
  gemini: [
    { id: 'gemini-pro', name: 'Gemini Pro' },
    { id: 'gemini-ultra', name: 'Gemini Ultra' }
  ],
  deepseek: [
    { id: 'deepseek-coder', name: 'DeepSeek Coder' },
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-r1', name: 'DeepSeek R1' }
  ]
};

// Get models for a specific provider
export function getModelsByProvider(provider: string) {
  return models[provider as keyof typeof models] || [];
}
