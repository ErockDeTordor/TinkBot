import {Command, CommandGroup, CommandoClient, CommandoGuild, SettingProvider} from "discord.js-commando";
import {Client} from "pg";
import {Guild} from "discord.js";

export class PostgresProvider extends SettingProvider {
	private db: Client;
	private client: CommandoClient;
	private settings: Map<string, object>;
	private listeners: Map<string, (...args: any[]) => void>;
	/**
	 * WARNING: BASE TEXT FOR PARAMETERIZED QUERY
	 * @see {@link https://node-postgres.com/features/queries#Parameterized%20query}
	 */
	private insertOrReplaceStatement: string;
	/**
	 * WARNING: BASE TEXT FOR PARAMETERIZED QUERY
	 * @see {@link https://node-postgres.com/features/queries#Parameterized%20query}
	 */
	private deleteStatement: string;

	constructor(db: Client) {
		super();

		this.db = db;

		this.client = null;

		this.settings = new Map();

		this.listeners = new Map();

		this.insertOrReplaceStatement = null;

		this.deleteStatement = null;
	}

	async init(client: CommandoClient) {
		this.client = client;

		await this.db.query('CREATE TABLE IF NOT EXISTS settings (guild INTEGER PRIMARY KEY, SETTINGS TEXT)');
		try {
			const queryResult = await this.db.query('SELECT CAST(guild as TEXT) as guild, settings FROM settings');
			for (const row of queryResult.rows) {
				let settings;
				try {
					settings = JSON.parse(row.settings);
				} catch (e) {
					client.emit('warn', `PostgresProvider couldn't parse the settings stored for guild ${row.guild}`);
					continue;
				}

				const guild = row.guild !== '0' ? row.guild : 'global';
				this.settings.set(guild, settings);
				if (guild !== 'global' && !client.guilds.cache.has(row.guild)) continue;
				this.setupGuild(guild, settings);
			}
		} catch (e) {
			console.error(e.stack);
		}

		// Prepare statements
		this.insertOrReplaceStatement = 'INSERT OR REPLACE INTO settings VALUES ($1, $2)';
		this.deleteStatement = 'DELETE FROM settings WHERE guild = $1';

		// Listen for changes
		this.listeners
			.set('commandPrefixChange', (guild: string | Guild, prefix: string) =>
				this.set(guild, 'prefix', prefix))
			.set('commandStatusChange', (guild: string | Guild, command: Command, enabled: boolean) =>
				this.set(guild, `cmd-${command.name}`, enabled))
			.set('groupStatusChange', (guild: string | Guild, group: CommandGroup, enabled) =>
				this.set(guild, `grp-${group.id}`, enabled))
			.set('guildCreate', (guild: Guild) => {
				const settings = this.settings.get(guild.id);
				if(!settings) return;
				this.setupGuild(guild.id, settings);
			})
			.set('commandRegister', (command: Command) => {
				for(const [guild, settings] of this.settings) {
					if(guild !== 'global' && !client.guilds.cache.has(guild)) continue;
					this.setupGuildCommand(client.guilds.cache.get(guild) as CommandoGuild, command, settings);
				}
			})
			.set('groupRegister', (group: CommandGroup) => {
				for (const [guild, settings] of this.settings) {
					if(guild !== 'global' && !client.guilds.cache.has(guild)) continue;
					this.setupGuildGroup(client.guilds.cache.get(guild) as CommandoGuild, group, settings);
				}
			});
		for (const [event, listener] of this.listeners) client.on(event, listener);
	}

	async destroy(): Promise<void> {
		// Finalise prepared statements
		this.insertOrReplaceStatement = null;
		this.deleteStatement = null;

		// Remove all listeners from the client
		for (const [event, listener] of this.listeners) this.client.removeListener(event, listener);
		this.listeners.clear();
	}

	get(guild: Guild|string, key: string, defVal: any): any {
		const settings = this.settings.get(PostgresProvider.getGuildID(guild));
		return settings ? typeof settings[key] !== 'undefined' ? settings[key] : defVal : defVal;
	}

	async set(guild: Guild|string, key: string, val: any): Promise<any> {
		guild = PostgresProvider.getGuildID(guild);
		let settings = this.settings.get(guild);
		if(!settings) {
			settings = {};
			this.settings.set(guild, settings);
		}

		settings[key] = val;
		await this.db.query(this.insertOrReplaceStatement,
			[(guild !== 'global' ? guild : 0), JSON.stringify(settings)]);
		if (guild === 'global') this.updateOtherShards(key, val);
		return val;
	}

	async remove(guild: Guild|string, key: string): Promise<any> {
		guild = PostgresProvider.getGuildID(guild);
		const settings = this.settings.get(guild);
		if(!settings || typeof settings[key] === 'undefined') return undefined;

		const val = settings[key];
		settings[key] = undefined;
		await this.db.query(this.insertOrReplaceStatement,
			[(guild !== 'global' ? guild : 0), JSON.stringify(settings)]);
		if (guild === 'global') this.updateOtherShards(key, undefined);
		return val;
	}

	async clear(guild: Guild|string): Promise<void> {
		guild = PostgresProvider.getGuildID(guild);
		if(!this.settings.has(guild)) return;
		this.settings.delete(guild);
		await this.db.query(this.deleteStatement, [guild !== 'global' ? guild : 0]);
	}

	private setupGuild(guildID: string, settings: object): void {
		if (typeof guildID !== 'string') throw new TypeError('The guild must be a guild ID or "global".');
		const guild: CommandoGuild = <CommandoGuild>this.client.guilds.cache.get(guildID) || null;

		// Load the command prefix
		if (typeof settings['prefix'] !== 'undefined') {
			if (guild) guild['_commandPrefix'] = settings['prefix'];
			else this.client['_commandPrefix'] = settings['prefix'];
		}

		// Load all command/group statuses
		for (const command of this.client.registry.commands.values()) this.setupGuildCommand(guild, command, settings);
		for (const group of this.client.registry.groups.values()) this.setupGuildGroup(guild, group, settings);
	}

	// noinspection JSMethodCanBeStatic
	private setupGuildCommand(guild: CommandoGuild, command: Command, settings: object): void {
		if (typeof settings[`cmd-${command.name}`] === 'undefined') return;
		if (guild) {
			if (!guild['_commandsEnabled']) guild['_commandsEnabled'] = {};
			guild['_commandsEnabled'][command.name] = settings[`cmd-${command.name}`];
		} else {
			command["_globalEnabled"] = settings[`cmd-${command.name}`];
		}
	}

	// noinspection JSMethodCanBeStatic
	private setupGuildGroup(guild: CommandoGuild, group: CommandGroup, settings: object): void {
		if (typeof settings[`grp-${group.id}`] === 'undefined') return;
		if (guild) {
			if (!guild['_groupsEnabled']) guild['_groupsEnabled'] = {};
			guild['_groupsEnabled'][group.id] = settings[`grp-${group.id}`];
		} else {
			group['_globalEnabled'] = settings[`grp-${group.id}`];
		}
	}

	private updateOtherShards(key: string, val: any): void {
		if (!this.client.shard) return;
		key = JSON.stringify(key);
		val = typeof val !== 'undefined' ? JSON.stringify(val) : 'undefined';
		// noinspection JSIgnoredPromiseFromCall
		this.client.shard.broadcastEval(`
            if (this.shard.id !== ${this.client.shard['id']} && this.provider && this.provider.settings) {
                let global = this.provider.settings.get('global');
                if (!global) {
                    global = {};
                    this.provider.settings.set('global', global);
                }
                global[${key}] = ${val};
            }
        `);
	}
}
