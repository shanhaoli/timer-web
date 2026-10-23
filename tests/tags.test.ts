import { describe, expect, it } from 'vitest'
import { extractTags, segmentText } from '../src/features/log/tags'

describe('extractTags', () => {
  it('提取中文与英文标签', () => {
    expect(extractTags('写论文 #论文 讨论 #design-review')).toEqual(['论文', 'design-review'])
  })

  it('去重', () => {
    expect(extractTags('#论文 写 #论文')).toEqual(['论文'])
  })

  it('无标签返回空数组', () => {
    expect(extractTags('没有标签的普通文本')).toEqual([])
  })

  it('单独的 # 号不构成标签', () => {
    expect(extractTags('a # b')).toEqual([])
  })

  it('数字与下划线可以组成标签', () => {
    expect(extractTags('v2_0 #v2_0-x')).toEqual(['v2_0-x'])
  })
})

describe('segmentText', () => {
  it('拆分普通文本与标签', () => {
    const segments = segmentText('写 #论文 引言')
    expect(segments).toEqual([
      { text: '写 ', tag: false },
      { text: '#论文', tag: true },
      { text: ' 引言', tag: false },
    ])
  })

  it('纯文本只有一段', () => {
    expect(segmentText('hello')).toEqual([{ text: 'hello', tag: false }])
  })

  it('空文本返回空数组', () => {
    expect(segmentText('')).toEqual([])
  })
})
