
// Decodes a base64 string into a Uint8Array.
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodes raw PCM audio data into an AudioBuffer.
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // 데이터 버퍼의 일부분만 사용할 수 있으므로 offset과 length를 지정하여 Int16Array 생성
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Encodes a Uint8Array into a base64 string.
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Converts an AudioBuffer (containing PCM data) to a WAV file Blob.
export function pcmToWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result: Float32Array;
    if (audioBuffer.numberOfChannels === 2) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        result = new Float32Array(left.length + right.length);
        let index = 0, inputIndex = 0;
        while (index < result.length) {
            result[index++] = left[inputIndex];
            result[index++] = right[inputIndex];
            inputIndex++;
        }
    } else {
        result = audioBuffer.getChannelData(0);
    }

    const dataLength = result.length * (bitDepth / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    function writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    let offset = 0;
    // RIFF header
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + dataLength, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    // FMT sub-chunk
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, format, true); offset += 2;
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numChannels * (bitDepth / 8), true); offset += 4;
    view.setUint16(offset, numChannels * (bitDepth / 8), true); offset += 2;
    view.setUint16(offset, bitDepth, true); offset += 2;
    // data sub-chunk
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataLength, true); offset += 4;
    
    // write the PCM samples
    const pcm = new Int16Array(result.length);
    for (let i = 0; i < result.length; i++) {
        const s = Math.max(-1, Math.min(1, result[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    new Int16Array(buffer, 44).set(pcm);

    return new Blob([view], { type: 'audio/wav' });
}

// Concatenates multiple AudioBuffers into a single AudioBuffer sequentially.
export function concatenateAudioBuffers(
  buffers: AudioBuffer[],
  ctx: AudioContext
): AudioBuffer {
  if (buffers.length === 0) {
      return ctx.createBuffer(1, 1, 24000);
  }
  
  let totalLen = 0;
  for (const buf of buffers) totalLen += buf.length;
  
  const output = ctx.createBuffer(buffers[0].numberOfChannels, totalLen, buffers[0].sampleRate);
  
  for (let channel = 0; channel < output.numberOfChannels; channel++) {
     const outputData = output.getChannelData(channel);
     let offset = 0;
     for (const buf of buffers) {
         if (channel < buf.numberOfChannels) {
             outputData.set(buf.getChannelData(channel), offset);
         }
         offset += buf.length;
     }
  }
  return output;
}
