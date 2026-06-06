import pinyin from 'pinyin'

export function generateDisciplineCode(name: string): string {
  if (!name) return ''
  const result = pinyin(name, { style: pinyin.STYLE_FIRST_LETTER })
  return result.map((part) => part[0].toUpperCase()).join('')
}
