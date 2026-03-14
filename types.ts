
export interface VoiceOption {
  id: string;
  apiVoiceName: string;
  name: string;
  description: string;
  characteristics: string; // 음향적 특징 (예: Mid-High)
  optimalAge: string;      // 권장 연령대 (예: 20~30대)
  gender: string;
  defaultPitch?: number;
}

export interface ActorProfile {
  id: string; // voiceId + settings hash
  displayName: string; // 성우 이름 + 설정 요약
  voiceId: string;
  pitch: number;
  speed: number;
  styleInstruction: string;
  persona: PersonaSettings;
}

export interface CastMember {
  id: string;
  voiceId: string;
  pitch: number;
  speed: number;
  analysis?: string;
  styleInstruction?: string;
  dialect?: string;
  age?: string; // 캐릭터의 연령대 정보 추가
  actorId?: string; // 선택된 ActorProfile의 고유 ID
}

export interface ScriptSegment {
  speaker: string;
  text: string;
  segmentStyle?: string; // 단락별 별도 연기 지침 저장
}

export type CastMap = Record<string, CastMember>;

export type PlatformType = '유튜브' | '인스타' | '쇼츠/릴스' | '기타';

export interface PersonaSettings {
  gender: string;
  age: string;
  dialect: string;
  customStyle?: string; 
}

export interface EmotionSettings {
  primary: string;
  intensity: string;
  detail: string;
}

export interface AppState {
  step: number;
  platform: PlatformType;
  genre: string;
  persona: PersonaSettings;
  emotion: EmotionSettings;
  script: string;
  transformedScript: string;
}

export type VoiceMode = 'character' | 'professional';

export interface CharacterOptions {
  age: string;
  gender: string;
  emotion: string;
  style: string;
}

export interface ProfessionalOptions {
  preset: string;
  gender: string;
}
