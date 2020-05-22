import {Tinkbot} from "./tinkbot";
import {Collection} from "discord.js";
import {ArgumentType} from "./commands/arguments/types/type";
import {Command} from "./commands/command";

export class Registry {
    public readonly client: Tinkbot;
    public types: Collection<string, ArgumentType>;
    public commands: Collection<string, Command>;
    public commandsPath: string;

    constructor(client: Tinkbot) {
        this.client = client;
        this.commands = new Collection();
        this.types = new Collection();
        this.commandsPath = null;
    }

    registerCommand(command: Command): Registry {
        //console.log(command);

        let test = Object.values(command)[0];
        if (test instanceof Function) command = new test(this.client);
        if (!(command instanceof Command)) throw new TypeError(`Invalid command object: ${command}`);

        if (this.commands.some(cmd => cmd.name === command.name || cmd.aliases.includes(command.name))) {
            throw new Error(`command ${command.name} already exists!`);
        }
        for (const alias of command.aliases) {
            if (this.commands.some(cmd => cmd.name === alias || cmd.aliases.includes(alias))) {
                throw new Error(`command ${alias} already exists!`);
            }
        }

        this.commands.set(command.name, command);

        // Handle events here, maybe?

        return this;
    }

    registerCommands(commands: Command[]): Registry {
        if (!Array.isArray(commands)) throw new TypeError('Commands must be an Array!');
        for (const command of commands) {
            this.registerCommand(command);
        }
        return this;
    }

    registerCommandsIn(path: string): Registry {
        const commands: Command[] = [];
        const obj = require('require-all')(path);
        for (const command of Object.values(obj)) {
            commands.push(command as Command);
        }
        if (!this.commandsPath) this.commandsPath = path;
        return this.registerCommands(commands);
    }

    registerType(type: ArgumentType): Registry {
        //console.log(type);

        let test = Object.values(type)[0];
        if (test instanceof Function) type = new test(this.client);
        if (!(type instanceof ArgumentType)) throw new TypeError(`Invalid type object: ${type}`);

        if (this.types.has(type.id)) throw new Error(`Argument type ID "${type.id}" registration duplicate!`);

        this.types.set(type.id, type);

        // Handle events here, maybe?

        return this;
    }

    registerTypes(types: ArgumentType[]): Registry {
        if (!Array.isArray(types)) throw new TypeError('Types must be an Array!');
        for (const type of types) {
            this.registerType(type);
        }
        return this;
    }

    registerTypesIn(path: string): Registry {
        const types: ArgumentType[] = [];
        const obj = require('require-all')(path);
        for (const type of Object.values(obj)) {
            types.push(type as ArgumentType);
        }
        return this.registerTypes(types);
    }

    findCommand(commandName: string): Command {
        return this.commands.find(cmd => cmd.isTriggered(commandName));
    }
    
}
