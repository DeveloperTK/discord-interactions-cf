const axios = require('axios');

module.exports = async () => {
    console.log(`
    ################################################################
    #                   WEBPACK PREBUILD PROCESS                   #
    ################################################################
    `);

    if (process.env.NODE_ENV === 'development') {
        console.log("registering ping command...");

        axios.post(
            // url
            `https://discord.com/api/v9/applications/${process.env.CLIENT_ID}/guilds/${process.env.TEST_GUILD_ID}/commands`, 
            // body
            JSON.stringify({
                "name": "ping",
                "description": "test command that responds with pong",
                "options": []
            }),
            // options
            {
                headers: {
                    Authorization: `Bot ${process.env.CLIENT_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        ).then(console.log).catch(console.error);
    }
};