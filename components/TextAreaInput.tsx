
import React, { useRef } from 'react';
import { ACTING_TAGS } from '../constants';

interface TextAreaInputProps {
  text: string;
  setText: (text: string) => void;
  disabled: boolean;
  dark?: boolean;
  onTransform?: () => void; // AI 변환 함수 추가
  isTransforming?: boolean;
  hideTags?: boolean; // 태그 숨김 옵션 추가
}

export const TextAreaInput: React.FC<TextAreaInputProps> = ({ text, setText, disabled, dark, onTransform, isTransforming, hideTags }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (tagValue: string) => {
    if (textAreaRef.current) {
      const startPos = textAreaRef.current.selectionStart;
      const endPos = textAreaRef.current.selectionEnd;
      const newText = text.substring(0, startPos) + tagValue + " " + text.substring(endPos);
      setText(newText);
      // 포커스 유지
      setTimeout(() => textAreaRef.current?.focus(), 0);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-2 pt-2">
        <div className="flex flex-wrap gap-2">
          {!hideTags && ACTING_TAGS.map((tag) => (
            <button
              key={tag.label}
              onClick={() => insertTag(tag.value)}
              disabled={disabled}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all shadow-sm flex items-center gap-1.5 ${
                dark 
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500 hover:text-white' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
        
        {onTransform && (
          <button
            onClick={onTransform}
            disabled={disabled || isTransforming}
            className={`px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ml-auto`}
          >
            {isTransforming ? (
              <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : '🪄'}
            <span>AI 사투리 변환</span>
          </button>
        )}
      </div>
      <textarea
        ref={textAreaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || isTransforming}
        className={`flex-grow w-full p-8 border rounded-2xl outline-none resize-none text-lg font-medium leading-relaxed transition-all ${
          dark
            ? 'bg-[#111827] border-gray-700 text-gray-100 focus:border-purple-500 placeholder:text-gray-700'
            : 'bg-[#fcfdfe] border-gray-100 text-gray-800 focus:border-blue-500 placeholder:text-gray-300'
        }`}
        placeholder="대본을 입력하세요... (화자이름: 대사 형식)"
      />
    </div>
  );
};
