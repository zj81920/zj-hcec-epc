/**
 * 合同相关工具函数
 */

/**
 * 生成合同编号
 * 格式：PC-YYYYMMDD-NNN（NNN 是当天序号，3 位补 0）
 */
export function generateContractNo(seq: number): string {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `PC-${y}${m}${d}-${String(seq).padStart(3, '0')}`
}

/**
 * 人民币金额转大写中文
 * 例如：1234.56 → "壹仟贰佰叁拾肆元伍角陆分"
 */
export function amountToChinese(amount: number): string {
  if (amount === 0) return '零元整'
  if (amount < 0) return '负' + amountToChinese(-amount)

  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const intUnits = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿', '兆']

  const fixed = amount.toFixed(2)
  const [intPart, decPart] = fixed.split('.')

  // 整数部分
  let intResult = ''
  const intStr = intPart
  const intLen = intStr.length

  // 按 4 位一组从右往左切分
  const groups: string[] = []
  for (let i = intLen; i > 0; i -= 4) {
    groups.unshift(intStr.slice(Math.max(0, i - 4), i))
  }

  groups.forEach((group, gi) => {
    let groupResult = ''
    const gLen = group.length
    for (let i = 0; i < gLen; i++) {
      const digit = parseInt(group[i], 10)
      const unit = intUnits[gLen - 1 - i]
      if (digit === 0) {
        if (i < gLen - 1 && parseInt(group[i + 1], 10) !== 0) {
          groupResult += '零'
        }
      } else {
        groupResult += digits[digit] + unit
      }
    }
    // 去掉组末尾的零
    groupResult = groupResult.replace(/零+$/, '')
    if (groupResult) {
      intResult += groupResult + bigUnits[groups.length - 1 - gi]
    } else if (intResult && !intResult.endsWith('零')) {
      // 空组但前后有数字，需要补零
      intResult += '零'
    }
  })

  if (!intResult) intResult = '零'
  intResult += '元'

  // 小数部分
  const jiao = parseInt(decPart[0], 10)
  const fen = parseInt(decPart[1], 10)
  if (jiao === 0 && fen === 0) {
    intResult += '整'
  } else {
    if (jiao > 0) intResult += digits[jiao] + '角'
    else if (fen > 0) intResult += '零'
    if (fen > 0) intResult += digits[fen] + '分'
  }

  return intResult
}

/**
 * 解析付款比例字符串（例如 "30:40:20:10"）
 */
export function parsePaymentTerms(terms: string): {
  prepay: number
  delivery: number
  accept: number
  warranty: number
} {
  const parts = terms.split(':').map((s) => parseInt(s, 10) || 0)
  return {
    prepay: parts[0] || 0,
    delivery: parts[1] || 0,
    accept: parts[2] || 0,
    warranty: parts[3] || 0,
  }
}
