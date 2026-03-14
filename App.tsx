
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

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
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
    // 표준어일 때는 dialectOverride가 '표준어'로 들어오며, 이때 settingsKey는 voiceId와 같아야 함
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
    
    // 상태 업데이트
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
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSetStep(1)}><span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm italic font-black">S</span><span className="font-black text-gray-900 tracking-tight">DUB STUDIO PRO</span></div>
        <div className="flex items-center gap-4">
          <button onClick={handleReset} className="px-4 py-2 border border-red-200 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-all shadow-sm">초기화</button>
          <button onClick={handleOpenKeySelector} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all">API Key 설정</button>
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
                    
                    // 사투리 카드는 추천 성우이거나, 현재 클릭하여 활성화된 성우인 경우 노출
                    const showDialectVariant = persona.dialect !== '표준어' && (isRecommended || isVoiceActiveInAnyWay);

                    return (
                      <React.Fragment key={voice.id}>
                        <div 
                          onClick={() => handleGeneratePreview(voice.id)}
                          className={`flex flex-col gap-4 p-5 bg-white rounded-2xl border transition-all shadow-sm cursor-pointer ${isActive ? 'border-blue-500 ring-4 ring-blue-100 shadow-md' : (isRecommended ? 'border-blue-500 shadow-sm' : 'border-gray-100')}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center text-xl shadow-sm`}>{theme.icon}</div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-gray-900">{voice.name}</p>
                                  {isRecommended && (
                                    <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">AI 추천</span>
                                  )}
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
                          <div 
                            onClick={() => handleGeneratePreview(voice.id, undefined, false, true)}
                            className={`flex flex-col gap-4 p-5 bg-blue-50/20 rounded-2xl border-2 border-dashed transition-all animate-fade-in-down cursor-pointer ${isVariantActive ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-100' : 'border-blue-300'}`}
                          >
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
              <TextAreaInput 
                text={script} 
                setText={setScript} 
                disabled={isLoading} 
                onTransform={undefined} 
                isTransforming={isBulkTransforming}
                hideTags={true}
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => handleSetStep(2)} className="flex-1 py-5 border-2 border-gray-100 text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-sm">이전 단계</button>
              <button onClick={handleProcessScript} disabled={!script.trim()} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all text-xl disabled:bg-gray-200">대본 분석 및 시작</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex-grow flex flex-row gap-6 w-full h-full overflow-hidden animate-fade-in">
            <div className="flex-grow flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 shrink-0 flex items-center justify-between"><h3 className="font-bold text-gray-800 text-lg">대본 편집기</h3><button onClick={() => { handleStopPlayback(); setIsAddingFromStep4(true); handleSetStep(2); }} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 shadow-sm">화자 추가</button></div>
              <div className="flex-grow overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {segments.map((seg, idx) => {
                  const isActive = selectedSegmentIdx === idx;
                  const castMember = cast[seg.speaker];
                  const vId = castMember?.voiceId || 'Kore';
                  const theme = getVoiceTheme(vId);
                  const cache = getLatestSegmentCache(idx);
                  const isPlaying = playingId === (`${vId}-seg-${idx}`) || playingId === (`SIDEBAR-seg-${idx}`);
                  const isGenerating = generatingId === (`${vId}-seg-${idx}`) || generatingId === (`SIDEBAR-seg-${idx}`);
                  const isTransforming = transformingIdx === idx;
                  
                  const targetDialect = castMember?.dialect || persona.dialect;
                  const isDialectSet = targetDialect !== '표준어';
                  const isInfantSet = castMember?.age === '유아';
                  
                  const history = segmentHistories[idx];
                  const canUndo = history && history.states.length > 1 && history.pointer > 0;

                  return (
                    <div key={idx} onClick={() => setSelectedSegmentIdx(idx)} className={`group p-6 rounded-[32px] border-2 transition-all cursor-pointer relative ${isActive ? 'border-blue-500 bg-blue-50/5' : 'border-gray-50 hover:bg-gray-50/50'}`}>
                       <div className="flex items-center gap-3 mb-4 pr-2">
                          <div className={`w-8 h-8 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center text-lg shadow-sm shrink-0`}>{theme.icon}</div>
                          <span className="font-bold text-gray-900 text-base">{seg.speaker}</span>
                          <div className="mx-2 flex-grow max-w-[300px]" onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={castMember?.actorId || ''} 
                              onChange={(e) => handleCastChange(idx, seg.speaker, e.target.value)} 
                              className="w-full pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-700 outline-none appearance-none hover:border-blue-400 transition-all shadow-sm"
                            >
                              {myActors.map(a => (<option key={a.id} value={a.id}>❤️ {a.displayName}</option>))}
                              <option value="ADD" className="text-blue-600">+ 성우 추가</option>
                            </select>
                          </div>
                          <div className="ml-auto flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                             {isDialectSet && (
                               <button onClick={() => handleTransformSegment(idx, 'dialect')} disabled={isTransforming} className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50">🪄 {targetDialect} 변환</button>
                             )}
                             {isInfantSet && (
                               <button onClick={() => handleTransformSegment(idx, 'infant')} disabled={isTransforming} className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-amber-500 text-white text-[10px] font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50">🍼 유아 변환</button>
                             )}
                             <button onClick={() => handleUndo(idx)} disabled={!canUndo} className="px-3 py-1.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 hover:bg-gray-200 disabled:opacity-30">되돌리기</button>
                             {cache && <button onClick={() => downloadSegment(idx)} className="px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 hover:bg-black">💾 WAV 저장</button>}
                            <button onClick={() => handleTogglePlayback(vId, idx, false)} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${isGenerating ? 'bg-blue-50 text-blue-600' : isPlaying ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                              {isGenerating ? '합성 중' : isPlaying ? '중지' : '미리듣기'}
                            </button>
                          </div>
                       </div>
                       <textarea ref={el => textAreaRefs.current[idx] = el} onFocus={() => setSelectedSegmentIdx(idx)} className={`w-full bg-[#fcfdfe] border border-gray-100 rounded-3xl p-6 outline-none resize-none text-gray-800 leading-relaxed text-lg font-medium shadow-inner min-h-[120px] focus:border-blue-200 transition-all ${isTransforming ? 'opacity-50 blur-[1px]' : 'opacity-100'}`} value={seg.text} onChange={(e) => { const newS = [...segments]; newS[idx] = { ...newS[idx], text: e.target.value }; setSegments(newS); }} />
                       <div className="mt-4 flex flex-wrap gap-2">
                         {ACTING_TAGS.map((tag) => (
                            <button key={tag.label} onClick={(e) => { e.stopPropagation(); insertEmotionTag(idx, tag.label, tag.value); }} className="px-2.5 py-1.5 bg-white border border-gray-100 text-gray-500 text-[10px] font-bold rounded-lg hover:border-blue-400 hover:text-blue-600 shadow-sm">{tag.label}</button>
                         ))}
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <aside className="w-[440px] bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col shrink-0 overflow-hidden">
              <div className="p-8 flex-grow overflow-y-auto custom-scrollbar space-y-8">
                <div className="bg-blue-600 p-6 rounded-3xl space-y-6 shadow-xl text-white">
                   <h3 className="font-black">{activeSegment?.speaker} 실시간 가이드</h3>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-bold text-blue-100">피치</label><input type="range" min="-5" max="5" value={activeSpeakerCast?.pitch || 0} onChange={(e) => activeSegment && setCast({...cast, [activeSegment.speaker]: {...cast[activeSegment.speaker], pitch: parseInt(e.target.value)}})} className="w-full h-1 bg-white/20 appearance-none accent-white" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-bold text-blue-100">속도</label><input type="range" min="0.5" max="2.0" step="0.1" value={activeSpeakerCast?.speed || 1.0} onChange={(e) => activeSegment && setCast({...cast, [activeSegment.speaker]: {...cast[activeSegment.speaker], speed: parseFloat(e.target.value)}})} className="w-full h-1 bg-white/20 appearance-none accent-white" /></div>
                      </div>
                      <textarea value={activeSegment?.segmentStyle || ""} onChange={(e) => { const newS = [...segments]; newS[selectedSegmentIdx] = { ...newS[selectedSegmentIdx], segmentStyle: e.target.value }; setSegments(newS); }} className="w-full h-24 p-4 bg-white/10 rounded-2xl text-xs outline-none" placeholder="연기 프리셋을 클릭하거나 직접 입력하세요." />
                      <button onClick={() => handleTogglePlayback(activeSpeakerCast?.voiceId || 'Kore', selectedSegmentIdx, true)} className="w-full py-4 bg-white text-blue-600 font-black rounded-2xl shadow-lg hover:bg-gray-100 transition-all">
                        {generatingId === `SIDEBAR-seg-${selectedSegmentIdx}` ? '생성 중...' : playingId === `SIDEBAR-seg-${selectedSegmentIdx}` ? '■ 정지' : '▶ 현재 가이드로 미리듣기'}
                      </button>
                   </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">연기 프리셋</h4>
                  {PRESET_CATEGORIES.map(cat => (
                    <div key={cat.id} className="space-y-3">
                      <h5 className="text-[9px] font-bold text-gray-400">{cat.label}</h5>
                      <div className="flex flex-wrap gap-2">
                        {cat.presets.map(p => (
                          <button key={p.label} onClick={() => applySidebarPreset(p.label, p.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-100 text-[10px] font-bold rounded-xl hover:border-blue-400 transition-all">{p.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 border-t border-gray-100 flex gap-4">
                <button onClick={() => handleSetStep(3)} className="flex-1 py-5 border-2 border-gray-100 text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-sm">이전 단계</button>
                <button onClick={() => handleSetStep(5)} className="flex-[2] py-5 bg-gray-900 text-white font-black rounded-3xl shadow-xl hover:bg-black transition-all">프로젝트 완성하기</button>
              </div>
            </aside>
          </div>
        )}

        {step === 5 && (
          <div className="max-w-4xl mx-auto w-full bg-white rounded-[40px] p-16 shadow-2xl border border-gray-100 text-center flex flex-col items-center">
            <h2 className="text-3xl font-black mb-10 text-gray-900">더빙이 완료되었습니다! 🎉</h2>
            <div className="w-full space-y-4 mb-10 overflow-y-auto max-h-[500px] px-4 custom-scrollbar">
              {segments.map((seg, idx) => {
                const cache = getLatestSegmentCache(idx);
                if (!cache) return null;
                const theme = getVoiceTheme(cast[seg.speaker]?.voiceId);
                return (
                  <div key={idx} className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                     <div className={`w-10 h-10 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center text-lg shadow-sm shrink-0`}>{theme.icon}</div>
                     <div className="flex-grow text-left">
                        <div className="font-bold text-gray-900 text-sm">{seg.speaker} <span className="text-gray-400 font-normal italic ml-2">#{idx+1}</span></div>
                        <p className="text-xs text-gray-500 truncate">{seg.text}</p>
                     </div>
                     <button onClick={() => downloadSegment(idx)} className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all">↓ WAV</button>
                  </div>
                );
              })}
            </div>
            <div className="w-full max-w-md space-y-4">
              <button onClick={handleDownloadZip} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                {isLoading ? '압축 중...' : '모든 파일 일괄 저장 (.zip)'}
              </button>
              <button onClick={() => handleSetStep(4)} className="w-full py-4 border-2 border-gray-100 text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-sm">편집기로 돌아가기</button>
              <button onClick={handleReset} className="w-full text-blue-600 font-bold hover:underline pt-2">새로운 더빙 시작</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
