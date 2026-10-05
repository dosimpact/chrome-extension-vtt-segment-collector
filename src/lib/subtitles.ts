import type { CaptionBuffer, Cue } from './types';

const CP1252_EXTRA_BYTE_MAP: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  'ƒ': 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  'ˆ': 0x88,
  '‰': 0x89,
  'Š': 0x8a,
  '‹': 0x8b,
  'Œ': 0x8c,
  'Ž': 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  'š': 0x9a,
  '›': 0x9b,
  'œ': 0x9c,
  'ž': 0x9e,
  'Ÿ': 0x9f
};

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
    .map((block) => trimAsciiWhitespace(block))
    .filter(Boolean)
    .filter((block) => !block.startsWith('WEBVTT'));

  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timeIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeIndex === -1) continue;
    const [startText, endText] = lines[timeIndex].split('-->').map((part) => part.trim().split(' ')[0]);
    const cueText = trimAsciiWhitespace(normalizeCueText(lines.slice(timeIndex + 1).join('\n')));
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
  const cueMap: Record<string, true> = {};
  const merged: Cue[] = [];

  for (const cue of [...track.cues, ...cues].map(normalizeCue)) {
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
    const text = normalizeCueText(cue.text);
    lines.push(String(index + 1));
    lines.push(`${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`);
    lines.push(text);
    lines.push('');
  });
  return lines.join('\n');
}

export function cuesToTxt(cues: Cue[]): string {
  return cues.map((cue) => normalizeCueText(cue.text)).join('\n');
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

export function normalizeCueText(text: string): string {
  if (!text || !containsSuspiciousMojibake(text)) return text;

  const bytes = encodePotentialCp1252Bytes(text);
  if (!bytes) return text;

  try {
    const repaired = decodeUtf8Bytes(bytes);
    return scoreTextQuality(repaired) > scoreTextQuality(text) + 4 ? repaired : text;
  } catch {
    return text;
  }
}

function normalizeCue(cue: Cue): Cue {
  const text = normalizeCueText(cue.text);
  return {
    ...cue,
    text,
    id: `${cue.start}-${cue.end}-${text}`
  };
}

function containsSuspiciousMojibake(text: string): boolean {
  return /[\u0080-\u009fÃÂâÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿœŠšžŸ]/.test(text);
}

function encodePotentialCp1252Bytes(text: string): Uint8Array | null {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }

    const mapped = CP1252_EXTRA_BYTE_MAP[char];
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }

    return null;
  }

  return Uint8Array.from(bytes);
}

function scoreTextQuality(text: string): number {
  let score = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (char === '�') {
      score -= 8;
      continue;
    }

    if (code >= 0xac00 && code <= 0xd7a3) {
      score += 4;
      continue;
    }

    if ((code >= 0x20 && code <= 0x7e) || char === '\n' || char === '\r' || char === '\t') {
      score += 1;
      continue;
    }

    if ((code >= 0x00c0 && code <= 0x024f) || (code >= 0x4e00 && code <= 0x9fff)) {
      score += 0.5;
      continue;
    }

    if ((code >= 0x00 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f)) {
      score -= 5;
    }
  }

  return score;
}

function decodeUtf8Bytes(bytes: Uint8Array): string {
  let encoded = '';

  for (const byte of bytes) {
    encoded += `%${byte.toString(16).padStart(2, '0')}`;
  }

  return decodeURIComponent(encoded);
}

function trimAsciiWhitespace(value: string): string {
  return value.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
}
