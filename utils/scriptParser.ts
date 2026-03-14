
import { ScriptSegment } from '../types';

/**
 * 대본 텍스트를 파싱하여 인물별 세그먼트와 고유 인물 리스트를 반환합니다.
 */
export function parseScript(text: string): { segments: ScriptSegment[]; speakers: string[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const segments: ScriptSegment[] = [];
  const speakersSet = new Set<string>();

  // 대화체 패턴 확인 (이름: 대사 또는 이름(지시) 대사)
  const hasDialoguePattern = lines.some(line => /^([^:]{1,10}):/.test(line) || /^([^\s\(:]{1,10})[\s]*\(.+?\)/.test(line));

  if (!hasDialoguePattern) {
    // 일반 대본인 경우: 전체를 하나의 나레이션으로 처리
    const fullText = lines.join('\n');
    speakersSet.add('나레이션');
    segments.push({ speaker: '나레이션', text: fullText, segmentStyle: "" });
  } else {
    // 대화체/애니메이션인 경우: 인물별 단락 분리
    let currentSpeaker = '나레이션';
    
    lines.forEach((line) => {
      const colonMatch = line.match(/^([^:]{1,10}):\s*(.+)$/);
      if (colonMatch) {
        const detectedSpeaker = colonMatch[1].trim();
        const content = colonMatch[2].trim();
        currentSpeaker = detectedSpeaker;
        speakersSet.add(detectedSpeaker);
        segments.push({ speaker: detectedSpeaker, text: content });
      } else {
        const bracketMatch = line.match(/^([^\s\(:]{1,10})[\s]*\(.+?\)\s*(.+)$/);
        if (bracketMatch) {
          const detectedSpeaker = bracketMatch[1].trim();
          const content = bracketMatch[2].trim();
          currentSpeaker = detectedSpeaker;
          speakersSet.add(detectedSpeaker);
          segments.push({ speaker: detectedSpeaker, text: content });
        } else {
          // 이전 화자에 연결
          if (segments.length > 0 && segments[segments.length - 1].speaker === currentSpeaker) {
            segments[segments.length - 1].text += '\n' + line;
          } else {
            if (segments.length === 0) speakersSet.add(currentSpeaker);
            segments.push({ speaker: currentSpeaker, text: line });
          }
        }
      }
    });
  }

  return {
    segments,
    speakers: Array.from(speakersSet),
  };
}
