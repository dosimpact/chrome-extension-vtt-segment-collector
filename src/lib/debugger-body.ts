export function decodeDebuggerBody(body: string, base64Encoded: boolean): string {
  if (!base64Encoded) return body;

  const binary = atob(body);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
