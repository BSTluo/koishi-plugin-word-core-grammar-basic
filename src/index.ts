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
          addNum = Number(addNumTemp);
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
          rmNum = Number(rmNumTemp);
          break;
        }

        case (/^\d+\~\d+$/.test(rmNumTemp)): {
          const matchData = rmNumTemp.match(/^(\d+)\~(\d+)$/);
          rmNum = randomNumber(Number(matchData[1]), Number(matchData[2]));
          break;
        }
        case (/^\d+%$/.test(rmNumTemp)): {
          const matchData = rmNumTemp.match(/^(\d+)%$/);
          rmNum = number * Number(matchData[1]) / 100;
          break;
        }

        default: { break; }
      }

      // 我觉得需要个数据缓存，而不是刚刚完成就保存

      const now: number = number - Number(rmNum);
      if (now < 0) { return inData.parPack.kill(`物品 [${item}] 数量不足`); }
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
    // 物品名称现在支持数字
    // 谁可以为that，匹配问中第一个at的id
    // 不写可选元素时，目标为整个语句
    // 不写信息和谁的时候是表明为当前语句的判断
    ctx.word.statement.addStatement('?', async (inData, session) => {
      const saveCell = inData.wordData.saveDB;
      let uid = (inData.args.length >= 5) ? inData.args[4] : session.userId;
      if (uid == 'that') { uid = inData.matchs.id[0]; }

      const item = inData.args[0];
      let number: number;

      if (/^\d+$/.test(item))
      {
        number = Number(item);
      } else
      {
        number = await ctx.word.user.getItem(uid, saveCell, item);
      }

      number = (number) ? number : 0;

      const inputNumber = inData.args[2];
      if (!/^\d+$/.test(inputNumber)) { return inData.parPack.end(); }

      const relationship = inData.args[1];
      if (relationship == '==' || relationship == '>' || relationship == '<' || relationship == '!=' || relationship == '>=' || relationship == '<=')
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
            return '';
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
          } else { return ''; } // [bug] 内部不应该执行，但是执行且无法撤销
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
      let number = await ctx.word.user.getItem(uid, saveCell, item);

      number = (number) ? number : 0;

      return String(number);
    });

    // 概率判断
    // 语法：(%:概率(0~100):消息?)
    ctx.word.statement.addStatement('%', async (inData, session) => {
      if (!/^\d+$/.test(inData.args[0]) || Number(inData.args[0]) < 0 || Number(inData.args[0]) > 100) { return inData.parPack.end('概率格式错误'); }
      const random = (minNumber: number, maxNumber: number): number => {
        return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
      };

      const randomNumber = random(0, 100);

      let msg = '';
      if (inData.args.length > 1) { msg = inData.args[1]; }

      if (Number(inData.args[0]) > randomNumber)
      {
        return msg;
      } else
      {
        if (inData.args.length > 1)
        {
          return inData.parPack.end('');
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
    // 语法：(cd:事件名称:cd时间:消息?)
    // 若是信息省略则代表忽略整句话
    ctx.word.statement.addStatement('cd', async (inData, session) => {
      const uid = session.userId;
      const userConfig = await ctx.word.user.getConfig(uid);

      const eventName = inData.args[0];

      const time = inData.args[1];
      if (!/^\d+$/.test(time)) { return inData.parPack.end('cd时间输入错误'); }


      if (!userConfig[eventName])
      {
        userConfig[eventName] = Number(time);
        // 如果有消息项
        if (inData.args.length > 2)
        {
          return inData.args[2];
        } else
        { // 如果无消息项，再去看看同句内有没有能触发的

          return inData.parPack.next();
        }
      } else { return inData.parPack.next(); }
    });

    // 输入数
    // 定义一个输入trigger：
    if (!ctx.word.trigger.trigger['(数)'])
    {
      ctx.word.trigger.addTrigger('inputNumber', '(数)', '([\\d]+?)');
    }

    // 获取输入的数
    // 语法：(数:第几个输入的数)
    ctx.word.statement.addStatement('数', async (inData, session) => {
      const inputNumber = inData.args[0];
      console.log(inputNumber);
      if (!/^\d+$/.test(inputNumber)) { return inData.parPack.end('获取输入数的输入参数不正确'); }

      const data = inData.matchs.inputNumber[Number(inputNumber) - 1];
      if (!data) { return inData.parPack.end('未获取到输入的数'); }

      return data;
    });

    // 四则
    // 语法：(算:数1:+-*/:数2)
    ctx.word.statement.addStatement('算', async (inData, session) => {
      const numArgs1 = inData.args[0];
      const numArgs2 = inData.args[2];
      const Operator = inData.args[1];
    });

    // 随机数(~:a:b)生成a~b的随机数
    // 获取机器人昵称(称)
    // 禁止解析区域(/:信息?)
    // 设置物品为数组(a+:物品值:目标?/that)
    // 查询物品为数组的项(a#:物品:谁?:某一项?:到某一项随机?/all)

    // 获取时间(time:显示类型?)【1.时间戳 2. 年.月.日 3. 时.分 4. 秒】
    // ${day.getFullYear()}.${day.getMonth()}.${day.getDate()} ${day.getHours()}:${day.getMinutes()}:${day.getMilliseconds()}

    // 鉴权(p:权限名:消息?)
    // 清空一个人的数据(kill:目标)
  });
}
