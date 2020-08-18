'use strict';
import {CommandoClient} from 'discord.js-commando';
import {Client} from 'pg';
import * as path from 'path';
import {PostgresProvider} from "./providers/PostgresProvider";

interface TinkbotOptions {
	prefix: string;
	inDev: boolean;
	owners: string[];
	token: string;
}

export class Tinkbot {
	public client: CommandoClient;
	private static INSTANCE: Tinkbot = null;
	private readonly TOKEN: string;
	private inDev: boolean;

	static createInstance(options: TinkbotOptions): Tinkbot {
		if (this.INSTANCE === null) this.INSTANCE = new Tinkbot(options);
		return this.INSTANCE;
	}

	// noinspection JSUnusedGlobalSymbols
	static getInstance(): Tinkbot {
		if (this.INSTANCE === null) throw new Error('Tinkbot has not been instanciated yet!');
		return this.INSTANCE;
	}

	private constructor(options: TinkbotOptions) {
		this.client = new CommandoClient({
			commandPrefix: options.prefix,
			owner: options.owners,
		});

		this.TOKEN = options.token;

		this.client.registry
			.registerGroups([
				['jeux-gratuits', 'Jeux gratuits'],
				['autres', 'Autres'],
				['util', 'Utilitaires'],
				['test', 'Test'],
			])
			.registerDefaultTypes({
				command: false,
				group: false,
			})
			.registerDefaultCommands({
				unknownCommand: false,
				commandState: false
			})
			.registerCommandsIn(path.join(__dirname, '..', 'commands'));

		this.inDev = options.inDev || false;

		const client = new Client({
			connectionString: process.env.DATABASE_URL,
			ssl: {
				rejectUnauthorized: false,
			},
		});

		client.connect().then(() => new PostgresProvider(client)).catch(e => {
			this.client.emit('error', e);
		});

		this.initEvents();
	}

	private initEvents() {
		console.log('Initiating events...');
		this.client
			.on('ready', () => {
				console.log('[INFO]', `Bot listening on ${this.client.user.tag}...`);
			})
			.on('debug', m => console.log('[DEBUG] - ', m))
			.on('warn', m => console.warn('[WARN] - ', m))
			.on('error', m => console.error('[ERROR] - ', m.message, m))
			.on('message', m => this.client.emit('debug', m.cleanContent));

		process.on('uncaughtException', error => console.error('[FATAL ERROR]', error.message));
	}

	listen(): Promise<String> {
		return this.client.login(this.TOKEN);
	}
}
