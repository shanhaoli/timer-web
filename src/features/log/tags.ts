// #标签 解析：匹配 Unicode 字母/数字/下划线/连字符，至少一个字符

const TAG_PATTERN = /#([\p{L}\p{N}_-]+)/gu

export function extractTags(text: string): string[] {
  const found: string[] = []
  for (const match of text.matchAll(TAG_PATTERN)) {
    if (!found.includes(match[1])) found.push(match[1])
  }
  return found
}

export interface TextSegment {
  text: string
  tag: boolean
}

// 把文本拆成普通片段与标签片段，用于渲染高亮
export function segmentText(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let last = 0
  for (const match of text.matchAll(TAG_PATTERN)) {
    const index = match.index ?? 0
    if (index > last) segments.push({ text: text.slice(last, index), tag: false })
    segments.push({ text: match[0], tag: true })
    last = index + match[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last), tag: false })
  return segments
}
