
import type { VoiceOption } from './types';

export const AVAILABLE_VOICES: VoiceOption[] = [
  // --- 청년(Age 20s) 핵심 모델 리스트 (사용자 지정 순서) ---
  { id: 'aoede', apiVoiceName: 'Aoede', name: 'Aoede', description: 'Fresh & Trendy Female', characteristics: 'High / Bright', optimalAge: '청년', gender: '여성', defaultPitch: 0 },
  { id: 'leda', apiVoiceName: 'Leda', name: 'Leda', description: 'Confident & Professional Female', characteristics: 'Youthful / Dynamic', optimalAge: '청년', gender: '여성', defaultPitch: 1 },
  { id: 'kore', apiVoiceName: 'Kore', name: 'Kore', description: 'Sincere & Clean Standard Female', characteristics: 'Mid-High', optimalAge: '청년', gender: '여성', defaultPitch: 0 },
  { id: 'charon', apiVoiceName: 'Charon', name: 'Charon', description: 'Deep but Trendy Male', characteristics: 'Low / Authoritative', optimalAge: '청년', gender: '남성', defaultPitch: -1 },
  { id: 'puck', apiVoiceName: 'Puck', name: 'Puck', description: 'Dynamic & Fresh Male', characteristics: 'Variable / Energetic', optimalAge: '청년', gender: '중성', defaultPitch: 0 },
  { id: 'fenrir', apiVoiceName: 'Fenrir', name: 'Fenrir', description: 'Confident & Passionate Male', characteristics: 'Deep Low / Raspy', optimalAge: '청년', gender: '남성', defaultPitch: -1 },

  // --- 어린이/유아 핵심 모델 ---
  { id: 'zephyr', apiVoiceName: 'Zephyr', name: 'Zephyr', description: 'Bright, Higher pitch', characteristics: 'Bright, Higher pitch', optimalAge: '유아/아동', gender: '남성', defaultPitch: 2 },
  { id: 'orus', apiVoiceName: 'Orus', name: 'Orus', description: '깊고 울림이 있는 중저음.', characteristics: 'Deep Low', optimalAge: '중년', gender: '남성', defaultPitch: -1 },

  // --- 기타 표준 성우 리스트 ---
  { id: 'laomedeia', apiVoiceName: 'Laomedeia', name: 'Laomedeia', description: 'Upbeat, Higher pitch', characteristics: 'Upbeat, Higher pitch', optimalAge: '청년/아동', gender: '여성', defaultPitch: 3 },
  { id: 'achernar', apiVoiceName: 'Achernar', name: 'Achernar', description: 'Soft, Higher pitch', characteristics: 'Soft, Higher pitch', optimalAge: '청년/아동', gender: '남성', defaultPitch: 1 },
  { id: 'autonoe', apiVoiceName: 'Autonoe', name: 'Autonoe', description: '지적이고 차분한 톤.', characteristics: 'Mid-Low', optimalAge: '중년', gender: '여성', defaultPitch: 0 },
  { id: 'algenib', apiVoiceName: 'Algenib', name: 'Algenib', description: '신뢰감 있는 목소리.', characteristics: 'Mid-Low', optimalAge: '청년/중년', gender: '남성', defaultPitch: -1 },
  { id: 'iapetus', apiVoiceName: 'Iapetos', name: 'Iapetos', description: '거칠고 단단한 느낌.', characteristics: 'Deep Low', optimalAge: '중년', gender: '남성', defaultPitch: -1 },
  { id: 'pulcherrima', apiVoiceName: 'Mnemosyne', name: 'Mnemosyne', description: '차분하고 우아한 해설가.', characteristics: 'Mid-Low', optimalAge: '중년', gender: '여성', defaultPitch: 0 },
  { id: 'umbriel', apiVoiceName: 'Oceanos', name: 'Oceanos', description: '평온한 중저음.', characteristics: 'Low', optimalAge: '중년', gender: '남성', defaultPitch: -1 },
  { id: 'sadachbia', apiVoiceName: 'Tethys', name: 'Tethys', description: '부드럽고 상냥한 비서 스타일.', characteristics: 'Mid-High', optimalAge: '청년', gender: '여성', defaultPitch: 1 },
  { id: 'gacrux', apiVoiceName: 'Theia', name: 'Theia', description: '밝고 트렌디한 여성.', characteristics: 'High', optimalAge: '청년', gender: '여성', defaultPitch: 2 },
  { id: 'vindemiatrix', apiVoiceName: 'Themis', name: 'Themis', description: '이성적이고 균형 잡힌 전문직.', characteristics: 'Mid', optimalAge: '중년', gender: '여성', defaultPitch: 0 },
];

export const DIALECT_FIXED_SAMPLES: Record<string, string> = {
  '경상도': "마, 밥은 묵었나? 날도 더운디 퍼뜩 드가서 씻고 쉬라 캐라.",
  '전라도': "아따, 날씨가 겁나게 좋아부러야. 싸게싸게 와서 밥 한술 뜨랑께!",
  '충청도': "그거 그렇게 급하게 해서 뭐한대유~ 괜찮으니께 천천히 해유.",
  '강원도': "날래 이리로 와보드래요. 옥수수가 아주 맛나게 쪄졌드래요.",
  '제주도': "맨도롱 또똣할 때 후루룩 마십서. 맛이 아주 좋수다."
};

export const INFANT_DIALECT_TEMPLATES: Record<string, string> = {
  '표준어': `Role: 3-year-old Baby / Tiny Fairy.
[Audio Texture]
- Pitch: High, Thin, Helium-like (+50%).
- Resonance: None (Remove chest voice).
- Articulation: "Baby Lisp" (Th-sounding 'S'). Pronunciation is soft and mushy.
[Performance Direction]
- Flow: Legato (Connect words smoothly, drag vowels).
- Emotion: Whining or Pouting.
- Key Trait: Slur the words together. Do NOT stutter strictly.

[샘플 대본]: 엄..마아.. 나 쩰리 머꼬 시포요.. 딱 하나만 쭈떼여.. 네?..`,
  '경상도': `Role: 3-year-old Baby / Tiny Fairy.
[Audio Texture]
- Pitch: High, Thin, Helium-like (+50%).
- Resonance: None (Remove chest voice).
- Articulation: "Baby Lisp" (Th-sounding 'S'). Pronunciation is soft and mushy.
[Performance Direction]
- Flow: Legato (Connect words smoothly, drag vowels).
- Emotion: Whining or Pouting.
- Key Trait: Slur the words together. Do NOT stutter strictly.

[샘플 대본]: 마, 밥은 묵었나? 날도 더운디 퍼뜩 드가서 씻고 쉬라 캐라.`,
  '전라도': `Role: 3-year-old Baby / Tiny Fairy.
[Audio Texture]
- Pitch: High, Thin, Helium-like (+50%).
- Resonance: None (Remove chest voice).
- Articulation: "Baby Lisp" (Th-sounding 'S'). Pronunciation is soft and mushy.
[Performance Direction]
- Flow: Legato (Connect words smoothly, drag vowels).
- Emotion: Whining or Pouting.
- Key Trait: Slur the words together. Do NOT stutter strictly.

[샘플 대본]: 아따, 날씨가 겁나게 좋아부러야. 싸게싸게 와서 밥 한술 뜨랑께!`,
  '충청도': `Role: 3-year-old Baby / Tiny Fairy.
[Audio Texture]
- Pitch: High, Thin, Helium-like (+50%).
- Resonance: None (Remove chest voice).
- Articulation: "Baby Lisp" (Th-sounding 'S'). Pronunciation is soft and mushy.
[Performance Direction]
- Flow: Legato (Connect words smoothly, drag vowels).
- Emotion: Whining or Pouting.
- Key Trait: Slur the words together. Do NOT stutter strictly.

[샘플 대본]: 그거 그렇게 급하게 해서 뭐한대유~ 괜찮으니께 천천히 해유.`,
  '강원도': `Role: 3-year-old Baby / Tiny Fairy.
[Audio Texture]
- Pitch: High, Thin, Helium-like (+50%).
- Resonance: None (Remove chest voice).
- Articulation: "Baby Lisp" (Th-sounding 'S'). Pronunciation is soft and mushy.
[Performance Direction]
- Flow: Legato (Connect words smoothly, drag vowels).
- Emotion: Whining or Pouting.
- Key Trait: Slur the words together. Do NOT stutter strictly.

[샘플 대본]: 날래 이리로 와보드래요. 옥수수가 아주 맛나게 쪄졌드래요.`,
  '제주도': `Role: 3-year-old Baby / Tiny Fairy.
[Audio Texture]
- Pitch: High, Thin, Helium-like (+50%).
- Resonance: None (Remove chest voice).
- Articulation: "Baby Lisp" (Th-sounding 'S'). Pronunciation is soft and mushy.
[Performance Direction]
- Flow: Legato (Connect words smoothly, drag vowels).
- Emotion: Whining or Pouting.
- Key Trait: Slur the words together. Do NOT stutter strictly.

[샘플 대본]: 맨도롱 또똣할 때 후루룩 마십서. 맛이 아주 좋수다.`
};

export const CHILD_DIALECT_TEMPLATES: Record<string, string> = {
  '표준어': `Role: Energetic Child (Age 8).
[Vocal Characteristics]
- Tone: Bright, Clear, High Energy.
- Pitch: Slightly higher (+10~20%).
- Rhythm: Fast (Speed 1.1x) and bouncy.
[Performance Direction]
- Act like an excited elementary school student.
- Emphasize the last syllable (Rising intonation).
- Avoid: Adult-like deep resonance.

[샘플 대본]: 엄마! 이거 봐요! 오늘 학교에서 개구리 잡았다? 진짜 대박이죠!`,

  '경상도': `Role: Energetic Child (Age 8).
[Vocal Characteristics]
- Tone: Bright, Clear, High Energy.
- Pitch: Slightly higher (+10~20%).
- Rhythm: Fast (Speed 1.1x) and bouncy.
[Performance Direction]
- Act like an excited elementary school student.
- Emphasize the last syllable (Rising intonation).
- Avoid: Adult-like deep resonance.

[샘플 대본]: 마, 밥은 묵었나? 날도 더운디 퍼뜩 드가서 씻고 쉬라 캐라.`,

  '전라도': `Role: Energetic Child (Age 8).
[Vocal Characteristics]
- Tone: Bright, Clear, High Energy.
- Pitch: Slightly higher (+10~20%).
- Rhythm: Fast (Speed 1.1x) and bouncy.
[Performance Direction]
- Act like an excited elementary school student.
- Emphasize the last syllable (Rising intonation).
- Avoid: Adult-like deep resonance.

[샘플 대본]: 아따, 날씨가 겁나게 좋아부러야. 싸게싸게 와서 밥 한술 뜨랑께!`,

  '충청도': `Role: Energetic Child (Age 8).
[Vocal Characteristics]
- Tone: Bright, Clear, High Energy.
- Pitch: Slightly higher (+10~20%).
- Rhythm: Fast (Speed 1.1x) and bouncy.
[Performance Direction]
- Act like an excited elementary school student.
- Emphasize the last syllable (Rising intonation).
- Avoid: Adult-like deep resonance.

[샘플 대본]: 그거 그렇게 급하게 해서 뭐한대유~ 괜찮으니께 천천히 해유.`,

  '강원도': `Role: Energetic Child (Age 8).
[Vocal Characteristics]
- Tone: Bright, Clear, High Energy.
- Pitch: Slightly higher (+10~20%).
- Rhythm: Fast (Speed 1.1x) and bouncy.
[Performance Direction]
- Act like an excited elementary school student.
- Emphasize the last syllable (Rising intonation).
- Avoid: Adult-like deep resonance.

[샘플 대본]: 날래 이리로 와보드래요. 옥수수가 아주 맛나게 쪄졌드래요.`,

  '제주도': `Role: Energetic Child (Age 8).
[Vocal Characteristics]
- Tone: Bright, Clear, High Energy.
- Pitch: Slightly higher (+10~20%).
- Rhythm: Fast (Speed 1.1x) and bouncy.
[Performance Direction]
- Act like an excited elementary school student.
- Emphasize the last syllable (Rising intonation).
- Avoid: Adult-like deep resonance.

[샘플 대본]: 맨도롱 또똣할 때 후루룩 마십서. 맛이 아주 좋수다.`
};

export const STYLE_PROMPTS: Record<string, string> = {
  shorts: "에너지가 넘치고 텐션이 높은 숏폼 나레이션 스타일입니다. 말이 빠르고 귀에 쏙쏙 박히는 목소리로 연기해주세요.",
  news: "신뢰감을 주는 차분하고 지적인 뉴스 앵커 스타일입니다. 정확한 발음과 일정한 호흡으로 소식을 전달해주세요.",
  podcast: "친근하고 다정한 라디오 DJ 혹은 팟캐스트 진행자 스타일입니다. 시청자와 가까이서 대화하듯 편안하게 말해주세요.",
  ars: "정중하고 기계적이지 않은 부드러운 안내 음성 스타일입니다. 명확하면서도 친절한 톤을 유지해주세요.",
  ads: "설득력 있고 매력적인 광고 성우 스타일입니다. 제품의 장점을 강조하듯 자신감 넘치고 화려한 목소리로 연기해주세요.",
  event: "활기차고 열정적인 이벤트 MC 스타일입니다. 분위기를 고조시키듯 밝고 큰 목소리로 말해주세요.",
  animation: "표현력이 풍부하고 생동감 넘치는 애니메이션 캐릭터 스타일입니다. 감정의 폭이 크고 개성 있는 목소리로 연기해주세요.",
  audiobook: "차분하고 안정적인 오디오북 낭독 스타일입니다. 긴 이야기를 편안하게 들을 수 있도록 일정한 톤과 깊은 호흡으로 읽어주세요.",
  conversation: "일상적인 대화 스타일입니다. 꾸밈없이 자연스러운 말투와 적절한 추임새를 섞어 말해주세요.",
  documentary: "무게감 있고 진지한 다큐멘터리 해설 스타일입니다. 진정성이 느껴지는 낮고 차분한 목소리로 설명해주세요.",
  education: "전달력이 뛰어나고 명확한 교육 강사 스타일입니다. 중요한 내용을 강조하듯 또박또박하고 지적인 톤으로 말해주세요.",
  rapper: "리듬감이 강하고 힙합 분위기가 느껴지는 래퍼 스타일입니다. 강렬한 에너지와 비트감이 느껴지는 발성으로 연기해주세요."
};

export const DIALECT_SAMPLES: Record<string, { instruction: string }> = {
  '표준어': { instruction: "표준어 발음을 사용하여 깨끗한 느낌을 표현하세요." },
  '경상도': { instruction: "억양이 강하고 투박하면서도 정겨운 경상도 사투리로 연기해주세요." },
  '전라도': { instruction: "어미의 늘어짐이 자연스럽고 감칠맛 나는 전라도 사투리로 연기해주세요." },
  '충청도': { instruction: "말의 속도가 여유롭고 끝이 느릿하게 이어지는 충청도 사투리로 연기해주세요." },
  '강원도': { instruction: "순박하고 억양이 독특한 강원도 지역의 특색을 살려 연기해주세요." },
  '제주도': { instruction: "알아듣기 어려울 정도로 독특하고 이색적인 제주도 방언 느낌을 살려주세요." }
};

export const ACTING_TAGS = [
  { label: '💨 한숨', value: '(한숨)' },
  { label: '🗣️ 헛기침', value: '(헛기침)' },
  { label: '😮 헉!', value: '(헉)' },
  { label: '🌬️ 심호흡', value: '(심호흡)' },
  { label: '🤣 하하', value: '(하하)' },
  { label: '😏 피식', value: '(피식)' },
  { label: '🤭 히히', value: '(히히)' },
  { label: '😒 비웃음', value: '(비웃음)' },
  { label: '😭 엉엉', value: '(엉엉 울며)' },
  { label: '😢 흐느낌', value: '(흐느끼며)' },
  { label: '🤧 훌쩍', value: '(훌쩍이며)' },
  { label: '🫨 떨림', value: '(목소리 떨림)' },
  { label: '🤫 속삭임', value: '(속삭임)' },
  { label: '📢 외침', value: '(외침)' },
  { label: '😱 비명', value: '(비명)' },
  { label: '주절주절', value: '(중얼거림)' },
  { label: '😵‍💫 더듬기', value: '(더듬거림)' },
  { label: '🤩 흥분', value: '(흥분해서)' },
];

export const PRESET_CATEGORIES = [
  {
    id: 'breathing',
    label: '🌬️ 발성 및 호흡',
    presets: [
      { label: '속삭이는', value: '[Performance: Whispering, ultra-low volume, breathy texture, close-mic proximity effect, intimate and secretive]' },
      { label: '숨죽인', value: '[Performance: Breathless, fast heartbeat audible in voice, frequent sharp intakes of breath, high tension, suppressed projection]' },
      { label: '웅얼거리는', value: '[Performance: Murmuring, indistinct articulation, low resonance, low energy, self-directed speech, mumbling]' },
      { label: '나지막한', value: '[Performance: Low and soft spoken, grounded tone, steady low-volume projection, calm harmonics, gentle delivery]' },
      { label: '외치는', value: '[Performance: Shouting, projective energy, high chest resonance, maximum vocal volume, calling out to distance]' },
      { label: '절규하는', value: '[Performance: Screaming, extreme pitch, distorted harmonics, maximum emotional intensity, high throat tension, desperate]' },
      { label: '으르렁거리는', value: '[Performance: Growling, scratching throat texture, glottal fry, threatening low resonance, restricted airflow]' },
    ]
  },
  {
    id: 'intensity',
    label: '🔥 감정의 강도',
    presets: [
      { label: '들뜬', value: '[Emotion: Excited, high tension, bouncy rhythm, full of energy, wide pitch variance, fast tempo]' },
      { label: '명랑한', value: '[Emotion: Cheerful, clear and bright harmonics, pleasant tone, rising intonation at sentence ends]' },
      { label: '따뜻한', value: '[Emotion: Affectionate and warm, soft and embracing, slow and steady pace, empathetic resonance]' },
      { label: '감격한', value: '[Emotion: Overwhelmed with joy, slight tremble in voice, bright texture, breathy exhales between phrases]' },
      { label: '안도하는', value: '[Emotion: Relieved, releasing all muscle tension, deep exhales, steady and calm low-mid pitch]' },
      { label: '울먹이는', value: '[Emotion: Sobbing, tearful, voice breaking at high frequencies, heavy nasal resonance, sorrowful]' },
      { label: '침울한', value: '[Emotion: Gloomy, depressed, dark and low energy, heavy gravity in tone, trailing off at ends]' },
      { label: '격분한', value: '[Emotion: Furious, explosive articulation, high vocal pressure, sharp and biting tone, fast and loud]' },
      { label: '차가운', value: '[Emotion: Cold, cynical, emotionless and sharp, flat intonation, detached and distant resonance]' },
      { label: '겁에 질린', value: '[Emotion: Terrified, unstable and trembling voice, erratic breathing, high pitch spikes, stuttering rhythm]' },
      { label: '짜증 섞인', value: '[Emotion: Annoyed, rough and blunt tone, bothered, short and clipped phrases, low patience in voice]' },
    ]
  },
  {
    id: 'attitude',
    label: '🎭 태도 및 성격',
    presets: [
      { label: '권위적인', value: '[Attitude: Authoritative, commanding, firm and powerful leader, heavy weight in speech, clear pauses]' },
      { label: '비꼬는', value: '[Attitude: Sarcastic, cynical sneer, saying one thing but meaning another, exaggerated rising/falling pitch]' },
      { label: '건방진', value: '[Attitude: Arrogant, looking down on listener, haughty tone, slow and condescending pace]' },
      { label: '수줍은', value: '[Attitude: Shy, timid, hesitating rhythm, trailing off, very soft projection, avoiding emphasis]' },
      { label: '나른한', value: '[Attitude: Languid, sleepy or lazy feeling, effortless style, sliding between notes, slow pacing]' },
      { label: '요염한', value: '[Attitude: Seductive, sticky and alluring tone, breathy texture, slow and lingering on vowels]' },
      { label: '단호한', value: '[Attitude: Firm and determined, unwavering intonation, strong sentence endings, consistent rhythm]' },
    ]
  },
  {
    id: 'situational',
    label: '📍 상황적 연출',
    presets: [
      { label: '다급한', value: '[Situation: Urgent, running out of time, high adrenaline, fast-paced speech, frequent quick intakes of breath]' },
      { label: '술 취한', value: '[Situation: Drunk, slurred pronunciation, uncontrolled tension, unstable pitch, slow and wandering rhythm]' },
      { label: '비몽사몽', value: '[Situation: Sleepy, just woke up, husky and locked voice, slow response time, heavy breathing]' },
      { label: '고통스러운', value: '[Situation: In pain, moaning, holding back physical suffering, restricted airflow, strained vocalization]' },
      { label: '기계적인', value: '[Situation: Robotic, monotone, flat pitch, no emotional variance, consistent inter-word intervals, informational]' },
    ]
  }
];

export const GENRE_SAMPLES: Record<string, Record<string, string>> = {
  shorts: { '표준어': "나레이션: 단 1분 만에 끝내는 초간단 파스타 레시피! 지금 바로 시작합니다!", '경상도': "나레이션: 마, 밥은 묵었나? 날도 더운디 퍼뜩 드가서 씻고 쉬라 캐라.", '전라도': "나레이션: 아따, 날씨가 겁나게 좋아부러야. 싸게싸게 와서 밥 한술 뜨랑께!", '충청도': "나레이션: 그거 그렇게 급하게 해서 뭐한대유~ 괜찮으니께 천천히 해유.", '강원도': "나레이션: 날래 이리로 와보드래요. 옥수수가 아주 맛나게 쪄졌드래요.", '제주도': "나레이션: 맨도롱 또똣할 때 후루룩 마십서. 맛이 아주 좋수다." },
  news: { '표준어': "앵커: 안녕하십니까. 오늘의 주요 소식입니다.", '경상도': "앵커: 마, 밥은 묵었나? 날도 더운디 퍼뜩 드가서 씻고 쉬라 캐라.", '전라도': "앵커: 아따, 날씨가 겁나게 좋아부러야. 싸게싸게 와서 밥 한술 뜨랑께!", '충청도': "앵커: 그거 그렇게 급하게 해서 뭐한대유~ 괜찮으니께 천천히 해유.", '강원도': "앵커: 날래 이리로 와보드래요. 옥수수가 아주 맛나게 쪄졌드래요.", '제주도': "앵커: 맨도롱 또똣할 때 후루룩 마십서. 맛이 아주 좋수다." },
  ads: { '표준어': "성우: 당신의 일상을 바꾸는 단 하나의 프리미엄 선택.", '경상도': "성우: 마, 밥은 묵었나? 날도 더운디 퍼뜩 드가서 씻고 쉬라 캐라.", '전라도': "성우: 아따, 날씨가 겁나게 좋아부러야. 싸게싸게 와서 밥 한술 뜨랑께!", '충청도': "성우: 그거 그렇게 급하게 해서 뭐한대유~ 괜찮으니께 천천히 해유.", '강원도': "성우: 날래 이리로 와보드래요. 옥수수가 아주 맛나게 쪄졌드래요.", '제주도': "성우: 맨도롱 또똣할 때 후루룩 마십서. 맛이 아주 좋수다." },
  animation: { '표준어': "토끼: 거북아, 네가 어떻게 나를 이길 수 있어?", '경상도': "토끼: 마, 밥은 묵었나? 날도 더운디 퍼뜩 드가서 씻고 쉬라 캐라.", '전라도': "토끼: 아따, 날씨가 겁나게 좋아부러야. 싸게싸게 와서 밥 한술 뜨랑께!", '충청도': "토끼: 그거 그렇게 급하게 해서 뭐한대유~ 괜찮으니께 천천히 해유.", '강원도': "토끼: 날래 이리로 와보드래요. 옥수수가 아주 맛나게 쪄졌드래요.", '제주도': "토끼: 맨도롱 또똣할 때 후루룩 마십서. 맛이 아주 좋수다." },
  rapper: { '표준어': "래퍼: 예, 내가 누군지 알아? 체크해, 원 투!", '경상도': "래퍼: 마, 밥은 묵었나? 날도 더운디 퍼뜩 드가서 씻고 쉬라 캐라.", '전라도': "래퍼: 아따, 날씨가 겁나게 좋아부러야. 싸게싸게 와서 밥 한술 뜨랑께!", '충청도': "래퍼: 그거 그렇게 급하게 해서 뭐한대유~ 괜찮으니께 천천히 해유.", '강원도': "래퍼: 날래 이리로 와보드래요. 옥수수가 아주 맛나게 쪄졌드래요.", '제주도': "래퍼: 맨도롱 또똣할 때 후루룩 마십서. 맛이 아주 좋수다." }
};

export const MEDIA_STYLES = [
  { id: 'shorts', label: '숏폼' },
  { id: 'news', label: '뉴스' },
  { id: 'podcast', label: '팟캐스트' },
  { id: 'ars', label: '안내음성' },
  { id: 'ads', label: '광고/마케팅' },
];

export const PURPOSE_STYLES = [
  { id: 'event', label: '이벤트' },
  { id: 'animation', label: '애니메이션' },
  { id: 'audiobook', label: '오디오북' },
  { id: 'conversation', label: '대화' },
  { id: 'documentary', label: '다큐멘터리' },
  { id: 'education', label: '교육' },
  { id: 'rapper', label: '래퍼' },
];

export const DIALECTS = ['표준어', '경상도', '전라도', '충청도', '강원도', '제주도'];
export const AGES = ['유아', '어린이', '청년', '중년', '노년'];
export const GENDERS = ['남성', '여성', '중성'] as const;

export const EMOTIONS = ['평범함', '기쁨', '슬픔', '분노', '놀람', '다정함', '냉정함'];
export const STYLES = ['일반', '나레이션', '라디오', '애니메이션', '오디오북'];
export const PROFESSIONAL_PRESETS = ['뉴스 앵커', '다큐멘터리 해설', '라디오 DJ', '강의/교육', '광고 성우'];
