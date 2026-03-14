import React from 'react';
import type { VoiceOption } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceOption;
  setSelectedVoice: (voice: VoiceOption) => void;
  voices: VoiceOption[];
  disabled: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, setSelectedVoice, voices, disabled }) => {
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = voices.find(v => v.id === e.target.value);
    if (voice) {
      setSelectedVoice(voice);
    }
  };

  return (
    <div>
      <label htmlFor="voice-selector" className="block text-sm font-medium text-gray-300 mb-2">
        기본 목소리 톤
      </label>
      <div className="relative">
        <select
          id="voice-selector"
          value={selectedVoice.id}
          onChange={handleSelect}
          disabled={disabled}
          className="block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name} - {voice.description}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
        </div>
      </div>
    </div>
  );
};
