import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { generateSpeechFromTransformed, generatePreviewSpeech, getStaticRecommendation, transformTextToDialect, transformToInfantLanguage } from './services/geminiService';
import { pcmToWav } from './utils/audioUtils';
import { parseScript } from './utils/scriptParser';
import { AVAILABLE_VOICES, MEDIA_STYLES, PURPOSE_STYLES, DIALECTS, AGES, ACTING_TAGS, PRESET_CATEGORIES, INFANT_DIALECT_TEMPLATES, CHILD_DIALECT_TEMPLATES, DIALECT_FIXED_SAMPLES, GENRE_SAMPLES } from './constants';
import type { PersonaSettings, CastMap, ScriptSegment, ActorProfile, CastMember } from './types';
import { TextAreaInput } from './components/TextAreaInput';

interface PreviewAudioStore {
  url: string;
  blob: Blob;
  settingsKey: string; 
  textHash: string; 
  timestamp: number; 
}

interface SegmentState {
  text: string;
  style: string;
}

interface LocalHistory {
  states: SegmentState[];
  pointer: number;
}

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1); 
  const [selectedStyleId, setSelectedStyleId] = useState('shorts');
  const [hasApiKey, setHasApiKey] = useState(!!localStorage.getItem('gemini_api_key'));
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('gemini_api_key') || '');
  const [isAddingFromStep4, setIsAddingFromStep4] = useState(false); 
  
  const [persona, setPersona] = useState<PersonaSettings>({ gender: '여성', age: '청년', dialect: '표준어', customStyle: '' });
  const [aiRecommendation, setAiRecommendation] = useState<{id: string, pitch: number, speed: number} | null>(null);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null); 
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null); 
  const [myActors, setMyActors] = useState<ActorProfile[]>([]);
  
  const [previewCache, setPreviewCache] = useState<Record<string, PreviewAudioStore>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [transformingIdx, setTransformingIdx] = useState<number | null>(null); 
  const [isBulkTransforming, setIsBulkTransforming] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textAreaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number>(0);
  const [voiceSettings, setVoiceSettings] = useState<Record<string, { pitch: number, speed: number }>>({});

  const [script, setScript] = useState("");
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [cast, setCast] = useState<CastMap>({});
  
  const [segmentHistories, setSegmentHistories] = useState<LocalHistory[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const activeSegment = segments[selectedSegmentIdx];
  const activeSpeakerCast = activeSegment ? cast[activeSegment.speaker] : null;

  const handleStopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
  }, []);

  const handleSetStep = (newStep: number) => {
    handleStopPlayback();
    setStep(newStep);
    if (newStep > maxStep) setMaxStep(newStep);
  };

  const handleReset = () => {
    handleStopPlayback();
    setStep(1);
    setMaxStep(1);
    setSelectedStyleId('shorts');
    setPersona({ gender: '여성', age: '청년', dialect: '표준어', customStyle: '' });
    setAiRecommendation(null);
    setActiveVoiceId(null);
    setActiveVariantId(null);
    setMyActors([]);
    setScript("");
    setSegments([]);
    setSpeakers([]);
    setCast({});
    setPreviewCache({});
    setVoiceSettings({});
    setGeneratingId(null);
    setPlayingId(null);
    setTransformingIdx(null);
    setIsLoading(false);
    setIsAddingFromStep4(false);
    setSegmentHistories([]);
    textAreaRefs.current = [];
    setSelectedSegmentIdx(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenKeySelector = () => {
    setShowApiKeyModal(true);
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      setHasApiKey(true);
      setShowApiKeyModal(false);
    }
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKeyInput('');
    setHasApiKey(false);
    setShowApiKeyModal(false);
  };

  const getVoiceTheme = (voiceId: string) => {
    const voice = AVAILABLE_VOICES.find(v => v.id === voiceId);
    if (!voice) return { icon: '👤', bg: 'bg-gray-100', text: 'text-gray-400', label: '기본' };
    switch(voice.gender) {
      case '여성': return { icon: '👩', bg: 'bg-pink-50', text: 'text-pink-500', label: '여성' };
      case '남성': return { icon: '👨', bg: 'bg-blue-50', text: 'text-blue-500', label: '남성' };
      case '중성': return { icon: '🧒', bg: 'bg-amber-50', text: 'text-amber-500', label: '중성' };
      default: return { icon: '👤', bg: 'bg-gray-50', text: 'text-gray-400', label: '기타' };
    }
  };

  const toggleActorSelection = (voiceId: string, dialectOverride?: string) => {
    const isStandard = !dialectOverride || dialectOverride === '표준어';
    const settingsKey = isStandard ? voiceId : `${voiceId}_${dialectOverride}`;
    const settings = voiceSettings[settingsKey] || { pitch: 0, speed: 1.0 };
    const targetDialect = dialectOverride || persona.dialect;
    const actorId = `${voiceId}_${settings.pitch}_${settings.speed}_${targetDialect}_${persona.age}`;
    
    if (myActors.find(a => a.id === actorId)) {
      setMyActors(myActors.filter(a => a.id !== actorId));
    } else {
      const voiceInfo = AVAILABLE_VOICES.find(v => v.id === voiceId);
      const voiceBaseName = voiceInfo?.name.split(' (')[0] || voiceId;
      const dialectLabel = `(${targetDialect})`;
      const ageLabel = `(${persona.age})`;
      
      const newActor: ActorProfile = {
        id: actorId,
        displayName: `${voiceBaseName} ${dialectLabel} ${ageLabel}`,
        voiceId: voiceId,
        pitch: settings.pitch,
        speed: settings.speed,
        styleInstruction: persona.customStyle || "",
        persona: { ...persona, dialect: targetDialect }
      };
      setMyActors([...myActors, newActor]);
    }
  };

  const getAgeInstruction = (age: string, gender: string) => {
    switch(age) {
      case '유아': 
        return `Role: 3-year-old Baby / Tiny Fairy. [Audio Texture] Pitch: High, Thin, Helium-like (+50%). Articulation: "Baby Lisp". Legato flow. Slur the words together.`;
      case '어린이': 
        return `Role: Energetic Child (Age 8). [Vocal Characteristics] Tone: Bright, Clear, High Energy. Pitch: Slightly higher (+10~20%). Rhythm: Fast (Speed 1.1x) and bouncy.`;
      case '청년':
        return `Role: Trendy Young Adult (Age 20s). [Vocal Style] Tone: Fresh, Confident, Dynamic. Pitch: Natural Middle-High. Speed: 1.1x.`;
      case '중년':
        return `Role: Middle-aged Adult (Age 45). [Vocal Physics] Tone: Deep, Resonant, Warm. Pitch: Low to Mid-Low. Speed: 0.9x ~ 1.0x.`;
      case '노년':
        return `Role: Elderly Senior (Age 75+). [Vocal Aging] Texture: Gravelly, Scratchy. Pitch: Low and rumbly. Speed: Very Slow (0.75x ~ 0.85x).`;
      default: return `Speak in a clear, ${gender === '여성' ? 'feminine' : 'masculine'} and standard voice.`;
    }
  };

  useEffect(() => {
    const updateStyle = async () => {
      const recommendation = getStaticRecommendation(persona, selectedStyleId);
      setAiRecommendation(recommendation);
      setActiveVoiceId(recommendation.id);
      setActiveVariantId(null);
      
      const initSettings: Record<string, { pitch: number, speed: number }> = {};
      AVAILABLE_VOICES.forEach(v => {
        const isRec = v.id === recommendation.id;
        initSettings[v.id] = isRec 
          ? { pitch: recommendation.pitch, speed: recommendation.speed } 
          : { pitch: 0, speed: 1.0 };
        DIALECTS.forEach(d => {
           if (d !== '표준어') {
             initSettings[`${v.id}_${d}`] = isRec 
               ? { pitch: recommendation.pitch, speed: recommendation.speed } 
               : { pitch: 0, speed: 1.0 };
           }
        });
      });
      setVoiceSettings(initSettings);

      const ageInst = getAgeInstruction(persona.age, persona.gender);
      
      let newStyle = "";
      if (persona.age === '유아') {
        newStyle = INFANT_DIALECT_TEMPLATES[persona.dialect] || INFANT_DIALECT_TEMPLATES['표준어'];
      } else if (persona.age === '어린이') {
        newStyle = CHILD_DIALECT_TEMPLATES[persona.dialect] || CHILD_DIALECT_TEMPLATES['표준어'];
      } else {
        let sampleText = "";
        if (persona.dialect !== '표준어' && DIALECT_FIXED_SAMPLES[persona.dialect]) {
          sampleText = DIALECT_FIXED_SAMPLES[persona.dialect];
        } else {
          sampleText = (GENRE_SAMPLES[selectedStyleId]?.[persona.dialect] || GENRE_SAMPLES[selectedStyleId]?.['표준어'] || "").replace(/^[^:]+:\s*/, '');
        }
        
        newStyle = `[지시어]: ${ageInst}
[Vocal Style]
- Tone: Fresh, Confident, Dynamic.
- Pitch: Natural Middle-High.
- Speed: 1.1x.
- Articulation: Sharp and Clean.

[Performance Direction]
- Vibe: Like a popular creator.
- Intonation: End sentences cleanly.
- Emotion: Passionate and sincere.

[샘플 대본]: ${sampleText}`;
      }

      setPersona(prev => ({ ...prev, customStyle: newStyle }));
      handleStopPlayback(); 
    };
    updateStyle();
  }, [selectedStyleId, persona.gender, persona.age, persona.dialect, handleStopPlayback]);
    const filteredVoices = useMemo(() => {
    let baseList = [];
    if (persona.age === '유아') {
      const kidVoiceIds = ['zephyr', 'leda', 'laomedeia', 'achernar'];
      baseList = AVAILABLE_VOICES.filter(v => 
        kidVoiceIds.includes(v.id.toLowerCase()) && 
        (v.gender === persona.gender || v.gender === '중성')
      );
    } else if (persona.age === '어린이') {
      const kidVoiceIds = ['leda', 'aoede', 'kore', 'puck', 'zephyr', 'orus'];
      baseList = AVAILABLE_VOICES.filter(v => 
        kidVoiceIds.includes(v.id.toLowerCase()) && 
        (v.gender === persona.gender || v.gender === '중성')
      );
    } else {
      baseList = AVAILABLE_VOICES.filter(v => v.gender === persona.gender || v.gender === '중성');
    }

    if (aiRecommendation) {
      return [...baseList].sort((a, b) => {
        if (a.id === aiRecommendation.id) return -1;
        if (b.id === aiRecommendation.id) return 1;
        return 0;
      });
    }
    return baseList;
  }, [persona.age, persona.gender, aiRecommendation]);

  const pushToSegmentHistory = useCallback((idx: number, text: string, style: string) => {
    setSegmentHistories(prev => {
      const newHistories = [...prev];
      if (!newHistories[idx]) {
        newHistories[idx] = { states: [], pointer: -1 };
      }
      const history = { ...newHistories[idx] };
      const newStates = history.states.slice(0, history.pointer + 1);
      newStates.push({ text, style });
      history.states = newStates;
      history.pointer = newStates.length - 1;
      newHistories[idx] = history;
      return newHistories;
    });
  }, []);

  const handleUndo = useCallback((idx: number) => {
    setSegmentHistories(prev => {
      const newHistories = [...prev];
      if (!newHistories[idx]) return newHistories;
      const history = { ...newHistories[idx] };
      if (history.pointer > 0) {
        history.pointer -= 1;
        const prevState = history.states[history.pointer];
        setSegments(segs => {
          const nextSegs = [...segs];
          nextSegs[idx] = { ...nextSegs[idx], text: prevState.text, segmentStyle: prevState.style };
          return nextSegs;
        });
      }
      newHistories[idx] = history;
      return newHistories;
    });
  }, []);

  const handleGeneratePreview = async (voiceId: string, specificIdx?: number, forceSidebarStyle?: boolean, isVariant?: boolean) => {
    handleStopPlayback(); 
    
    const targetIdx = specificIdx !== undefined ? specificIdx : selectedSegmentIdx;
    const baseKey = isVariant ? `${voiceId}-variant` : voiceId;
    const cacheSlotKey = forceSidebarStyle ? `SIDEBAR-seg-${targetIdx}` : (step === 4 ? `${baseKey}-seg-${targetIdx}` : baseKey);
    
    if (isVariant) {
      setActiveVariantId(voiceId);
      setActiveVoiceId(null);
    } else {
      setActiveVoiceId(voiceId);
      setActiveVariantId(null);
    }

    const settingsKey = isVariant ? `${voiceId}_${persona.dialect}` : voiceId;
    const currentSettings = voiceSettings[settingsKey] || { pitch: 0, speed: 1.0 };
    
    let targetText = "안녕하세요, 성우입니다.";
    let finalPitch = currentSettings.pitch;
    let finalSpeed = currentSettings.speed;
    let finalStyle = persona.customStyle || "";

    if (step === 4 && segments[targetIdx]) {
      const seg = segments[targetIdx];
      const c = cast[seg.speaker];
      targetText = seg.text || "대사를 입력해주세요.";
      finalPitch = c?.pitch ?? currentSettings.pitch;
      finalSpeed = c?.speed ?? currentSettings.speed;
      finalStyle = `[단락별 최우선 연기]: ${seg.segmentStyle || "자연스럽게"}\n[기본 캐릭터 가이드]: ${c?.styleInstruction || persona.customStyle || ""}`.trim();
    } else {
      if (persona.customStyle) {
        const sampleMatch = persona.customStyle.match(/\[샘플 대본\]\s*:\s*([\s\S]+)$/i);
        if (sampleMatch) targetText = sampleMatch[1].trim();
      }
    }

    const contentHash = `${targetText}|${voiceId}|${finalPitch}|${finalSpeed}|${finalStyle}`;
    const existing = previewCache[cacheSlotKey];

    if (existing && existing.textHash === contentHash) {
      if (audioRef.current) {
        audioRef.current.src = existing.url;
        audioRef.current.play().catch(e => console.warn("Playback failed", e));
        setPlayingId(cacheSlotKey);
      }
      return;
    }

    setGeneratingId(cacheSlotKey);
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      let buffer: AudioBuffer;

      if (step === 4 && segments[targetIdx]) {
        buffer = await generateSpeechFromTransformed(targetText, voiceId, finalPitch, finalSpeed, finalStyle, audioContext);
      } else {
        buffer = await generatePreviewSpeech(voiceId, { ...currentSettings, styleInstruction: persona.customStyle, pitch: finalPitch, speed: finalSpeed }, audioContext);
      }

      const blob = pcmToWav(buffer);
      const url = URL.createObjectURL(blob);
      
      setPreviewCache(prev => ({
        ...prev,
        [cacheSlotKey]: { url, blob, settingsKey: contentHash, textHash: contentHash, timestamp: Date.now() }
      }));
      
      if (audioRef.current) { 
        audioRef.current.src = url; 
        audioRef.current.play().catch(e => console.warn("Playback blocked or failed", e));
        setPlayingId(cacheSlotKey); 
      }
    } catch (err) { alert(`오류 발생: ${err}`); }
    finally { setGeneratingId(null); }
  };

  const handleTogglePlayback = (voiceId: string, specificIdx?: number, forceSidebarStyle?: boolean, isVariant?: boolean) => {
    const targetIdx = specificIdx !== undefined ? specificIdx : selectedSegmentIdx;
    const baseKey = isVariant ? `${voiceId}-variant` : voiceId;
    const cacheKey = forceSidebarStyle ? `SIDEBAR-seg-${targetIdx}` : (step === 4 ? `${baseKey}-seg-${targetIdx}` : baseKey);
    if (playingId === cacheKey) {
      handleStopPlayback();
    } else {
      handleGeneratePreview(voiceId, specificIdx, forceSidebarStyle, isVariant);
    }
  };

  const getLatestSegmentCache = useCallback((idx: number) => {
    const seg = segments[idx];
    if (!seg) return null;
    const vId = cast[seg.speaker]?.voiceId || 'Kore';
    const normalKey = `${vId}-seg-${idx}`;
    const sidebarKey = `SIDEBAR-seg-${idx}`;
    const normalCached = previewCache[normalKey];
    const sidebarCached = previewCache[sidebarKey];
    if (normalCached && sidebarCached) return normalCached.timestamp > sidebarCached.timestamp ? normalCached : sidebarCached;
    return sidebarCached || normalCached || null;
  }, [segments, cast, previewCache]);

  const downloadSegment = (idx: number) => {
    const cached = getLatestSegmentCache(idx);
    const seg = segments[idx];
    if (cached && seg) {
      const a = document.createElement('a');
      a.href = cached.url;
      a.download = `dubbing_${idx+1}_${seg.speaker}.wav`;
      a.click();
    }
  };

  const handleDownloadZip = useCallback(async () => {
    if (segments.length === 0) return;
    setIsLoading(true);
    try {
      const zip = new JSZip();
      let addedCount = 0;
      for (let i = 0; i < segments.length; i++) {
        const cache = getLatestSegmentCache(i);
        if (cache) {
          const speakerName = segments[i].speaker.replace(/[/\\?%*:|"<>]/g, '-');
          const fileName = `${i + 1}_${speakerName}.wav`;
          zip.file(fileName, cache.blob);
          addedCount++;
        }
      }
      if (addedCount === 0) {
        alert("저장할 오디오 파일이 없습니다. 각 단락의 '미리보기'를 먼저 생성해주세요.");
        setIsLoading(false);
        return;
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dubbing_project_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("ZIP 압축 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [segments, previewCache, cast, getLatestSegmentCache]);

  const handleUpdateVoiceSetting = (voiceId: string, field: 'pitch' | 'speed', value: number, d?: string) => {
    handleStopPlayback(); 
    const key = d ? `${voiceId}_${d}` : voiceId;
    setVoiceSettings(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleProcessScript = () => {
    if (!script.trim()) return;
    const { segments: parsedSegments, speakers: detectedSpeakers } = parseScript(script);
    setSegments(parsedSegments);
    setSpeakers(detectedSpeakers);
    const initialHistories = parsedSegments.map(s => ({ states: [{ text: s.text, style: s.segmentStyle || "" }], pointer: 0 }));
    setSegmentHistories(initialHistories);
    
    const defaultActor = myActors.length > 0 ? myActors[0] : null;
    const defaultVoiceId = defaultActor ? defaultActor.voiceId : (aiRecommendation?.id || 'Kore');
    
    setCast(prev => {
      const newCast = { ...prev };
      detectedSpeakers.forEach(sp => {
        if (!newCast[sp]) {
          newCast[sp] = { 
            id: sp, 
            voiceId: defaultVoiceId, 
            pitch: defaultActor ? defaultActor.pitch : 0, 
            speed: defaultActor ? defaultActor.speed : 1.0, 
            styleInstruction: defaultActor?.styleInstruction || persona.customStyle || "", 
            dialect: defaultActor?.persona.dialect || persona.dialect,
            age: defaultActor?.persona.age || persona.age,
            actorId: defaultActor?.id || ""
          };
        }
      });
      return newCast;
    });
    setSelectedSegmentIdx(0);
    handleSetStep(4); 
  };

  const handleTransformSegment = async (idx: number, mode: 'dialect' | 'infant') => {
    const seg = segments[idx];
    const castMember = cast[seg.speaker];
    if (!castMember) return;
    const targetDialect = castMember.dialect || persona.dialect;
    
    setTransformingIdx(idx);
    try {
      let transformedText = seg.text;
      if (mode === 'dialect' && targetDialect !== '표준어') {
        transformedText = await transformTextToDialect(transformedText, targetDialect);
      } else if (mode === 'infant') {
        transformedText = await transformToInfantLanguage(transformedText);
      }
      const newSegments = [...segments];
      newSegments[idx] = { ...newSegments[idx], text: transformedText };
      setSegments(newSegments);
      pushToSegmentHistory(idx, transformedText, seg.segmentStyle || "");
    } catch (err) {
      alert("변환 중 오류가 발생했습니다.");
    } finally {
      setTransformingIdx(null);
    }
  };

  const handleCastChange = (idx: number, speaker: string, actorId: string) => {
    if (actorId === "ADD") { setIsAddingFromStep4(true); handleSetStep(2); return; }
    handleStopPlayback();
    const selectedActor = myActors.find(a => a.id === actorId);
    if (!selectedActor) return;
    setCast(prev => ({ 
      ...prev, 
      [speaker]: { 
        ...prev[speaker], 
        actorId: selectedActor.id,
        voiceId: selectedActor.voiceId, 
        pitch: selectedActor.pitch, 
        speed: selectedActor.speed, 
        styleInstruction: selectedActor.styleInstruction, 
        dialect: selectedActor.persona.dialect,
        age: selectedActor.persona.age
      } 
    }));
  };

  const insertEmotionTag = (idx: number, tagLabel: string, tagValue: string) => {
    handleStopPlayback();
    const textArea = textAreaRefs.current[idx];
    if (textArea) {
      const start = textArea.selectionStart || 0;
      const end = textArea.selectionEnd || 0;
      const currentText = segments[idx].text;
      const nextText = currentText.substring(0, start) + tagValue + " " + currentText.substring(end);
      
      const prevStyle = segments[idx].segmentStyle || "";
      pushToSegmentHistory(idx, nextText, prevStyle);
      const newS = [...segments];
      newS[idx] = { ...newS[idx], text: nextText };
      setSegments(newS);
      setSelectedSegmentIdx(idx);
      
      setTimeout(() => {
        if (textArea) {
          textArea.focus();
          const newPos = start + tagValue.length + 1;
          textArea.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const applySidebarPreset = (presetLabel: string, presetValue: string) => {
    if (selectedSegmentIdx === null) return;
    handleStopPlayback();
    const currentStyle = segments[selectedSegmentIdx].segmentStyle || "";
    const nextStyle = `${presetLabel}(${presetValue}) ${currentStyle.match(/\[Acting: .*?\]/g)?.join(' ') || ""}`.trim();
    pushToSegmentHistory(selectedSegmentIdx, segments[selectedSegmentIdx].text, nextStyle);
    const newS = [...segments];
    newS[selectedSegmentIdx] = { ...newS[selectedSegmentIdx], segmentStyle: nextStyle };
    setSegments(newS);
  };

  const PlayIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
  );
  const StopIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
  );
  const SpinnerIcon = () => (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900 overflow-hidden">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowApiKeyModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Gemini API Key 설정</h3>
            <p className="text-sm text-gray-500 mb-6">무료 API 키는 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">Google AI Studio</a>에서 발급받을 수 있습니다.</p>
            <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="AIzaSy... 형태의 API 키 입력" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={handleSaveApiKey} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all">저장</button>
              {hasApiKey && (<button onClick={handleRemoveApiKey} className="px-4 py-3 border-2 border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-all">삭제</button>)}
              <button onClick={() => setShowApiKeyModal(false)} className="px-4 py-3 border-2 border-gray-200 text-gray-400 font-bold rounded-xl hover:bg-gray-50 transition-all">닫기</button>
            </div>
            {hasApiKey && (<p className="mt-4 text-xs text-green-600 font-bold text-center">API 키가 설정되어 있습니다</p>)}
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSetStep(1)}><span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm italic font-black">S</span><span className="font-black text-gray-900 tracking-tight">DUB STUDIO PRO</span></div>
        <div className="flex items-center gap-4">
          <button onClick={handleReset} className="px-4 py-2 border border-red-200 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-all shadow-sm">초기화</button>
          <button onClick={handleOpenKeySelector} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${hasApiKey ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-900 text-white hover:bg-black'}`}>{hasApiKey ? 'API Key ✓' : 'API Key 설정'}</button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-50 flex justify-center py-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-8 md:gap-12 text-[11px] font-bold">
           {['장르 선택', '성우 캐스팅', '대본 입력', '대본 편집', '완성'].map((label, i) => {
             const stepNum = i + 1;
             const isReachable = stepNum <= maxStep;
             const isActive = step === stepNum;
             return (
               <button 
                 key={i} 
                 onClick={() => isReachable && handleSetStep(stepNum)}
                 disabled={!isReachable}
                 className={`flex items-center gap-3 transition-all outline-none ${isActive ? 'text-blue-600' : isReachable ? 'text-gray-600 hover:text-blue-400' : 'text-gray-300 cursor-not-allowed'}`}
               >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' : isReachable ? 'border-gray-400 text-gray-400' : 'border-gray-200 text-gray-200'}`}>{stepNum}</span>
                  {label}
               </button>
             );
           })}
        </div>
      </div>

      <main className="flex-grow flex flex-col p-4 md:p-6 overflow-hidden max-w-[1600px] mx-auto w-full">
        {step === 1 && (
          <div className="max-w-4xl mx-auto w-full bg-white rounded-3xl p-10 shadow-sm border border-gray-100 animate-fade-in text-center">
             <h2 className="text-2xl font-bold mb-8 text-gray-800">콘텐츠 장르 선택</h2>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {[...MEDIA_STYLES, ...PURPOSE_STYLES].map(s => (<button key={s.id} onClick={() => setSelectedStyleId(s.id)} className={`p-6 rounded-2xl border-2 font-bold transition-all ${selectedStyleId === s.id ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>{s.label}</button>))}
             </div>
             <button onClick={() => handleSetStep(2)} className="w-full mt-10 py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700 transition-all text-lg">성우 선택하기</button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 animate-fade-in h-full overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-bold mb-8 text-gray-800 text-center">성우 캐스팅</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div><label className="text-xs font-bold text-gray-400 block mb-3 uppercase tracking-widest">성별</label><div className="flex gap-3">{['남성', '여성'].map(g => (<button key={g} onClick={() => setPersona({...persona, gender: g})} className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all ${persona.gender === g ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' : 'border-gray-50 bg-gray-50 text-gray-400'}`}>{g}</button>))}</div></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-3 uppercase tracking-widest">연령대</label><div className="grid grid-cols-3 gap-2">{AGES.map(a => (<button key={a} onClick={() => setPersona({...persona, age: a})} className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${persona.age === a ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' : 'border-gray-50 bg-gray-50 text-gray-400'}`}>{a}</button>))}</div></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-3 uppercase tracking-widest">사투리</label><div className="grid grid-cols-3 gap-2">{DIALECTS.map(d => (<button key={d} onClick={() => setPersona({...persona, dialect: d})} className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${persona.dialect === d ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' : 'border-gray-50 bg-gray-50 text-gray-400'}`}>{d}</button>))}</div></div>
                <div className="pt-4 border-t border-gray-100"><label className="text-sm font-bold text-blue-600 block mb-3">캐릭터 가이드</label><textarea value={persona.customStyle} onChange={(e) => setPersona({...persona, customStyle: e.target.value})} className="w-full h-40 p-5 bg-blue-50/30 border border-blue-100 rounded-2xl text-sm outline-none font-mono custom-scrollbar resize-none" /></div>
              </div>
              <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-gray-900">추천 성우 리스트</h3><span className="text-[11px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full shadow-sm border border-blue-100">찜한 배우: {myActors.length}명</span></div>
                <div className="space-y-4 overflow-y-auto max-h-[550px] pr-2 custom-scrollbar">
                  {filteredVoices.map(voice => {
                    const settings = voiceSettings[voice.id] || { pitch: 0, speed: 1.0 };
                    const variantSettings = voiceSettings[`${voice.id}_${persona.dialect}`] || { pitch: 0, speed: 1.0 };
                    const isRecommended = aiRecommendation?.id === voice.id;
                    const isActive = activeVoiceId === voice.id && !activeVariantId;
                    const isVariantActive = activeVariantId === voice.id;
                    const isVoiceActiveInAnyWay = activeVoiceId === voice.id || activeVariantId === voice.id;
                    const isSelected = !!myActors.find(a => a.voiceId === voice.id && a.persona.dialect === '표준어');
                    const isVariantSelected = !!myActors.find(a => a.voiceId === voice.id && a.persona.dialect === persona.dialect);
                    const isPlaying = playingId === voice.id;
                    const isVariantPlaying = playingId === `${voice.id}-variant`;
                    const isGenerating = generatingId === voice.id;
                    const isVariantGenerating = generatingId === `${voice.id}-variant`;
                    const theme = getVoiceTheme(voice.id);
                    const showDialectVariant = persona.dialect !== '표준어' && (isRecommended || isVoiceActiveInAnyWay);

                    return (
                      <React.Fragment key={voice.id}>
                        <div onClick={() => handleGeneratePreview(voice.id)} className={`flex flex-col gap-4 p-5 bg-white rounded-2xl border transition-all shadow-sm cursor-pointer ${isActive ? 'border-blue-500 ring-4 ring-blue-100 shadow-md' : (isRecommended ? 'border-blue-500 shadow-sm' : 'border-gray-100')}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center text-xl shadow-sm`}>{theme.icon}</div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-gray-900">{voice.name}</p>
                                  {isRecommended && (<span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">AI 추천</span>)}
                                </div>
                                <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">{voice.characteristics} / {voice.optimalAge}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => toggleActorSelection(voice.id, '표준어')} className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-red-50 border-red-500 text-red-500 shadow-inner' : 'bg-white border-gray-200 text-gray-200 hover:border-gray-300'}`} title="캐릭터 찜하기"><svg className="w-5 h-5" fill={isSelected ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></button>
                              <button onClick={() => handleTogglePlayback(voice.id)} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isGenerating ? 'bg-blue-50 text-blue-600' : isPlaying ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                {isGenerating ? <SpinnerIcon /> : isPlaying ? <StopIcon /> : <PlayIcon />}
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 pt-2 border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase"><span>속도</span><span className="text-blue-600">x{settings.speed}</span></div>
                                <input type="range" min="0.5" max="2.0" step="0.1" value={settings.speed} onChange={(e) => handleUpdateVoiceSetting(voice.id, 'speed', parseFloat(e.target.value))} className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase"><span>피치</span><span className="text-blue-600 font-black">{settings.pitch}</span></div>
                                <input type="range" min="-5" max="5" step="1" value={settings.pitch} onChange={(e) => handleUpdateVoiceSetting(voice.id, 'pitch', parseInt(e.target.value))} className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                              </div>
                          </div>
                        </div>
                        {showDialectVariant && (
                          <div onClick={() => handleGeneratePreview(voice.id, undefined, false, true)} className={`flex flex-col gap-4 p-5 bg-blue-50/20 rounded-2xl border-2 border-dashed transition-all animate-fade-in-down cursor-pointer ${isVariantActive ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-100' : 'border-blue-300'}`}>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg">🪄</div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-sm text-blue-700">{voice.name} <span className="font-normal text-xs text-blue-400">사투리 버전</span></p>
                                      <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">{persona.dialect}</span>
                                    </div>
                                    <span className="text-[9px] text-blue-400 font-bold italic">Character Variant Injection: Ready ✅</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => toggleActorSelection(voice.id, persona.dialect)} className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${isVariantSelected ? 'bg-red-50 border-red-500 text-red-500 shadow-inner' : 'bg-white border-blue-200 text-blue-300 hover:border-blue-400'}`} title="캐릭터 찜하기"><svg className="w-5 h-5" fill={isVariantSelected ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></button>
                                  <button onClick={() => handleTogglePlayback(voice.id, undefined, false, true)} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isVariantGenerating ? 'bg-blue-50 text-blue-600' : isVariantPlaying ? 'bg-red-600 text-white shadow-lg' : 'bg-blue-100 text-blue-400 hover:bg-blue-200'}`}>
                                    {isVariantGenerating ? <SpinnerIcon /> : isVariantPlaying ? <StopIcon /> : <PlayIcon />}
                                  </button>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-x-8 gap-y-2 pt-2 border-t border-blue-100/50" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-blue-400 uppercase"><span>속도</span><span className="text-blue-600">x{variantSettings.speed}</span></div>
                                  <input type="range" min="0.5" max="2.0" step="0.1" value={variantSettings.speed} onChange={(e) => handleUpdateVoiceSetting(voice.id, 'speed', parseFloat(e.target.value), persona.dialect)} className="w-full h-1 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-blue-400 uppercase"><span>피치</span><span className="text-blue-600 font-black">{variantSettings.pitch}</span></div>
                                  <input type="range" min="-5" max="5" step="1" value={variantSettings.pitch} onChange={(e) => handleUpdateVoiceSetting(voice.id, 'pitch', parseInt(e.target.value), persona.dialect)} className="w-full h-1 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                             </div>
                             <p className="text-[10px] text-blue-500 leading-relaxed bg-white/70 p-3 rounded-xl border border-blue-100/50">
                               "현재 선택된 **{persona.dialect}** 사투리"가 적용된 캐릭터입니다. <br/>
                               미리듣기로 확인하고 찜하여 대본 편집에서 사용하세요.
                             </p>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              {isAddingFromStep4 ? (
                <>
                  <button onClick={() => { setIsAddingFromStep4(false); handleSetStep(4); }} className="flex-1 py-5 border-2 border-gray-100 text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-sm">취소하기</button>
                  <button onClick={() => { setIsAddingFromStep4(false); handleSetStep(4); }} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all text-xl">❤️ {myActors.length}명 캐릭터 추가 완료</button>
                </>
              ) : (
                <button onClick={() => myActors.length > 0 && handleSetStep(3)} disabled={myActors.length === 0} className={`w-full py-5 font-black rounded-2xl shadow-xl transition-all text-xl ${myActors.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>❤️ {myActors.length}명 성우로 대본 입력하기</button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-4xl mx-auto w-full bg-white rounded-3xl p-10 shadow-sm border border-gray-100 flex flex-col animate-fade-in">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">대본 입력</h3>
            <div className="relative bg-gray-50 rounded-2xl mb-6 overflow-hidden border-2 border-dashed border-gray-200 focus-within:border-blue-300 h-[500px]">
              <TextAreaInput text={script} setText={setScript} disabled={isLoading} onTransform={undefined} isTransforming={isBulkTransforming} hideTags={true} />
            </div>
            <div className="flex gap-4">
              <button onClick={() => handleSetStep(2)} className="flex-1 py-5 border-2 border-gray-100 text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-sm">이전 단계</button>
              <button onClick={handleProcessScript} disabled={!script.trim()} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all text-xl disabled:bg-gray-200">대본 분석 및 시작</button>
            </div>
          </div>
        )}
                  ))}
                </div>

                {/* 하단 고정 버튼 */}
                <div className="flex-shrink-0 p-6 border-t border-gray-100">
                  <button
                    onClick={() => handleSetStep(4)}
                    disabled={myActors.length === 0}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                      myActors.length > 0
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {myActors.length > 0 ? `${myActors.length}명의 성우로 시작하기 →` : '성우를 선택해주세요'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 4: 대본 입력 ========== */}
          {step === 4 && (
            <div className="h-full flex flex-col bg-white">
              {/* 헤더 */}
              <div className="flex-shrink-0 px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => handleSetStep(3)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="text-xl">←</span>
                    <span className="text-sm font-medium">성우 선택</span>
                  </button>
                  <div className="text-xs text-gray-400">STEP 4/5</div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">대본 입력</h2>
                <p className="text-sm text-gray-500">더빙할 대본을 입력하고 캐스팅을 진행하세요</p>
              </div>

              {/* 대본 입력 영역 */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="mb-4">
                  <TextAreaInput
                    value={script}
                    onChange={(val: string) => setScript(val)}
                    placeholder="대본을 입력하세요...&#10;&#10;예시:&#10;안녕하세요, 오늘의 뉴스를 전해드리겠습니다.&#10;첫 번째 소식입니다."
                    rows={8}
                  />
                </div>

                {script.trim() && (
                  <button
                    onClick={handleProcessScript}
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? '분석 중...' : '대본 분석 & 캐스팅 →'}
                  </button>
                )}

                {segments.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">세그먼트 ({segments.length}개)</h3>
                    {segments.map((seg, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedSegmentIdx(idx)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedSegmentIdx === idx
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-blue-600">#{idx + 1}</span>
                          <span className="text-xs text-gray-400">{seg.speaker}</span>
                        </div>
                        <p className="text-sm text-gray-800">{seg.text}</p>
                        {seg.transformedText && (
                          <p className="text-xs text-purple-600 mt-1 italic">→ {seg.transformedText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {segments.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleSetStep(5)}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                      더빙 스튜디오로 이동 →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== STEP 5: 더빙 스튜디오 ========== */}
          {step === 5 && (
            <div className="h-full flex flex-col bg-white">
              {/* 헤더 */}
              <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => handleSetStep(4)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="text-xl">←</span>
                    <span className="text-sm font-medium">대본</span>
                  </button>
                  <div className="text-xs text-gray-400">STEP 5/5</div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">더빙 스튜디오</h2>
                <p className="text-sm text-gray-500">각 세그먼트를 생성하고 미리듣기 하세요</p>
              </div>

              {/* 세그먼트 리스트 */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                  {segments.map((seg, idx) => {
                    const castMember = cast.find(c => c.speaker === seg.speaker);
                    const isGenerating = generatingId === idx;
                    const isPlaying = playingId === idx;
                    const cached = previewCache[`seg-${idx}`];
                    const history = segmentHistories[idx];

                    return (
                      <div key={idx} className={`p-4 rounded-xl border-2 transition-all ${
                        selectedSegmentIdx === idx ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-bold text-gray-700">{seg.speaker}</span>
                            {castMember && (
                              <span className="text-xs text-gray-400">· {castMember.voiceName}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {seg.emotion && (
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                                {seg.emotion}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-800 mb-2">{seg.text}</p>
                        {seg.transformedText && (
                          <p className="text-xs text-purple-600 mb-3 italic bg-purple-50 px-3 py-1.5 rounded-lg">
                            → {seg.transformedText}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleGenerateSegment(idx)}
                            disabled={isGenerating}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                              isGenerating
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-md'
                            }`}
                          >
                            {isGenerating ? '생성 중...' : cached ? '재생성' : '음성 생성'}
                          </button>

                          {cached && (
                            <>
                              <button
                                onClick={() => isPlaying ? handleStopPlayback() : handlePlaySegment(idx)}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                                  isPlaying
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                                }`}
                              >
                                {isPlaying ? '■' : '▶'}
                              </button>
                            </>
                          )}

                          {history && history.length > 1 && (
                            <button
                              onClick={() => handleUndoSegment(idx)}
                              className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
                              title="이전 버전"
                            >
                              ↩
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 일괄 변환 & 다운로드 */}
                {segments.length > 0 && (
                  <div className="mt-6 space-y-3 pb-6">
                    <button
                      onClick={handleBulkTransform}
                      disabled={isBulkTransforming}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {isBulkTransforming ? '일괄 생성 중...' : '전체 세그먼트 일괄 생성'}
                    </button>

                    {Object.keys(previewCache).length > 0 && (
                      <button
                        onClick={handleDownloadAll}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                      >
                        전체 다운로드 (ZIP)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 숨겨진 오디오 플레이어 */}
      <audio ref={audioRef} onEnded={handleStopPlayback} className="hidden" />

      {/* API Key 모달 */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowApiKeyModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Gemini API Key 설정</h3>
            <p className="text-sm text-gray-500 mb-6">
              무료 API 키는{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">
                Google AI Studio
              </a>
              에서 발급받을 수 있습니다.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy... 형태의 API 키 입력"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveApiKey}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
              >
                저장
              </button>
              {hasApiKey && (
                <button
                  onClick={handleRemoveApiKey}
                  className="px-4 py-3 border-2 border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-all"
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-3 border-2 border-gray-200 text-gray-400 font-bold rounded-xl hover:bg-gray-50 transition-all"
              >
                닫기
              </button>
            </div>
            {hasApiKey && (
              <p className="mt-4 text-xs text-green-600 font-bold text-center">✓ API 키가 설정되어 있습니다</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

