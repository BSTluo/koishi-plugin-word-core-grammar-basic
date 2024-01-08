import { Context, Schema } from 'koishi';
import { } from 'koishi-plugin-word-core';

export const name = 'word-core-grammar-basic';

export interface Config { }

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  // write your plugin here
  ctx.inject(['word'], ctx => {
    if (!ctx.word) { return; }
    ctx.word.statement.addStatement('添加', async (inData, ctx, session) => {
      console.log(inData);
      console.log(session.uid);
    });
  });
}
