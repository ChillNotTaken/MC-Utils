import { Command } from "discord-akairo";
import { TextChannel, Message } from "discord.js";

export default class Slowmode extends Command {
  public constructor() {
    super("slowmode", {
      aliases: ["slowmode", "sm"],
      channel: "guild",
      category: "Utilities",
      userPermissions: ["MANAGE_MESSAGES"],
      description: {
        content: "Set's a slowmode to a number of seconds.",
        usage: "slowmode [number]",
        examples: ["slowmode 5"],
      },
      args: [
        {
          id: "number",
          type: "number",
          default: 0,
          match: "rest",
          prompt: {
            start: (msg: Message) =>
              `${msg.author}, please provide a number in seconds....`,
            retry: (msg: Message) =>
              `${msg.author}, please provide a valid number in seconds...`,
          },
        },
      ],
    });
  }

  public async exec(
    message: Message,
    { number }: { number: number }
  ): Promise<Message> {
    let ch = message.channel as TextChannel;
    if (number === 0) {
      return await message.util.send(`Channel is currently at **${ch.rateLimitPerUser}** seconds.`);
    }
    await message.delete();
    if (number > 21600) {
      let msg = await message.util.send(
        ":x: Ratelimit too high (above 21600). Please try again."
      );
      return msg.delete({ timeout: 5000 });
    }
    ch.setRateLimitPerUser(
      number,
      `Slowmode Authorized by: ${message.author.tag}`
    ).then(async () => {
      let msg = await message.channel.send(
        `:tools: Set ratelimit to \`${number}\` seconds successfully.`
      );
      return msg.delete({ timeout: 5000 });
    });
  }
}
