import {Tinkbot} from "../../tinkbot";
import {ArgumentType} from "./types/type";
import {Message} from "discord.js";
import {ArgumentUnionType} from "./types/union";

export type ArgumentInfo = {
    key: string;
    type: string;
    default?: any | Function;
};

type ArgumentResult = {
    value?: any | any[];
};

export class Argument {
    readonly client: Tinkbot;
    public key: string;
    public default: any | Function;
    public type: ArgumentType;

    constructor(client: Tinkbot, info: ArgumentInfo) {
        Argument.validateInfo(client, info);

        this.key = info.key;
        this.type = Argument.determineType(this.client, info.type);
        this.default = (info.default) ? info.default : null;
    }

    async obtain(msg: Message, val: string): Promise<ArgumentResult> {
        let empty = this.isEmpty(val, msg);
        if (empty && this.default !== null) {
            return {
                value: typeof this.default === 'function' ? await this.default(msg, this) : this.default,
            };
        }

        let valid = !empty ? await this.validate(val, msg) : false;

        while (!valid || typeof valid === 'string') {
            empty = this.isEmpty(val, msg);
            valid = await this.validate(val, msg);
        }

        return {
            value: await this.parse(val, msg),
        };
    }

    validate(val: string, msg: Message): boolean|string|Promise<boolean|string> {
        const valid = this.type.validate(val, msg, this);
        if (!valid || typeof valid === 'string') return valid;
        if (valid instanceof Promise) return valid.then(vld => vld);
        return valid;
    }

    parse(val: string, msg: Message): any|Promise<any> {
        return this.type.parse(val, msg, this);
    }

    isEmpty(val: string, msg: Message): boolean {
        if (this.type) return this.type.isEmpty(val, msg, this);
        return !val;
    }

    private static validateInfo(TinkbotClient: Tinkbot, info: ArgumentInfo): void {
        if (!TinkbotClient) throw new Error('Argument client is not specified!');
        if (!info) throw new Error('Argument info is not specified!');
        if (!info.type.includes('|') && !TinkbotClient.registry.types.has(info.type)) {
            throw new Error(`Argument type "${info.type}" isn't registered!`);
        }
    }

    private static determineType(TinkbotClient: Tinkbot, id: string): ArgumentType {
        if(!id) return null;
        if (!id.includes('|')) return TinkbotClient.registry.types.get(id);

        let type: ArgumentType = TinkbotClient.registry.types.get(id);
        if (type) return type;
        type = new ArgumentUnionType(TinkbotClient, id);
        TinkbotClient.registry.types.set(id, type);
        return type;
    }
}
