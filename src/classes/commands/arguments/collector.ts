import {Tinkbot} from "../../tinkbot";
import {Argument, ArgumentInfo} from "./argument";
import {Message} from "discord.js";

export type ArgumentCollectorResult = {
    values?: Object;
}

export class ArgumentCollector {
    public readonly client: Tinkbot;
    public args: Argument[];

    constructor(client: Tinkbot, args: ArgumentInfo[]) {
        if (!client) throw new Error('Collector client not provided!');

        this.client = client;
        this.args = new Array(args.length);

        let hasOptional: boolean = false;
        for (let i = 0; i < args.length; i++) {
            if (args[i].default !== null) hasOptional = true;
            else if (hasOptional) throw new Error('Required arguments should not come after optional ones.')
            this.args[i] = new Argument(this.client, args[i]);
        }
    }

    async obtain(msg: Message, provided: any[]): Promise<ArgumentCollectorResult> {
        const values = {};

        for(let i = 0; i < this.args.length; i++) {
            const arg = this.args[i];
            const result = await arg.obtain(msg, provided[i]);

            values[arg.key] = result.value;
        }

        return { values };
    }
}