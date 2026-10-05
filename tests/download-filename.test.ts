import { describe, expect, it } from 'vitest';
import { createCaptionFilenameBase } from '../src/lib/download-filename';

describe('createCaptionFilenameBase', () => {
  it('uses the page url hostname and path for filenames', () => {
    expect(createCaptionFilenameBase('https://www.example.com/watch/episode-1')).toBe('example.com_watch_episode-1');
  });

  it('includes query parameters when present', () => {
    expect(createCaptionFilenameBase('https://media.example.com/player?id=42&lang=en')).toBe('media.example.com_player_id_42_lang_en');
  });

  it('falls back when the url is missing or invalid', () => {
    expect(createCaptionFilenameBase(null, 'Sample Title')).toBe('Sample Title');
    expect(createCaptionFilenameBase('not-a-url', 'Sample Title')).toBe('Sample Title');
  });
});
