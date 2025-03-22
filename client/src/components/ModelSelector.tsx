import { ChevronDownIcon } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: string;
  availableModels: Array<{ id: string; name: string }>;
  onModelChange: (model: string) => void;
}

export default function ModelSelector({
  selectedModel,
  availableModels,
  onModelChange,
}: ModelSelectorProps) {
  return (
    <div className="mb-6">
      <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
        Model
      </label>
      <div className="relative">
        <select
          id="model"
          name="model"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white border"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
