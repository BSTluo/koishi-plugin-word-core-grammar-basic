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