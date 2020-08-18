import {Command, CommandoClient, CommandoMessage} from "discord.js-commando";

module.exports = class TestCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: 'test',
			description: 'Répond par un "Hello World!"',
			group: 'test',
			memberName: 'test',
			ownerOnly: true,
			hidden: true
		});
	}

	run(msg: CommandoMessage) {
		return msg.say('Hello World!');
	}
}
