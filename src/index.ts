import { Context, Schema, sleep } from 'koishi';
import { } from 'koishi-plugin-word-core';

export const name = 'word-core-grammar-basic';

export interface Config { }

export const Config: Schema<Config> = Schema.object({});

const randomNumber = (minNumber: number, maxNumber: number): number => {
  return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
};

export function apply(ctx: Context) {
  // write your plugin here
  ctx.inject(['word'], ctx => {
    if (!ctx.word) { return; }

    // 谁可以为that

    // 增加物品
    // 语法: (+:物品名称:数量:用户id?)
    // 语法: (+:物品名称:数量~数量:用户id?)
    // 语法: (+:物品名称:数量%:用户id?)
    // 谁可以为that，匹配问中第一个at的id
    ctx.word.statement.addStatement('+', async (inData, session) => {
      const saveCell = inData.wordData.saveDB;
      let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
      if (uid == 'that') { uid = inData.matchs.id[0]; }

      const item = inData.args[0];
      const number = await ctx.word.user.getItem(uid, saveCell, item);

      const addNumTemp = inData.args[1];
      let addNum = 0;
      if (!/^\d+$/.test(addNumTemp) && !/^\d+\~\d+$/.test(addNumTemp) && !/^\d+%$/.test(addNumTemp)) { throw `物品 [${item}] 添加的数量 [${addNum}] 不为数字或标识`; }

      switch (true)
      {
        case (/^\d+$/.test(addNumTemp)): {
          addNum = Number(addNum);
          break;
        }

        case (/^\d+\~\d+$/.test(addNumTemp)): {
          const matchData = addNumTemp.match(/^(\d+)\~(\d+)$/);

          addNum = randomNumber(Number(matchData[1]), Number(matchData[2]));

          break;
        }
        case (/^\d+%$/.test(addNumTemp)): {
          const matchData = addNumTemp.match(/^(\d+)%$/);
          addNum = number * Number(matchData[1]) / 100;
          break;
        }

        default: { break; }
      }

      const now: number = number + Number(addNum);

      const ok = await ctx.word.user.updateItem(uid, saveCell, item, now);

      if (ok)
      {
        return String(addNum);
      } else
      {
        throw `物品 [${item}] 添加失败`;
      }
    });

    // 减少物品
    // 语法: (-:物品名称:数量:用户id?)
    // 语法: (-:物品名称:数量~数量:用户id?)
    // 语法: (-:物品名称:数量%:用户id?)
    // 谁可以为that，匹配问中第一个at的id
    ctx.word.statement.addStatement('-', async (inData, session) => {
      const saveCell = inData.wordData.saveDB;
      let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
      if (uid == 'that') { uid = inData.matchs.id[0]; }

      const item = inData.args[0];
      const number = await ctx.word.user.getItem(uid, saveCell, item);

      const rmNumTemp = inData.args[1];
      let rmNum = 0;
      if (!/^\d+$/.test(rmNumTemp) && !/^\d+\~\d+$/.test(rmNumTemp) && !/^\d+%$/.test(rmNumTemp)) { throw `物品 [${item}] 添加的数量 [${rmNum}] 不为数字或标识`; }

      switch (true)
      {
        case (/^\d+$/.test(rmNumTemp)): {
          rmNum = Number(rmNum);
          break;
        }

        case (/^\d+\~\d+$/.test(rmNumTemp)): {
          const matchData = rmNumTemp.match(/^(\d+)\~(\d+)$/);
          rmNum = randomNumber(Number(matchData[1]), Number(matchData[2]));
          break;
        }
        case (/^\d+%$/.test(rmNumTemp)): {
          const matchData = rmNumTemp.match(/^(\d+)%$/);
          rmNum = number * Number(matchData[1]);
          break;
        }

        default: { break; }
      }

      // 我觉得需要个数据缓存，而不是刚刚完成就保存

      const now: number = number - Number(rmNum);
      if (now < 0) { return inData.parPack.end(`物品 [${item}] 数量不足`); }
      const ok = await ctx.word.user.updateItem(uid, saveCell, item, now);

      if (ok)
      {
        return String(rmNum);
      } else
      {
        return inData.parPack.end(`物品 [${item}] 减少失败`);
      }
    });

    // 判断物品数量
    // 语法: (?:物品名称:关系:数量:信息?:用户id?)
    // 谁可以为that，匹配问中第一个at的id
    // 不写可选元素时，目标为整个语句
    // 不写信息和谁的时候是表明为当前语句的判断
    ctx.word.statement.addStatement('?', async (inData, session) => {
      const saveCell = inData.wordData.saveDB;
      let uid = (inData.args.length >= 5) ? inData.args[4] : session.userId;
      if (uid == 'that') { uid = inData.matchs.id[0]; }

      const item = inData.args[0];
      const number = await ctx.word.user.getItem(uid, saveCell, item);

      const inputNumber = inData.args[2];
      if (!/^\d+$/.test(inputNumber)) { return inData.parPack.end(); }

      const relationship = inData.args[1];
      if (relationship == '=' || relationship == '>' || relationship == '<' || relationship == '!=' || relationship == '>=' || relationship == '<=')
      {
        // 判断符号符合预期
      } else
      {
        return inData.parPack.end();
      }

      if (eval(`${number}${relationship}${inputNumber}`))
      {
        if (inData.args.length >= 4)
        {
          if (inData.args[3] == '')
          {
            return inData.parPack.next();
          } else { return inData.args[3]; }
        }
        else
        {
          return '';
        }
      }
      else
      {
        if (inData.args.length >= 4)
        {
          if (inData.args[3] == '')
          {
            return inData.parPack.next();
          } else { return ''; }
        } else
        {
          return inData.parPack.next();
        }
      }
    });

    // 延迟发送信息
    // 语法(&:时间:消息？)
    // 不写可选元素时，目标为整个语句
    // 单位是s
    ctx.word.statement.addStatement('&', async (inData, session) => {
      if (!/^\d+$/.test(inData.args[0])) { return inData.parPack.end('时间格式错误'); }
      await sleep(Number(inData.args[0]) * 10);
      if (inData.args.length > 1)
      {
        return inData.args[1];
      } else
      {
        return '';
      }
    });

    // 返回背包数量
    // 语法：(#:物品名称:用户id?)
    // 谁可以为that，匹配问中第一个at的id
    ctx.word.statement.addStatement('#', async (inData, session) => {
      let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
      if (uid == 'that') { uid = inData.matchs.id[0]; }

      const saveCell = inData.wordData.saveDB;
      const item = inData.args[0];
      const number = await ctx.word.user.getItem(uid, saveCell, item);

      return String(number);
    });

    // 概率判断
    // 语法：(%:概率(0~100):消息？)
    ctx.word.statement.addStatement('%', async (inData, session) => {
      if (!/^\d+$/.test(inData.args[0]) || Number(inData.args[0]) < 0 || Number(inData.args[0]) > 0) { return inData.parPack.end('概率格式错误'); }
      const random = (minNumber: number, maxNumber: number): number => {
        return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
      };

      const randomNumber = random(0, 100);

      let msg = '';
      if (inData.args.length > 1) { msg = inData.args[1]; }

      if (randomNumber > Number(inData.args[0]))
      {

        return msg;
      } else
      {
        if (inData.args.length > 1)
        {
          return '';
        } else
        {
          return inData.parPack.end('判定失败');
        }
      }
    });

    // 我的name
    ctx.word.statement.addStatement('@this', async (inData, session) => {
      return session.username;
    });

    // 我的id
    ctx.word.statement.addStatement('#this', async (inData, session) => {
      return session.userId;
    });

    // 对方的name
    ctx.word.statement.addStatement('@that', async (inData, session) => {
      if (!inData.matchs.hasOwnProperty('name')) { return; }
      return inData.matchs.name[0];
    });

    // 对方的id
    ctx.word.statement.addStatement('#that', async (inData, session) => {
      if (!inData.matchs.hasOwnProperty('id')) { return; }
      return inData.matchs.id[0];
    });

    // 隐式返回
    ctx.word.statement.addStatement('!', async () => {
      return '';
    });

    // cd装置
    ctx.word.statement.addStatement('^', async (inData, session) => {

    });

    // 输入数
    // 四则
  });
}
