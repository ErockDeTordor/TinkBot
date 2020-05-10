import { Message, Snowflake, Util, User } from "discord.js";
import { Argument, ArgumentInfo } from "./arguments/argument";
import { Tinkbot } from "../tinkbot";
import { Throttle, ThrottlingOptions } from "./throttle";
import { ArgumentCollector, ArgumentCollectorResult } from "./arguments/collector";
import { stripIndents } from "common-tags";

export type CommandInfo = {
    /**
     * Name of the command, must be lowercase
     */
    name: string;
    /**
     * Alternative names for the command, must all be lowercase
     */
    aliases?: string[];
    /**
     * Command description
     */
    desc: string;
    /**
     * Defines whether the command should only be usable by the bot's owner
     */
    ownerOnly?: boolean;
    /**
     * Defines whether the command should only be usable within a guild
     */
    guildOnly?: boolean;
    /**
     * Defines whether the command should be visible for the end user
     */
    hidden?: boolean;
    /**
     * Enables throttling for this command, 
     */
    throttling?: ThrottlingOptions;
    /**
     * Command arguments
     */
    args?: ArgumentInfo[];
}

export abstract class Command {
    protected readonly TinkbotClient: Tinkbot;
    public name: string;
    public aliases: string[];
    public description: string;
    public ownerOnly: boolean;
    public guildOnly: boolean;
    public hidden: boolean;
    public throttling: ThrottlingOptions;
    public argsCollector: ArgumentCollector;
    private _throttles: Map<Snowflake, Throttle>;

    /**
     * @param {Tinkbot} client the client the command is for
     * @param {CommandInfo} info the command's information
     */
    constructor(TinkbotClient: Tinkbot, info: CommandInfo) {
        Command.validateInfo(TinkbotClient, info);

        this.TinkbotClient = TinkbotClient;
        this.name = info.name;
        this.aliases = info.aliases || [];
        this.description = info.desc;
        this.guildOnly = Boolean(info.guildOnly);
        this.ownerOnly = Boolean(info.ownerOnly);
        this.hidden = Boolean(info.hidden);
        this.throttling = info.throttling || null;
        this.argsCollector = info.args && info.args.length ? 
            new ArgumentCollector(TinkbotClient, info.args) : null;
        this._throttles = new Map();
    }

    public abstract run(msg: Message, args?: ArgumentCollectorResult): Promise<Message|Message[]>;

    public onError(err: Error, message: Message, args: Object|string|string[], fromPattern: boolean, result: ArgumentCollectorResult): Promise<Message|Message[]> {
        const owners = this.TinkbotClient.owners;
        const ownerList = owners ? owners.map((usr: User, i) => {
            const or = i === owners.length - 1 && owners.length > 1 ? 'ou ' : '';
            return `${or}${Util.escapeMarkdown(usr.username)}#${usr.discriminator}`;
        }).join(owners.length > 2 ? ', ' : ' ') : '';

        return message.reply(stripIndents`
            Une erreur est survenue pendant l'exécution de la commande : \`${err.name}: ${err.message}\`
            Veuillez contacter ${ownerList || 'le propriétaire de ce bot'}.
        `)
    }

    public isTriggered(trigger: string): boolean {
        if (this.aliases.includes(trigger)) return true;
        return trigger === this.name;
    }

    private throttle(id: Snowflake): Throttle {
        if (!this.throttling || this.TinkbotClient.isOwner(id)) return null;

        let throttle: Throttle = this._throttles.get(id);
        if (!throttle) {
            throttle = {
                start: Date.now(),
                usages: 0,
                timeout: this.TinkbotClient.setTimeout(() => {
                    this._throttles.delete(id);
                }, this.throttling.duration * 1000),
            }
            this._throttles.set(id, throttle);
        }

        return throttle;
    }

    private static validateInfo(TinkbotClient: Tinkbot, info: CommandInfo): void {
        if (!TinkbotClient) throw new Error('Client must be specified');
        if (info.name !== info.name.toLowerCase()) throw new Error('Command name must be lowercase');
        if (info.aliases && info.aliases.some(alias => alias !== alias.toLowerCase())) {
            throw new Error('Command aliases must all be lowercase');
        }
    }

}
