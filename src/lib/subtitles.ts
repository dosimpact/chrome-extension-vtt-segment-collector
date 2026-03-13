import type { CaptionBuffer, Cue } from './types';

export function isLikelyVttRequest(url: string, contentType = '', body = ''): boolean {
  const normalized = url.toLowerCase();
  const bodyPrefix = body.trim().slice(0, 32).toUpperCase();

  if (normalized.startsWith('data:')) {
    return decodeDataUrlBody(url).trim().toUpperCase().startsWith('WEBVTT');
  }

  if (!normalized.includes('.vtt')) return false;
  if (normalized.includes('.m4s')) return false;
  return contentType.toLowerCase().includes('vtt') || bodyPrefix.startsWith('WEBVTT');
}

function toSeconds(value: string): number {
  const [hours, minutes, rest] = value.split(':');
  const seconds = Number.parseFloat(rest.replace(',', '.'));
  return Number(hours) * 3600 + Number(minutes) * 60 + seconds;
}

export function parseVttCues(text: string): Cue[] {
  const blocks = text
    .replace(/\r/g, '')
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !block.startsWith('WEBVTT'));

  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timeIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeIndex === -1) continue;
    const [startText, endText] = lines[timeIndex].split('-->').map((part) => part.trim().split(' ')[0]);
    const cueText = lines.slice(timeIndex + 1).join('\n').trim();
    if (!cueText) continue;
    const start = toSeconds(startText);
    const end = toSeconds(endText);
    cues.push({
      id: `${start}-${end}-${cueText}`,
      start,
      end,
      text: cueText
    });
  }

  return cues;
}

export function upsertTrack(track: CaptionBuffer, cues: Cue[]): CaptionBuffer {
  const cueMap = { ...track.cueMap };
  const merged = [...track.cues];

  for (const cue of cues) {
    if (cueMap[cue.id]) continue;
    cueMap[cue.id] = true;
    merged.push(cue);
  }

  merged.sort((left, right) => left.start - right.start || left.end - right.end || left.text.localeCompare(right.text));

  return {
    ...track,
    cueMap,
    cues: merged,
    previewText: merged[0]?.text ?? '',
    lastUpdatedAt: Date.now()
  };
}

export function cuesToVtt(cues: Cue[]): string {
  const lines = ['WEBVTT', ''];
  cues.forEach((cue, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`);
    lines.push(cue.text);
    lines.push('');
  });
  return lines.join('\n');
}

export function cuesToTxt(cues: Cue[]): string {
  return cues.map((cue) => cue.text).join('\n');
}

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
}

function decodeDataUrlBody(url: string): string {
  const [, payload = ''] = url.split(',', 2);
  if (!payload) return '';
  try {
    return atob(payload);
  } catch {
    return '';
  }
}
