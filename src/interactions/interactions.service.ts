// NestJs import
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

// Discord import
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ConfigService as ConfigServiceNest } from '@nestjs/config';
import { ButtonInteraction, CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

// Services import
import { ClientService } from 'src/client/client.service';
import { PlayerService } from 'src/player/player.service';
import { ConfigService } from 'src/config/config.service';
import { ButtonsCustomIds } from './buttons';

@Injectable()
export class InteractionsService implements OnModuleInit {
  private interactionReady = false;

  constructor(
    private client: ClientService,
    @Inject('COMMANDS') private commands: SlashCommandBuilder[],
    private configServiceNest: ConfigServiceNest,
    private player: PlayerService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.client.on('ready', async (client) => {
      const clientID = client.user.id;

      const token = this.configServiceNest.get<string>('TOKEN');

      const rest = new REST({ version: '9' }).setToken(token);
      const commandsJSON = this.commands.map((command) => command.toJSON());

      client.on('guildCreate', async (guild) => {
        try {
          await rest.put(Routes.applicationGuildCommands(clientID, guild.id), {
            body: commandsJSON,
          });
        } catch (e) {
          console.error(e);
        }
      });

      try {
        if (this.configServiceNest.get<string>('NODE_ENV') == 'prod') {
          for (const guild of client.guilds.cache.values()) {
            await rest.put(
              Routes.applicationGuildCommands(clientID, guild.id),
              {
                body: commandsJSON,
              },
            );
          }
        } else {
          await rest.put(
            Routes.applicationGuildCommands(clientID, '360675076783341570'),
            {
              body: commandsJSON,
            },
          );
        }

        console.log('Successfully reloaded application (/) commands.');
      } catch (e) {
        console.error(e);
      }
    });
  }

  @OnEvent('player.ready')
  eventIteraction() {
    if (this.interactionReady) return;
    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isCommand()) this.commandInteraction(interaction);
      if (interaction.isButton()) this.buttonInteraction(interaction);
    });
    this.interactionReady = true;
    // this.eventEmitter.emit('player.ready');
  }

  async commandInteraction(interaction: CommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply(
        "La commande n'est pas executer dans un serveur discord !",
      );
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (error) {
      console.error('Error on Defer reply');
      return;
    }

    try {
      const { commandName } = interaction;

      switch (commandName) {
        case 'config':
          const commandGroupName = interaction.options.getSubcommandGroup();
          const subcommand = interaction.options.getSubcommand();
          switch (commandGroupName) {
            case 'player':
              switch (subcommand) {
                case 'init':
                  await this.config.newGuild(interaction);
                  console.log('called init player');
              }
              break;
            case 'option':
              await this.config.setConfig(interaction);
              break;
          }
          break;

        case 'play':
          await this.player.PlayCommand(interaction);
          break;
        case 'add':
          await this.player.AddCommand(interaction);
          break;
        case 'remove':
          break;
        case 'stop':
          break;
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: `${error}` });
    }
  }

  buttonInteraction(interaction: ButtonInteraction) {
    switch (interaction.customId) {
      case ButtonsCustomIds.PlayPause:
        this.player.PlayPauseButton(interaction);
        break;
      case ButtonsCustomIds.Stop:
        this.player.StopButton(interaction);
        break;
      case ButtonsCustomIds.Previous:
        this.player.PreviousButton(interaction);
        break;
      case ButtonsCustomIds.Next:
        this.player.NextButton(interaction);
        break;
      case ButtonsCustomIds.Repeat:
        this.player.RepeatButton(interaction);
        break;
    }
  }
}
