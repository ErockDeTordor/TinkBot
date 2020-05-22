import {Message} from "discord.js";
import {Argument} from "../argument";
import {Tinkbot} from "../../../tinkbot";


export abstract class ArgumentType {
    public readonly client: Tinkbot;
    public id: string;

    /**
     * @param client the client for the argument
     * @param id the argument type ID (lowercase)
     */
    constructor(client: Tinkbot, id: string) {
        if (!client) throw new Error('Client not specified!');
        if (id !== id.toLowerCase()) throw new Error('Argument type ID must be lowercase!');

        this.client = client;
        this.id = id;
    }

    /**
     * validates a value string for this type
     * @param value value to validate
     * @param msg value origin message
     * @param arg value origin argument
     */
    abstract validate(value: string, msg: Message, arg: Argument): boolean|string|Promise<boolean|string>;
    /**
     * parses the raw value string into a usable value
     * @param value value to parse
     * @param msg value origin message
     * @param arg value origin argument
     */
    abstract parse(value: string, msg: Message, arg: Argument): any|Promise<any>;

    /**
     * checks whether a value is empty
     * @param value value to check
     * @param msg value origin message
     * @param arg value origin argument
     */
    isEmpty(value: string, msg: Message, arg: Argument): boolean {
        return !value;
    }
}
