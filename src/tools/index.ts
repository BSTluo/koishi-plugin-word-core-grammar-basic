export const numberToChinese = (num: number) =>
{
  const units = ['', '十', '百', '千', '万', '亿', '兆'];
  const chars = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  if (num === 0) return '零';

  let str = '';
  let unitPos = 0; // 单位下标
  let zero = true; // 是否需要添加“零”

  while (num > 0)
  {
    const digit = num % 10; // 获取最后一位数字
    if (digit === 0)
    {
      if (!zero)
      {
        zero = true;
        str = chars[digit] + str;
      }
    } else
    {
      zero = false;
      str = chars[digit] + (unitPos > 0 ? units[unitPos] : '') + str;
    }
    unitPos++;
    num = Math.floor(num / 10); // 去掉最后一位数字
  }

  // 特殊情况处理，例如 10 应显示为 “十” 而不是 “一十”
  str = str.replace(/^一十/, '十');

  return str;
};

export const isNumeric = (str: string) =>
{
  return !isNaN(Number(str)) && str.trim() !== ""; // 排除空字符串
};

export const randomNumber = (minNumber: number, maxNumber: number): number =>
{
  return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
};

export const safeAddition = (a: number, b: number) =>
{
  const MAX_SAFE = Number.MAX_SAFE_INTEGER;
  const MIN_SAFE = Number.MIN_SAFE_INTEGER;

  // 检查 a 和 b 是否在安全范围内
  if (a > MAX_SAFE || a < MIN_SAFE)
  {
    return `Error: a (${a}) is out of safe range.`;
  }
  if (b > MAX_SAFE || b < MIN_SAFE)
  {
    return `Error: b (${b}) is out of safe range.`;
  }

  // 计算结果
  const result = a + b;

  // 检查结果是否在安全范围内
  if (result > MAX_SAFE || result < MIN_SAFE)
  {
    return `Error: result (${result}) is out of safe range.`;
  }

  // 返回安全的结果
  return `Result: ${result}`;
};