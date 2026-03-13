import { describe, expect, it } from 'vitest';
import { decodeDebuggerBody } from '../src/lib/debugger-body';

describe('decodeDebuggerBody', () => {
  it('decodes plain text bodies as-is', () => {
    expect(decodeDebuggerBody('WEBVTT', false)).toBe('WEBVTT');
  });

  it('decodes base64 utf-8 bodies without mojibake', () => {
    const base64 = '7Iuc7J6l';
    expect(decodeDebuggerBody(base64, true)).toBe('시장');
  });
});
