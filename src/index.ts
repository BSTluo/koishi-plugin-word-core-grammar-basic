import { Context, Schema } from 'koishi';
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

    // 增加物品
    // 语法: (+:物品名称:数量:谁？)
    // 语法: (+:物品名称:数量~数量:谁？)
    // 语法: (+:物品名称:数量%:谁？)
    ctx.word.statement.addStatement('+', async (inData, session) => {
      const saveCell = inData.wordData.saveDB;
      const uid = (inData.args.length >= 3) ? inData.args[2] : session.uid;

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
          addNum = number * Number(matchData[1]);
          break;
        }

        default: { break; }
      }



      const now: number = number + Number(addNum);
      const ok = await ctx.word.user.updateItemTemp(uid, saveCell, item, now);

      if (ok)
      {
        return String(now);
      } else
      {
        throw `物品 [${item}] 添加失败`;
      }
    });

    // 减少物品
    // 语法: (-:物品名称:数量:谁？)
    // 语法: (-:物品名称:数量~数量:谁？)
    // 语法: (-:物品名称:数量%:谁？)
    ctx.word.statement.addStatement('-', async (inData, session) => {
      const saveCell = inData.wordData.saveDB;
      const uid = (inData.args.length >= 3) ? inData.args[2] : session.uid;

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
      const ok = await ctx.word.user.updateItemTemp(uid, saveCell, item, now);

      if (ok)
      {
        return String(now);
      } else
      {
        throw `物品 [${item}] 添加失败`;
      }
    });
  });
}
