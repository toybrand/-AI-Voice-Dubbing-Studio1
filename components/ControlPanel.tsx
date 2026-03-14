
import React, { useMemo } from 'react';
import { Tabs } from './Tabs';
import { SettingsGroup } from './SettingsGroup';
import { VoiceSelector } from './VoiceSelector';
import { AVAILABLE_VOICES, AGES, GENDERS, EMOTIONS, STYLES, PROFESSIONAL_PRESETS } from '../constants';
import type { VoiceMode, CharacterOptions, ProfessionalOptions, VoiceOption } from '../types';

interface ControlPanelProps {
  voiceMode: VoiceMode;
  setVoiceMode: (mode: VoiceMode) => void;
  characterOptions: CharacterOptions;
  setCharacterOptions: (options: CharacterOptions) => void;
  professionalOptions: ProfessionalOptions;
  setProfessionalOptions: (options: ProfessionalOptions) => void;
  selectedVoice: VoiceOption;
  setSelectedVoice: (voice: VoiceOption) => void;
  isLoading: boolean;
  onReset: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const {
    voiceMode, setVoiceMode,
    characterOptions, setCharacterOptions,
    professionalOptions, setProfessionalOptions,
    selectedVoice, setSelectedVoice,
    isLoading, onReset
  } = props;

  const handleCharacterChange = (field: keyof CharacterOptions, value: string) => {
    setCharacterOptions({ ...characterOptions, [field]: value });
  };
  
  const handleProfessionalChange = (field: keyof ProfessionalOptions, value: string) => {
    setProfessionalOptions({ ...professionalOptions, [field]: value });
  };

  const filteredVoices = useMemo(() => {
    const currentGender = voiceMode === 'character' ? characterOptions.gender : professionalOptions.gender;
    const isChild = voiceMode === 'character' && (characterOptions.age === '유아' || characterOptions.age === '어린이');

    // 어린이나 유아인 경우, 성별과 관계없이 모든 목소리를(특히 여성 목소리를 남자 아이에게 사용 가능하도록) 보여줌
    // 또는 중성 목소리 선택 시
    if (currentGender === '중성' || isChild) {
      return AVAILABLE_VOICES;
    }
    
    // 그 외 성인 등은 성별에 맞춰 필터링 + 중성(Puck) 포함
    return AVAILABLE_VOICES.filter(voice => voice.gender === currentGender || voice.gender === '중성');
  }, [voiceMode, characterOptions.gender, professionalOptions.gender, characterOptions.age]);


  return (
    <div className="bg-gray-800/50 p-6 rounded-2xl space-y-6 border border-gray-700 h-full flex flex-col">
      <Tabs
        activeTab={voiceMode}
        onTabClick={(tab) => setVoiceMode(tab as VoiceMode)}
        tabs={[
          { id: 'character', label: '🎭 캐릭터 더빙' },
          { id: 'professional', label: '🎙️ 전문 성우' },
        ]}
        disabled={isLoading}
      />

      <div className="flex-grow">
        {voiceMode === 'character' && (
          <div className="space-y-4 animate-fade-in">
            <SettingsGroup
              label="연령대"
              value={characterOptions.age}
              onChange={(e) => handleCharacterChange('age', e.target.value)}
              options={AGES}
              disabled={isLoading}
            />
            <SettingsGroup
              label="성별"
              value={characterOptions.gender}
              onChange={(e) => handleCharacterChange('gender', e.target.value)}
              options={GENDERS}
              disabled={isLoading}
            />
            <SettingsGroup
              label="감정 표현"
              value={characterOptions.emotion}
              onChange={(e) => handleCharacterChange('emotion', e.target.value)}
              options={EMOTIONS}
              disabled={isLoading}
            />
            <SettingsGroup
              label="캐릭터 스타일"
              value={characterOptions.style}
              onChange={(e) => handleCharacterChange('style', e.target.value)}
              options={STYLES}
              disabled={isLoading}
            />
          </div>
        )}

        {voiceMode === 'professional' && (
          <div className="space-y-4 animate-fade-in">
            <SettingsGroup
              label="직업 기반 프리셋"
              value={professionalOptions.preset}
              onChange={(e) => handleProfessionalChange('preset', e.target.value)}
              options={PROFESSIONAL_PRESETS}
              disabled={isLoading}
            />
             <SettingsGroup
              label="성별"
              value={professionalOptions.gender}
              onChange={(e) => handleProfessionalChange('gender', e.target.value)}
              options={GENDERS.filter(g => g !== '중성')} // Professional voices are not neutral
              disabled={isLoading}
            />
          </div>
        )}
      </div>
      
      <div className="pt-4 border-t border-gray-700 space-y-4">
        <VoiceSelector
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            voices={filteredVoices}
            disabled={isLoading}
        />
        <button
          onClick={onReset}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          초기화 적용
        </button>
      </div>
    </div>
  );
};
