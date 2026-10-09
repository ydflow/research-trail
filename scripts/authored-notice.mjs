// Only for ResearchTrail-authored prose, never imported license originals.
// Git checkout may alter CRLF; content, spaces and lone CR remain significant.
export function sameAuthoredNotice(before, after) {
  const text = bytes => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replaceAll('\r\n', '\n');
  return text(before) === text(after);
}
