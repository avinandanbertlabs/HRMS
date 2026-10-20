export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
