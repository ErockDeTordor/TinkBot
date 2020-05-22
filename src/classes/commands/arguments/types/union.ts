import {ArgumentType} from "./type";
import {Tinkbot} from "../../../tinkbot";
import {Message} from "discord.js";
import {Argument} from "../argument";

export class ArgumentUnionType extends ArgumentType {
    private types: ArgumentType[];

    constructor(client: Tinkbot, id: string) {
        super(client, id);

        this.types = [];
        const typeIDs = id.split('|');
        for (const typeID of typeIDs) {
            const type = client.registry.types.get(typeID);
            if (!type) throw new Error(`${typeID} is not a registered type!`);
            this.types.push(type);
        }
    }

    async validate(value: string, msg: Message, arg: Argument): Promise<boolean|string> {
        let results = this.types.map(type => {
            if (!type.isEmpty(value, msg, arg)) {
                return type.validate(value, msg, arg);
            }
            return false;
        });
        results = await Promise.all(results);
        if (results.some(valid => valid && typeof valid !== 'string')) return true;
        const errors = results.filter(valid => typeof valid === 'string');
        if (errors.length > 0) return errors.join('\n');
        return false;
    }

    async parse(value: string, msg: Message, arg: Argument): Promise<any> {
        let results = this.types.map(type => {
            if (!type.isEmpty(value, msg, arg)) {
                return type.validate(value, msg, arg);
            }
            return false;
        });
        results = await Promise.all(results);
        for (let i = 0; i < results.length; i++) {
            if (results[i] && typeof results[i] !== 'string') {
                return this.types[i].parse(value, msg, arg);
            }
        }
        throw new Error(`Unable to parse value "${value}" with union type ${this.id}`);
    }

    isEmpty(value: string, msg: Message, arg: Argument): boolean {
        return !this.types.some(type => !type.isEmpty(value, msg, arg));
    }
}