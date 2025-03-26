import { useState } from "react";
import { FaRobot, FaCode } from "react-icons/fa";
import { SiOpenai, SiGoogle } from "react-icons/si";

interface ApiSelectorProps {
  selectedApi: string;
  onApiChange: (api: string) => void;
}

export default function ApiSelector({ selectedApi, onApiChange }: ApiSelectorProps) {
  const apiProviders = [
    { id: "openai", name: "OpenAI", icon: <SiOpenai className="w-5 h-5 mr-2" /> },
    { id: "gemini", name: "Gemini", icon: <SiGoogle className="w-5 h-5 mr-2" /> },
    { id: "deepseek", name: "DeepSeek", icon: <FaCode className="w-5 h-5 mr-2" /> },
  ];

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {apiProviders.map((provider) => (
            <button
              key={provider.id}
              data-provider={provider.id}
              className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${
                selectedApi === provider.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => onApiChange(provider.id)}
            >
              <div className="flex items-center">
                {provider.icon}
                <span>{provider.name}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
