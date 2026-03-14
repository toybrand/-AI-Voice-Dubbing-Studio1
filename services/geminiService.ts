import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from '../utils/audioUtils';
import { PersonaSettings, CastMember } from "../types";
import { AVAILABLE_VOICES } from "../constants";

/**
 * localStorage에서 API 키를 가져옵니다.
 */
function getApiKey(): string {
  const key = localStorage.getItem('gemini_api_key');
  if (!key) {
    throw new Error('API 키가 설정되지 않았습니다. 상단의 "API Key 설정" 버튼을 눌러 키를 입력해주세요.');
  }
  return key;
}

/**
 * 음성 합성 시 괄호 내용을 읽지 않도록 최종 텍스트를 정리합니다.
 */
function filterParentheses(text: string): string {
  return text.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 텍스트를 특정 사투리로 자연스럽게 변환합니다.
 */
export async function transformTextToDialect(text: string, dialect: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `
[SYSTEM: PROFESSIONAL LINGUIST & DIALECT EXPERT]
Translate the following Korean text into the natural "${dialect}" dialect.

STRICT RULES:
1. DO NOT add any new acting tags, emotion tags, stage directions, or text in parentheses (e.g., (머쓱해하며), (속삭임), (하하) 등).
2. If the input already contains acting tags, preserve them exactly in their original positions.
3. Only transform the spoken sentences.
4. Return ONLY the transformed text. Do not include any preamble or extra notes.

TEXT TO TRANSLATE:
`.trim();

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: prompt + "\n" + text }] }],
  });

  return response.text?.trim() || text;
}

/**
 * 텍스트를 아주 어린 아기 말투(유아 언어)로 변환합니다.
 */
export async function transformToInfantLanguage(text: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `
[SYSTEM: 3-YEAR-OLD INFANT BABBLING SPECIALIST]
Convert the following text into a 3-year-old child's adorable voice. 

STRICT RULES:
1. DO NOT add any new acting tags, emotion tags, stage directions, or text in parentheses (e.g., (머쓱해하며), (속삭임) 등). ONLY change the spoken text.
2. DO NOT insert ".." between every single syllable. It must sound natural and context-aware.
3. Insert ".." intermittently between syllables or words at natural breaks to create a cute, hesitant, and stuttering effect. 
   Example: "엄마 나 젤리 먹고 싶어요" -> "엄..마아.. 나.. 쩰리.. 머꼬.. 시포요.."
   Example: "이거 진짜 맛있어요" -> "이..꼬.. 찐..짜.. 마싯떠요.."
4. If the input already contains acting tags like (속삭임), keep them exactly in place.
5. Return ONLY the transformed text. Do not include any preamble or extra notes.

TEXT TO TRANSFORM:
`.trim();

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: prompt + "\n" + text }] }],
  });

  return response.text?.trim() || text;
}

/**
 * 변환된 텍스트와 스타일 지침을 기반으로 음성을 생성합니다.
 */
export async function generateSpeechFromTransformed(
  text: string,
  voiceId: string,
  pitch: number,
  speed: number,
  styleInstruction: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const voiceInfo = AVAILABLE_VOICES.find(v => v.id.toLowerCase() === voiceId.toLowerCase());
  const apiVoiceName = voiceInfo?.apiVoiceName || 'Kore';

  const isInfant = styleInstruction.includes("Tiny Fairy") || styleInstruction.includes("Baby") || styleInstruction.includes("유아");
  const isAge8Child = styleInstruction.includes("Age 8") || styleInstruction.includes("excited elementary school student") || styleInstruction.includes("어린이");
  const isElderly = styleInstruction.includes("Elderly Senior") || styleInstruction.includes("Age 75+") || styleInstruction.includes("노년");
  
  const fullPrompt = `
[SYSTEM: MASTER VOICE ACTOR - MULTI-EMOTIONAL STATE MACHINE]
You are a top-tier voice actor. Your performance is driven by inline emotional tags that act as PERMANENT MODE SWITCHES.

[CHARACTER SETTINGS]
${isInfant ? "- Role: 3-Year-Old Baby. Vocal Texture: Helium/High, Mushy. Intermittent stuttering marked by '..' is natural." 
: isAge8Child ? "- Role: Energetic 8-year-old. Tone: Bright, rising intonation."
: isElderly ? "- Role: Elderly Senior. Texture: Gravelly, slow, frail."
: "- Role: Professional Speaker. Base Pitch: ${pitch}, Speed: ${speed}."}

[KOREAN ACTING TAGS - THE COMMANDS]
When you see these tags, you MUST change your vocal mode INSTANTLY and HOLD that mode until a new tag appears or the script ends.

- (속삭임): Switch to WHISPER state. Breathy, intimate, no vocal cord vibration, 10% volume.
- (흐느끼며): Switch to SOBBING state. Tearful voice, heavy breathing, sorrowful, voice slightly breaking.
- (더듬거림): Switch to STUTTER state. Hesitant, repeating first syllables, unstable rhythm.
- (외침): Switch to SHOUT state. Maximum projection, high energy, loud.
- (한숨): Perform a heavy sigh, then continue in a WEARY/TIRED tone.
- (하하): Laugh naturally, then continue in a JOYFUL/BRIGHT tone.
- (중얼거림): Switch to MUMBLING state. Low volume, poor articulation, self-talking vibe.
- (흥분해서): Switch to EXCITED state. Fast tempo, high pitch variance, high energy.

[STRICT STATE PERSISTENCE RULES]
1. DO NOT READ TAGS: Never speak the words inside "(...)" or "[...]". They are silent triggers for your voice mode.
2. NO RESET ON PUNCTUATION: Do NOT return to a normal voice after a period (.) or comma (,). If you were in "흐느끼며" mode, you MUST keep crying and sobbing even after the sentence ends, until the next tag appears.
3. IMMEDIATE TRANSITION: Between Tag 1 and Tag 2, there must be a sharp and clear shift in vocal texture.
4. EXAMPLE: "안녕하세요. (흐느끼며) 배가 고파요. (속삭임) 조용히 해." -> '안녕하세요' (Normal) -> '배가 고파요' (Sobbing Mode) -> '조용히 해' (Whisper Mode).

[SCRIPT TO PERFORM]
"${text}"

Perform this script as a continuous, state-driven emotional journey. Follow every tag to the letter.
  `.trim();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: fullPrompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { 
          prebuiltVoiceConfig: {
            voiceName: apiVoiceName as any,
          }
        }
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  const base64Audio = part?.inlineData?.data;

  if (!base64Audio) {
    throw new Error(`Audio generation failed.`);
  }

  const audioBytes = decode(base64Audio);
  return await decodeAudioData(audioBytes, audioContext, 24000, 1);
}

/**
 * 사용자의 성별/나이/지역 설정에 가장 적합한 성우를 정적으로 반환합니다.
 */
export function getStaticRecommendation(persona: PersonaSettings, styleId: string): {id: string, pitch: number, speed: number} {
  if (persona.age === '유아') return { id: 'leda', pitch: 3, speed: 0.8 }; 
  if (persona.age === '어린이') {
    if (persona.gender === '여성') return { id: 'leda', pitch: 2, speed: 1.1 };
    return { id: 'puck', pitch: 2, speed: 1.1 };
  }
  if (persona.age === '청년') {
    if (persona.gender === '여성') return { id: 'aoede', pitch: 0, speed: 1.1 };
    return { id: 'puck', pitch: 0, speed: 1.1 };
  }
  if (persona.age === '중년') {
    if (persona.gender === '여성') return { id: 'kore', pitch: -1, speed: 0.95 };
    return { id: 'orus', pitch: -1, speed: 0.95 };
  }
  if (persona.age === '노년') {
    if (persona.gender === '여성') return { id: 'kore', pitch: 0, speed: 0.8 };
    return { id: 'charon', pitch: -1, speed: 0.8 };
  }
  return persona.gender === '남성' ? { id: 'orus', pitch: 0, speed: 1.0 } : { id: 'kore', pitch: 0, speed: 1.0 };
}

/**
 * 샘플 대본 미리보기 생성
 */
export async function generatePreviewSpeech(
  voiceId: string,
  member: Partial<CastMember>,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  let text = `안녕하세요, 성우입니다.`;
  if (member.styleInstruction) {
    const sampleMatch = member.styleInstruction.match(/\[샘플 대본\]\s*:\s*([\s\S]+)$/i);
    if (sampleMatch && sampleMatch[1].trim()) {
      text = sampleMatch[1].trim(); 
    }
  }
  const pitch = member.pitch ?? 0;
  const speed = member.speed ?? 1.0;
  const styleInstruction = member.styleInstruction || "";
  return await generateSpeechFromTransformed(text, voiceId, pitch, speed, styleInstruction, audioContext);
}
