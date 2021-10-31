import { Config } from './schemas/config.schema';
import { PlayerOptions } from './schemas/player_options.schema';
import { Playlist } from './schemas/playlist.schema';

export type GuildItem = {
  guildId: string;
  config: Config;
  playlist: Playlist;
  save(): Promise<GuildItem>;
  markModified(path: string): void;
};

export type GuildConfigItem = {
  playerChannel: string;
  playerInstanceId: string;
  logChannel: string;
  logging: boolean;
  allowMute: boolean;
  allowChangeVolume: boolean;
};
