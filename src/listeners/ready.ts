import { Listener } from "discord-akairo";
import Logger from "../structures/Logger";
import MemberModel from "../models/MemberModel";
import { getModelForClass } from "@typegoose/typegoose";
import { MessageEmbed } from "discord.js";
import { utc } from "moment";
import Config from "../config";
import uniqid from "uniqid";
import { findChannel, modLog } from "../structures/Utils";
import ms from "ms";

export default class Ready extends Listener {
  constructor() {
    super("ready", {
      emitter: "client",
      event: "ready",
      category: "client",
    });
  }

  public async exec(): Promise<void> {
    let statusArray = [
      "Get out of my room, I'm playing Minecraft!",
      "e",
      "On soundmc.world",
      "Breaking bedrock",
      "Mining bobux",
      "Speedrunning with Sound",
      "Eating cake",
      "Help me luca is keeping me in his basement",
      "jazzy is cool?",
      "Piyeris is epic",
      "deleting dirt blocks",
      "pvp",
      "Axis is epic",
    ];

    setInterval(() => {
      const index = statusArray[Math.floor(Math.random() * statusArray.length)];
      this.client.user.setActivity(index, { type: "PLAYING" });
    }, 15000);

    Logger.success("READY", "Succesfully set bot activity.");

    const muteModel = getModelForClass(MemberModel);

    setInterval(async () => {
      await muteModel
        .find({ "mute.muted": true, "mute.isPerm": false })
        .then((members) => {
          members.forEach((member) => {
            this.client.databaseCache_mutedUsers.set(
              `${member.userId}-${member.guildId}`,
              member
            );
          });
        });
      this.client.databaseCache_mutedUsers
        .array()
        .filter((m) => m.mute.endDate < Date.now() || m.mute.endDate === Date.now())
        .forEach(async (memberData) => {
          const guild = this.client.guilds.cache.get("719977718858514483");
          if (!guild) return;
          const caseNum = uniqid();
          memberData.mute = {
            muted: false,
            isPerm: false,
            endDate: null,
            case: caseNum,
          };
          const muteRole = guild.roles.cache.get(Config.roles.muteRole);
          if (!muteRole) return;
          const inRole = muteRole.members.find(
            (r) => r.id === memberData.userId
          );
          if (inRole) {
            try {
              await inRole.roles.remove(muteRole);
            } catch (e) {
              Logger.error("Unmute", e);
              return;
            }
          } else {
            return;
          }
          const caseInfo = {
            caseID: caseNum,
            moderator: this.client.user.tag,
            moderatorId: this.client.user.id,
            user: `${inRole.user.tag} (${memberData.userId})`,
            date: utc().format("MMMM Do YYYY, h:mm:ss a"),
            type: "Unmute",
            reason: "[Auto] Unmuted",
          };
          this.client.databaseCache_mutedUsers.delete(
            `${memberData.userId}-${memberData.guildId}`
          );
          try {
            await muteModel.findOneAndUpdate(
              {
                guildId: guild.id,
                userId: memberData.userId,
              },
              {
                guildId: guild.id,
                userId: memberData.userId,
                $set: {
                  mute: memberData.mute,
                },
                $push: {
                  sanctions: caseInfo,
                },
              },
              {
                upsert: true,
              }
            );
          } catch (e) {
            Logger.error("Auto Unmute", e);
            return;
          }
          const logEmbed = new MessageEmbed()
            .setTitle(
              `Member Unmuted | Case \`${caseNum}\` | ${inRole.user.tag}`
            )
            .addField(`User:`, `<@${inRole.id}>`, true)
            .addField(`Moderator:`, `<@${this.client.user.id}>`, true)
            .addField(`Reason:`, caseInfo.reason, true)
            .setFooter(
              `ID: ${memberData.userId} | ${utc().format(
                "MMMM Do YYYY, h:mm:ss a"
              )}`
            )
            .setColor("RED");

          let modlogChannel = findChannel(
            this.client,
            Config.channels.modLogChannel
          );
          modLog(modlogChannel, logEmbed, guild.iconURL());
          Logger.event(`Auto Unmuted ${memberData.userId}!`);
        });
    }, 60000);
    Logger.success("READY", `${this.client.user.tag} is now online!`);
  }
}
