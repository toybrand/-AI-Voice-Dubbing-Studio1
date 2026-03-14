
import React, { useState } from 'react';
import { CastMap, CastMember } from '../types';
import { AVAILABLE_VOICES } from '../constants';
import { generatePreviewSpeech } from '../services/geminiService';

interface CastingBoardProps {
  speakers: string[];
  cast: CastMap;
  updateCast: (name: string, updates: Partial<CastMember>) => void;
  disabled: boolean;
  theme?: 'light' | 'dark';
}

export const CastingBoard: React.FC<CastingBoardProps> = ({ 
    speakers, cast, updateCast, disabled, theme = 'light' 
}) => {
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const handlePreview = async (name: string) => {
    if (disabled || previewingId) return;
    const member = cast[name];
    if (!member) return;

    try {
      setPreviewingId(name);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await generatePreviewSpeech(name, member, audioContext);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      source.onended = () => setPreviewingId(null);
    } catch (e) {
      setPreviewingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {speakers.length === 0 ? (
        <div className={`text-center py-10 text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          대본을 입력하면 캐릭터가 자동으로 감지됩니다.
        </div>
      ) : (
        speakers.map((name) => {
          const member = cast[name] || { voiceId: 'Kore', pitch: 0, speed: 1.0, styleInstruction: "" };
          return (
            <div key={name} className={`rounded-2xl p-6 border transition-all shadow-lg ${
              isDark ? 'bg-[#374151] border-gray-700/50 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    isDark ? 'bg-gray-600 text-gray-300' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {name.substring(0,1)}
                  </div>
                  <h3 className="font-bold text-lg">{name}</h3>
                </div>
                <button
                  onClick={() => handlePreview(name)}
                  disabled={!!previewingId || disabled}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isDark ? 'bg-gray-800 text-gray-300 hover:bg-black' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  미리듣기
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>목소리 선택</label>
                  <select
                    value={member.voiceId}
                    onChange={(e) => updateCast(name, { voiceId: e.target.value })}
                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                      isDark ? 'bg-gray-800 border-none text-white' : 'bg-gray-50 border border-gray-200 text-gray-700'
                    }`}
                  >
                    {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>스타일 지침 (ACTING GUIDE)</label>
                  <textarea
                    value={member.styleInstruction || ""}
                    onChange={(e) => updateCast(name, { styleInstruction: e.target.value })}
                    placeholder="한심한듯 한숨쉬며 말한다"
                    className={`w-full rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px] resize-none ${
                      isDark ? 'bg-gray-800 border-none text-white placeholder:text-gray-600' : 'bg-blue-50/30 border border-blue-100 text-blue-900 placeholder:text-blue-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-2">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>톤(Pitch)</span>
                      <span className="text-purple-400">+{member.pitch}</span>
                    </div>
                    <input
                      type="range" min="-5" max="5" step="1"
                      value={member.pitch}
                      onChange={(e) => updateCast(name, { pitch: parseInt(e.target.value) })}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-2">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>속도</span>
                      <span className="text-purple-400">x{member.speed}</span>
                    </div>
                    <input
                      type="range" min="0.5" max="2.0" step="0.1"
                      value={member.speed}
                      onChange={(e) => updateCast(name, { speed: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
