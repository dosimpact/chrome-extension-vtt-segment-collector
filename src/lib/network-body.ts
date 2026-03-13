export function decodeCapturedBody(responseType: string, body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }

  if (responseType === 'arraybuffer' && isArrayBufferLike(body)) {
    return new TextDecoder().decode(new Uint8Array(body));
  }

  return '';
}

function isArrayBufferLike(value: unknown): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]';
}
