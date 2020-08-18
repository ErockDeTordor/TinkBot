'use strict';
//require('dotenv').config(); // Recommended way of loading dotenv
import { Tinkbot } from "./classes/tinkbot.js";
import { Snowflake } from "discord.js";

const TAINK_USER_ID: Snowflake = '277518283576705034';

let token: string = process.env.TOKEN;
let inDev: boolean = false;

if (process.argv.includes('-dev')) {
    console.log('Devmode activated!');
    token = process.env.DEV_TOKEN;
    inDev = true;
}

let bot: Tinkbot = Tinkbot.createInstance({
    token,
    inDev,
    prefix: 't!',
    owners: [TAINK_USER_ID],
});
bot.listen().catch(console.error);
