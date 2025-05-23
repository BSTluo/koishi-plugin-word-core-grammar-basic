import { Context, Schema, Session, clone, h, sleep } from 'koishi';
import { } from 'koishi-plugin-word-core';
import { isNumeric, numberToChinese, randomNumber } from './tools';

export const name = 'word-core-grammar-basic';

export interface Config
{
  Leaderboard: number;
  httpRequest: boolean;
}

export const Config: Schema<Config> = Schema.object({
  Leaderboard: Schema.number().default(10).description('排行榜最大显示数量'),
  httpRequest: Schema.boolean().default(true).description('是否启用http请求')
});

export const inject = ['word'];

export function apply(ctx: Context, config: Config)
{
  // 语法为判断结构时，addStatement为三参，返回值为true或者false

  // 增加物品
  // 语法: (+:物品名称:数量:用户id?)
  // 语法: (+:物品名称:数量~数量:用户id?)
  // 语法: (+:物品名称:数量%:用户id?)
  // 谁可以为that，匹配问中第一个at的id
  ctx.word.statement.addStatement('+', async (inData, session) =>
  {
    const saveCell = inData.wordData.saveDB;
    let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }
    // console.log('+', inData.args);

    const item = inData.args[0];
    // const number = await ctx.word.user.getItem(uid, saveCell, item);
    const number = await inData.internal.getItem(uid, saveCell, item);
    if (typeof number != 'number') { return number; }

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
    // const ok = await ctx.word.user.updateItem(uid, saveCell, item, now);
    await inData.internal.saveItem(uid, saveCell, item, Math.floor(now));

    return String(Math.floor(addNum));
    // if (ok)
    // {
    //   return String(rmNum);
    // } else
    // {
    //   return inData.parPack.kill(`物品 [${item}] 减少失败`);
    // }
  });

  // 减少物品
  // 语法: (-:物品名称:数量:用户id?)
  // 语法: (-:物品名称:数量~数量:用户id?)
  // 语法: (-:物品名称:数量%:用户id?)
  // 谁可以为that，匹配问中第一个at的id
  ctx.word.statement.addStatement('-', async (inData, session) =>
  {
    const saveCell = inData.wordData.saveDB;
    let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }
    // console.log('-', inData.args);

    const item = inData.args[0];
    // const number = await ctx.word.user.getItem(uid, saveCell, item);
    const number = await inData.internal.getItem(uid, saveCell, item);
    if (typeof number != 'number') { return number; }

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
    // const ok = await ctx.word.user.updateItem(uid, saveCell, item, now);

    await inData.internal.saveItem(uid, saveCell, item, Math.floor(now));

    return String(Math.floor(rmNum));
  });

  // 判断物品数量
  // 语法: (?:物品名称/数字:关系:数量:信息?:用户id?:否则信息?)
  // 物品名称现在支持数字
  // 谁可以为that，匹配问中第一个at的id
  // 不写可选元素时，目标为整个语句
  // 不写信息和谁的时候是表明为当前语句的判断
  ctx.word.statement.addStatement('?', async (inData, session) =>
  {
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
      const aaaa = await inData.internal.getItem(uid, saveCell, item);
      if (typeof aaaa != 'number') { return number; }
      number = aaaa;
    }
    number = (number) ? number : 0;

    const inputNumber = inData.args[2];
    if (!/^\d+$/.test(inputNumber)) { return inData.parPack.kill(`数量 [${inputNumber}] 不为数字`); }

    const relationship = inData.args[1];
    if (relationship == '==' || relationship == '>' || relationship == '<' || relationship == '!=' || relationship == '>=' || relationship == '<=')
    {
      // 判断符号符合预期
    } else
    {
      return inData.parPack.kill(`数量 [${relationship}] 不符合预期`);
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
        } else
        {
          if (inData.args.length >= 6)
          {
            return inData.args[5];
          } else { return ''; }

        }
      } else
      {
        return inData.parPack.next();
      }
    }
  }, [0, 1, 1, 1, 0, 1, 0]);

  // 延迟发送信息
  // 语法(&:时间:消息？)
  // 不写可选元素时，目标为整个语句
  // 单位是s
  ctx.word.statement.addStatement('&', async (inData, session) =>
  {
    if (!/^\d+$/.test(inData.args[0])) { return inData.parPack.kill('时间格式错误'); }
    await sleep(Number(inData.args[0]) * 1000);
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
  ctx.word.statement.addStatement('#', async (inData, session) =>
  {
    let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
    // console.log('#', inData.args);

    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;
    const item = inData.args[0];
    let number = await inData.internal.getItem(uid, saveCell, item);

    number = (number) ? number : 0;

    return String(number);
  });

  // 概率判断
  // 语法：(%:概率(0~100):消息?)
  ctx.word.statement.addStatement('%', async (inData, session) =>
  {
    if (!/^\d+$/.test(inData.args[0]) || Number(inData.args[0]) < 0 || Number(inData.args[0]) > 100) { return inData.parPack.kill('概率格式错误'); }
    const random = (minNumber: number, maxNumber: number): number =>
    {
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
        return '';
      } else
      {
        return inData.parPack.kill('判定失败');
      }
    }
  }, [0, 1]);

  // 我的name
  ctx.word.statement.addStatement('@this', async (inData, session) =>
  {
    return session.username;
  });

  // 我的id
  ctx.word.statement.addStatement('#this', async (inData, session) =>
  {
    return session.userId;
  });

  // 对方的name
  ctx.word.statement.addStatement('@that', async (inData, session) =>
  {
    if (!inData.matchs.hasOwnProperty('name')) { return; }
    return inData.matchs.name[0];
  });

  // 对方的id
  ctx.word.statement.addStatement('#that', async (inData, session) =>
  {
    if (!inData.matchs.hasOwnProperty('id')) { return; }
    return inData.matchs.id[0];
  });

  // 创建个at
  // 语法：(@:id/name:值)
  ctx.word.statement.addStatement('@', async (inData, session) =>
  {
    const type = inData.args[0];
    const at = inData.args[1];
    if (!at)
    {
      return '创建at时出错：未填写昵称或id';
    }
    if (type == 'id')
    {
      return `<at id="${at}"/>`;
    }
    else if (type == 'name')
    {
      return `<at name="${at}"/>`;
    }
    else
    {
      return '创建at时出错：未填写类型或类型出错';
    }
  });

  // 隐式返回
  ctx.word.statement.addStatement('!', async (inData, session) =>
  {
    return '';
  });

  // cd装置
  // 语法：(cd:事件名称:cd时间:消息?)
  // 若是信息省略则代表忽略整句话
  ctx.word.statement.addStatement('cd', async (inData, session) =>
  {
    const uid = session.userId;

    const eventName = inData.args[0];

    const time = inData.args[1];
    if (!/^\d+$/.test(time)) { return inData.parPack.kill('cd时间输入错误'); }

    let userEventConfig = await inData.internal.getUserConfig(uid, eventName) as number;

    if (!userEventConfig)
    {
      userEventConfig = Number(time) * 1000 + Date.now();
      inData.internal.saveUserConfig(uid, eventName, userEventConfig);

      // 如果有消息项
      if (inData.args.length > 2)
      {
        return inData.args[2];
      } else
      { // 如果无消息项，再去看看同句内有没有能触发的

        return '';
      }
    } else
    {
      if (Date.now() >= userEventConfig)
      {
        userEventConfig = Number(time) * 1000 + Date.now();
        inData.internal.saveUserConfig(uid, eventName, userEventConfig);

        if (inData.args.length > 2)
        {
          return inData.args[2];
        } else
        { // 如果无消息项，再去看看同句内有没有能触发的

          return '';
        }

      } else
      {
        return inData.parPack.kill();
      }
    }
  }, [0, 1, 1]);

  // 输入数
  // 定义一个输入trigger：
  if (!ctx.word.trigger.trigger['(数)'])
  {
    ctx.word.trigger.addTrigger('inputNumber', '(数)', '(\\d+)+?');
    ctx.word.cache.cacheRefresh();
  }

  // 获取输入的数
  // 语法：(数:第几个输入的数)
  ctx.word.statement.addStatement('数', async (inData, session) =>
  {
    const inputNumber = inData.args[0];
    // console.log(inputNumber);
    if (!/^\d+$/.test(inputNumber)) { return inData.parPack.kill('获取输入数的输入参数不正确'); }

    const data = inData.matchs.inputNumber[Number(inputNumber) - 1];
    if (!data) { return inData.parPack.kill('未获取到输入的数'); }

    return data;
  });

  // 四则
  // 语法：(算:数1:+-*/:数2)
  ctx.word.statement.addStatement('算', async (inData, session) =>
  {
    const numArgs1 = inData.args[0];
    const numArgs2 = inData.args[2];
    const Operator = inData.args[1];

    if (!/^\d+$/.test(numArgs1)) { return inData.parPack.kill('获取输入数的输入参数不正确'); }
    if (!/^\d+$/.test(numArgs2)) { return inData.parPack.kill('获取输入数的输入参数不正确'); }
    if (!/[+-/*]/.test(Operator)) { return inData.parPack.kill('获取输入数的输入参数不正确'); }

    const MAX_SAFE = Number.MAX_SAFE_INTEGER;
    const MIN_SAFE = Number.MIN_SAFE_INTEGER;

    if (numArgs1 > MAX_SAFE || numArgs1 < MIN_SAFE)
    {
      return inData.parPack.kill(`Error: number 1 (${numArgs1}) is out of safe range.`);
    }
    if (numArgs2 > MAX_SAFE || numArgs2 < MIN_SAFE)
    {
      return inData.parPack.kill(`Error: number 2 (${numArgs2}) is out of safe range.`);
    }

    const result = Math.floor(eval(`${numArgs1}${Operator}${numArgs2}`));
    if (result > MAX_SAFE || result < MIN_SAFE)
    {
      return inData.parPack.kill(`Error: result (${result}) is out of safe range.`);
    }
    return String(result);
  });

  // 随机数(~:a:b)生成a~b的随机数
  ctx.word.statement.addStatement('~', async (inData, session) =>
  {
    const first = inData.args[0];
    const second = inData.args[1];

    if (!/^\d+$/.test(first)) { return inData.parPack.kill('获取输入数的输入参数不正确'); }
    if (!/^\d+$/.test(second)) { return inData.parPack.kill('获取输入数的输入参数不正确'); }

    const random = (minNumber: number, maxNumber: number): number =>
    {
      return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
    };

    return String(random(Number(first), Number(second)));
  });

  // 获取时间(time:显示类型:是否为汉字)【1.年 2. 月 3. 星期 4. 日 5. 时 6. 分 7. 秒 8. 时间戳】
  ctx.word.statement.addStatement('time', async (inData, session) =>
  {
    const first = inData.args[0];
    const isString = inData.args[1];

    if (!/^\d+$/.test(first)) { return inData.parPack.kill('获取输入数的输入参数不正确'); }
    const day = new Date();
    let time: number | string;
    switch (first)
    {
      case "1": {
        time = day.getFullYear();
        break;
      }

      case "2": {
        time = day.getMonth() + 1;
        break;
      }

      case "3": {
        time = day.getDay();
        if (time == 0) { time = 7; }
        break;
      }

      case "4": {
        time = day.getDate();
        break;
      }
      case "5": {
        time = day.getHours();
        break;
      }

      case "6": {
        time = day.getMinutes();
        break;
      }

      case "7": {
        time = day.getSeconds();
        break;
      }

      case "8": {
        time = Date.now();
        break;
      }

      case "9": {
        time = Date();
        break;
      }

      default:
        break;
    }

    if (time)
    {
      if (isString == '1' && first != '9')
      {
        return numberToChinese(time as number);
      } else
      {
        return String(time);
      }
    } else
    {
      return '';
    }
  });

  // 触发某个触发词
  // 语法：(调:某触发词)
  ctx.word.statement.addStatement('调', async (inData, session) =>
  {
    const whichStart = inData.args[0];

    if (session.content == whichStart) { return inData.parPack.kill('禁止调用自身'); }

    if (!session.bot) { ctx.logger('调用语法中session缺少bot属性'); return '【当前触发方式不支持调用语法】'; }
    if (!session.send) { ctx.logger('调用语法中session缺少send属性'); return '【当前触发方式不支持调用语法】'; }
    if (!session.event) { ctx.logger('调用语法中session缺少event属性'); return '【当前触发方式不支持调用语法】'; }

    const test = session?.bot.session(clone(session.event)) as Session;

    test.content = whichStart;

    let getReturnMsg = '';
    await ctx.word.driver.start(test, async msg =>
    {
      if (!msg) { return ''; }
      getReturnMsg = msg;
    });

    // console.log(msg)
    return getReturnMsg;
  });

  // 异步调用
  ctx.word.statement.addStatement('异调', async (inData, session) =>
  {
    const whichStart = inData.args[0];

    // console.log(session.userId);
    if (session.content == whichStart) { return inData.parPack.kill('禁止调用自身'); }

    if (!session.bot) { ctx.logger('调用语法中session缺少bot属性'); return '【当前触发方式不支持调用语法】'; }
    if (!session.send) { ctx.logger('调用语法中session缺少send属性'); return '【当前触发方式不支持调用语法】'; }
    if (!session.event) { ctx.logger('调用语法中session缺少event属性'); return '【当前触发方式不支持调用语法】'; }

    const test = session?.bot.session(session.event) as Session;

    test.content = whichStart;

    await ctx.word.driver.start(test, async msg =>
    {
      if (!msg) { return ''; }
      test.send(msg);
    });

    // console.log(msg)
    return '';
  });


  // 等待输入
  // 语法：(wi:参数名称?)
  ctx.word.statement.addStatement('wi', async (inData, session) =>
  {
    if (!session.prompt) { ctx.logger('wi语法中session缺少prompt属性'); return '当前不支持获取输入语法'; }
    if (!session.send) { ctx.logger('wi语法中session缺少send属性'); return '当前不支持获取输入语法'; }

    session.send(`请输入${(inData.args[0]) ? inData.args[0] + "的值" : ''}:`);

    const a = await session?.prompt();
    if (!a) { return ''; }
    return a;
  });

  // 鉴权
  // 语法：(p:权限名:消息?)
  ctx.word.statement.addStatement('p', async (inData, session) =>
  {
    const permission = inData.args[0];
    let uid = session.userId;

    const have = await ctx.word.permission.isHave(uid, permission);
    const msg = inData.args[1] ? inData.args[1] : '';
    if (msg == '')
    {
      if (have) { return ''; } else { return inData.parPack.next(); }
    } else
    {
      if (have) { return msg; } else { return ''; }
    }
  });

  // 排行榜
  // 语法：(排行榜:物品)
  ctx.word.statement.addStatement('排行榜', async (inData, session) =>
  {
    const itemName = inData.args[0];
    const saveCell = inData.wordData.saveDB;

    const a = await ctx.word.tools.getDB('wordUserPackData');
    const userList = a.idList;
    const dataList = a.dataList;

    const dataTempList = [];
    const userTempList = [];

    dataList.forEach((item, index) =>
    {
      if (!item[saveCell]) { return; }
      if (!item[saveCell][itemName]) { return; }

      dataTempList.push(item[saveCell][itemName]);
      userTempList.push(userList[index]);
    });

    const outDataList = [].concat(dataTempList).sort((a, b) => { return b - a; });
    const outUserList = [];
    let outMsg = '';

    outDataList.forEach((v, nowIndex) =>
    {
      const index = dataTempList.indexOf(v);
      outUserList.push(userTempList[index]);

      if (nowIndex < config.Leaderboard)
      {
        outMsg += `${nowIndex + 1}. <at id="${userTempList[index]}"/>  ${v}\n`;
      }

      dataTempList.splice(index, 1);
      userTempList.splice(index, 1);
    });

    return outMsg;
  });

  // 点歌
  // 语法：(歌曲:url直链)
  ctx.word.statement.addStatement('歌曲', async (inData, session) =>
  {
    const url = inData.args[0];
    if (!url) { return inData.parPack.kill('无歌曲链接参数'); }
    return `<audio src="${url}" url="${url}"/>`;
  });

  // 点视频
  // 语法：(视频:url直链)
  ctx.word.statement.addStatement('视频', async (inData, session) =>
  {
    const url = inData.args[0];
    if (!url) { return inData.parPack.kill('无歌曲链接参数'); }
    return `<video src="${url}" url="${url}"/>`;
  });

  // 禁言
  // 语法：(禁言:时常s:用户id?:理由?)
  // 为0表示解除禁言
  ctx.word.statement.addStatement('禁言', async (inData, session) =>
  {
    if (!session.hasOwnProperty('guildId')) { return '当前不支持获取输入语法'; }

    let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
    let long = inData.args[0];

    if (!/^\d+$/.test(long)) { return inData.parPack.kill('获取禁言时常的输入参数不正确'); }

    let reason = inData.args[2];

    if (reason)
    {
      session.bot.muteGuildMember(session.guildId, uid, long, reason);
    } else
    {
      session.bot.muteGuildMember(session.guildId, uid, long);
    }
  });

  // 踢
  // 语法：(踢:用户id?:是否永久踢0/1)
  ctx.word.statement.addStatement('踢', async (inData, session) =>
  {
    if (!session.hasOwnProperty('guildId')) { return '当前不支持获取输入语法'; }

    let uid = (inData.args.length >= 0) ? inData.args[0] : session.userId;
    let long = inData.args[1] ? inData.args[1] : 0;

    if (!/^\d+$/.test(long)) { return inData.parPack.kill('获取禁言时常的输入参数不正确'); }

    if (long == 0)
    {
      session.bot.kickGuildMember(session.guildId, uid, false);
    } else
    {
      session.bot.kickGuildMember(session.guildId, uid, true);
    }
  });

  const httpRequest = async (url: string, method: 'post' | 'get', head: any, body: any) =>
  {
    if (method == 'post')
    {
      const config = {
        method: method,
        headers: head,
        data: body
      };

      if (!config.headers) { delete config.headers; }
      if (!config.data) { delete config.data; }

      const data = await ctx.http('post', url, config);
      return data;
    }
    if (method == 'get')
    {
      const reqUrl = `${url}?${new URLSearchParams(body)}`;

      const data = head ? await ctx.http('get', reqUrl, {
        headers: head
      }) : await ctx.http(reqUrl);

      return data;
    }
  };

  const getJson = (originStr: string) =>
  {
    const temp = originStr.split('&');
    const json = {};
    temp.forEach(a =>
    {
      const list = a.split('=');
      const key = list[0];
      const value = list[1];

      json[key] = value;
    });
    return json;
  };

  const dataSplit = (data: any, needSplit: string) =>
  {
    const splitList = needSplit.split('.');
    let returnMsg = data;
    for (let i of splitList)
    {
      if (returnMsg[i])
      {
        returnMsg = returnMsg[i];
      } else
      {
        return needSplit;
      }
    }
    return returnMsg;
  };

  // 创建http get请求
  // (get:url:headJSON:bodyJSON:getData....)
  ctx.word.statement.addStatement('get', async (inData, session) =>
  {
    if (!config.httpRequest) { return; }
    const url = `http://${inData.args[0]}`;
    const headTemp = inData.args[1];
    const bodyTemp = inData.args[2];
    let head = null;
    if (headTemp != '') { head = getJson(headTemp); }

    let body = null;
    if (body != '') { body = getJson(bodyTemp); }

    const data = await httpRequest(url, 'get', head, body);

    const needDataList = inData.args.slice(3);
    let outMsg = '';
    needDataList.forEach(e =>
    {
      outMsg += String(dataSplit(structuredClone(data), e));
    });

    // console.log(outMsg)
    return outMsg;
  });

  // 创建https get请求
  // (gets:url:headJSON:bodyJSON:getData....)
  ctx.word.statement.addStatement('gets', async (inData, session) =>
  {
    if (!config.httpRequest) { return; }
    const url = `https://${inData.args[0]}`;
    const headTemp = inData.args[1];
    const bodyTemp = inData.args[2];
    let head = null;
    if (headTemp != '') { head = getJson(headTemp); }

    let body = null;
    if (body != '') { body = getJson(bodyTemp); }
    // console.log(body);
    // console.log('aaaa?');
    const data = await httpRequest(url, 'get', head, body);
    // console.log('bbbb?');
    const needDataList = inData.args.slice(3);
    let outMsg = '';
    needDataList.forEach(e =>
    {
      outMsg += String(dataSplit(structuredClone(data), e));
    });

    return outMsg;
  });

  // 创建https post请求
  // (posts:url:headJSON:bodyJSON:getData....)
  ctx.word.statement.addStatement('posts', async (inData, session) =>
  {
    if (!config.httpRequest) { return; }
    const url = `https://${inData.args[0]}`;
    const headTemp = inData.args[1];
    const bodyTemp = inData.args[2];
    let head = null;
    if (headTemp != '') { head = getJson(headTemp); }

    let body = null;
    if (body != '') { body = getJson(bodyTemp); }

    const data = await httpRequest(url, 'post', head, body);
    const needDataList = inData.args.slice(3);
    let outMsg = '';
    needDataList.forEach(e =>
    {
      outMsg += String(dataSplit(structuredClone(data), e));
    });

    // console.log(outMsg)
    return outMsg;
  });

  // 创建https post请求
  // (post:url:headJSON:bodyJSON:getData....)
  ctx.word.statement.addStatement('post', async (inData, session) =>
  {
    if (!config.httpRequest) { return; }
    const url = `http://${inData.args[0]}`;
    const headTemp = inData.args[1];
    const bodyTemp = inData.args[2];
    let head = null;
    if (headTemp != '') { head = getJson(headTemp); }

    let body = null;
    if (body != '') { body = getJson(bodyTemp); }

    const data = await httpRequest(url, 'post', head, body);
    const needDataList = inData.args.slice(3);
    let outMsg = '';
    needDataList.forEach(e =>
    {
      outMsg += String(dataSplit(structuredClone(data), e));
    });

    // console.log(outMsg)
    return outMsg;
  });

  // 创建https post请求
  // (http:<post/get>:url:headJSON:bodyJSON:getData....)
  ctx.word.statement.addStatement('http', async (inData, session) =>
  {
    if (!config.httpRequest) { return; }
    const url = inData.args[0];
    const method = inData.args[1];
    const headTemp = inData.args[2];
    const bodyTemp = inData.args[3];

    if (method != 'post' && method != 'get') { return; }

    let head = null;
    if (headTemp != '') { head = getJson(headTemp); }

    let body = null;
    if (body != '') { body = getJson(bodyTemp); }

    const data = await httpRequest(url, method, head, body);
    const needDataList = inData.args.slice(4);
    let outMsg = '';
    needDataList.forEach(e =>
    {
      outMsg += String(dataSplit(structuredClone(data), e));
    });

    // console.log(outMsg)
    return outMsg;
  });

  interface weightObj
  {
    value: string;
    weight: number;
  }

  // 多重概率判断
  // (%%:10:这是10%的概率:20:这是20%的概率)
  ctx.word.statement.addStatement('%%', async (inData, session) =>
  {
    const args = inData.args;

    if (args.length % 2 == 1) { return '参数数量为奇数'; }


    const obj: weightObj[] = [];
    for (let i = 0; i < args.length; i += 2)
    {
      if (!/^\d+$/.test(args[i])) { return `${i + 1}个参数不为整数`; }

      obj.push({
        value: args[i + 1],
        weight: Number(args[i])
      });
    }

    // 函数来根据权重随机选择一个元素
    function weightedRandom(items: weightObj[])
    {
      // 计算总权重
      const totalWeight = items.reduce((sum: number, item: { value: string, weight: number; }) => sum + item.weight, 0);

      // 生成一个介于 0 和 totalWeight 之间的随机数
      const randomNum = Math.random() * totalWeight;

      let weightSum = 0;
      // 遍历数组，找到随机数所在的权重区间
      for (const item of items)
      {
        weightSum += item.weight;
        if (randomNum < weightSum)
        {
          return item.value;
        }
      }
    }

    return weightedRandom(obj);
  }, ['while', 0, 1]);

  // 添加列表内容(a+:列表名:列表内容:目标?/that)
  ctx.word.statement.addStatement('a+', async (inData, session) =>
  {
    const listName = inData.args[0];
    const listItem = inData.args[1];

    let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    getListData.push(listItem);

    const a = await inData.internal.saveList(uid, saveCell, listName, getListData);

    if (a)
    {
      return listItem;
    }
  });

  // 删除列表内容(a-:列表名:列表内容:目标?/that)
  ctx.word.statement.addStatement('a-', async (inData, session) =>
  {
    const listName = inData.args[0];
    const listItem = inData.args[1];

    let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    const index = getListData.indexOf(listItem);

    if (index < 0)
    {
      return inData.parPack.kill('不存在此列表项');
    }

    const item = getListData.splice(index, 1);

    const a = await inData.internal.saveList(uid, saveCell, listName, getListData);

    if (a)
    {
      return item[0];
    }
  });

  // 删除列表内容(ak:列表名:目标?/that)
  ctx.word.statement.addStatement('ak', async (inData, session) =>
  {
    const listName = inData.args[0];

    let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = [];

    await inData.internal.saveList(uid, saveCell, listName, getListData);
  });

  // 查询列表长度(al:列表名:目标?/that)
  ctx.word.statement.addStatement('al', async (inData, session) =>
  {
    const listName = inData.args[0];

    let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    return String(getListData.length);
  });

  // 获取列表的一项(a#:列表名:序号:目标?/that)
  ctx.word.statement.addStatement('a#', async (inData, session) =>
  {
    const listName = inData.args[0];
    const index = inData.args[1];
    if (!isNumeric(index))
    {
      return inData.parPack.kill('序号不为数字');
    }
    if (index == '0')
    {
      return inData.parPack.kill('序号需要大于1');
    }
    let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    if (getListData.length <= 0)
    {
      return inData.parPack.kill('不存在此列表项或列表为空');
    }

    return getListData[Number(index) - 1];
  });

  // 随机获取列表中的一项(ar:列表名:目标?/that)
  ctx.word.statement.addStatement('a~', async (inData, session) =>
  {
    const listName = inData.args[0];

    let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    if (getListData.length <= 0)
    {
      return inData.parPack.kill('不存在此列表项或列表为空');
    }

    const index = randomNumber(0, getListData.length);
    return getListData[index];
  });

  // 判断物品在列表中的序号(a?:列表名:列表内容:目标?/that)
  ctx.word.statement.addStatement('ar', async (inData, session) =>
  {
    const listName = inData.args[0];
    const listItem = inData.args[1];

    let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    const index = getListData.indexOf(listItem);

    if (index < 0)
    {
      return "-1";
    }

    return String(index) + 1;
  });

  // 设置列表的某一项为某物品(as:列表名:序号:列表内容:目标?/that)
  ctx.word.statement.addStatement('as', async (inData, session) =>
  {
    const listName = inData.args[0];
    const index = inData.args[1];
    const listItem = inData.args[2];

    if (!isNumeric(index))
    {
      return inData.parPack.kill('序号不为数字');
    }
    if (index == '0')
    {
      return inData.parPack.kill('序号需要大于1');
    }

    let uid = (inData.args.length >= 4) ? inData.args[3] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    getListData[Number(index) - 1] = listItem;

    const a = await inData.internal.saveList(uid, saveCell, listName, getListData);

    if (a)
    {
      return listItem;
    }
  });

  // 判断列表的某一项是否有内容(a?:列表名:序号:目标?/that)
  ctx.word.statement.addStatement('a?', async (inData, session) =>
  {
    const listName = inData.args[0];
    const index = inData.args[1];

    if (!isNumeric(index))
    {
      return inData.parPack.kill('序号不为数字');
    }
    if (index == '0')
    {
      return inData.parPack.kill('序号需要大于1');
    }

    let uid = (inData.args.length >= 3) ? inData.args[2] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    if (getListData[Number(index) - 1])
    {
      return "1";
    } else
    {
      return "0";
    }
  });

  // 输出一个列表的所有值(aa:列表名:目标?/that)
  ctx.word.statement.addStatement('aa', async (inData, session) =>
  {
    const listName = inData.args[0];

    let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    const getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    if (getListData.length <= 0)
    {
      return inData.parPack.kill('不存在此列表项或列表为空');
    }

    let outMsg = getListData.map((item, index) => `${index + 1}. ${item}`).join('');

    return outMsg;
  });

  // 删除重复内容(ac:列表名:目标?/that)
  ctx.word.statement.addStatement('ac', async (inData, session) =>
  {
    const listName = inData.args[0];

    let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    let getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    if (getListData.length <= 0)
    {
      return inData.parPack.kill('不存在此列表项或列表为空');
    }

    getListData = [...new Set(getListData)];

    const a = await inData.internal.saveList(uid, saveCell, listName, getListData);

    if (!a)
    {
      return inData.parPack.kill('列表去重失败');
    }
  });

  // 互换列表中两项的位置(ah:列表名:项1:项2:目标?/that)
  ctx.word.statement.addStatement('ah', async (inData, session) =>
  {
    const listName = inData.args[0];

    let uid = (inData.args.length >= 4) ? inData.args[3] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    let getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    if (getListData.length <= 0)
    {
      return inData.parPack.kill('不存在此列表项或列表为空');
    }

    const index1 = inData.args[1] - 1;
    const index2 = inData.args[2] - 1;
    const temp = getListData[index1] + '';
    getListData[index1] = getListData[index2];
    getListData[index2] = temp;

    const a = await inData.internal.saveList(uid, saveCell, listName, getListData);

    if (!a)
    {
      return inData.parPack.kill('列表互换失败');
    }
  });

  // 将列表合并输出内容(am:列表名:目标?/that)
  ctx.word.statement.addStatement('am', async (inData, session) =>
  {
    const listName = inData.args[0];

    let uid = (inData.args.length >= 2) ? inData.args[1] : session.userId;
    if (uid == 'that') { uid = inData.matchs.id[0]; }

    const saveCell = inData.wordData.saveDB;

    let getListData = await inData.internal.getList(uid, saveCell, listName);
    if (!Array.isArray(getListData)) { return getListData; }

    return getListData.join('');
  });

  // 触发一个koishi指令(指令:xxx:0/1是否直接发送)
  ctx.word.statement.addStatement('指令', async (inData, session) =>
  {
    const args = inData.args[0];
    let a: string;

    const off = ctx.once('before-send', (sessionA) =>
    {
      a = sessionA.content;
      return true;
    });

    if (!session.execute) { ctx.logger('调用语法中session缺少execute属性'); return '【当前触发方式不支持调用语法】'; }
    if (!session.send) { ctx.logger('调用语法中session缺少send属性'); return '【当前触发方式不支持调用语法】'; }

    const send = inData.args[1];

    // 直接发送/返回
    if (send == '1')
    {
      const hList = await session.execute(args, true);
      off();
      session.send(hList);
    } else
    {
      await session.execute(args);
      return a;
    }
  });

  // 获取机器人昵称(称)
  // 清空一个人的数据(kill:目标)
}
