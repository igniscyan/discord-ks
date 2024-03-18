//import discord js
const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const {dbName, protoshellId, arikaId, jinsecId, onryoId, supporterId} = require('../../config.json');
//initialize sqlite database
const db = new sqlite3.Database(dbName, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the backers database.');
})
module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeemrewards')
        .setDescription('Initiates Kickstarter rewards verification process.'),
    async execute(interaction) {
        const user = interaction.user;
        let email = '';
        try {
            await user.send('Hello! To start the interaction, please provide your email for authentication.');
            interaction.reply({ content: 'Please check your DMs for further instructions.', ephemeral: true });
            const dmChannel = await user.createDM(); // Create DM channel if it doesn't exist
            const filter = m => m.author.id === user.id; // Filter for messages from the user
            const collector = dmChannel.createMessageCollector({ filter, time: 30000 }); // 30-second timeout
    
            collector.on('collect', async message => {
                email = message.content;
                //remove whitespace from email 
                email = email.replace(/\s/g, '');
                collector.stop(); // Stop the collector after receiving the email
    
                // Validate and process the email here
                // ...
    
                await message.reply('Received. Processing...');
            });
    
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    await user.send('You did not respond in time. Please try again.');
                }
                else {
                    //Check if provided email exists in sqlite database
                    await user.send('You sent: ' + email);
                    //query database for provided email
                    db.get(`SELECT * FROM backers WHERE email = ?`, [email], async (err, row) => {
                        if (err) {
                            console.error(err.message);
                            return;
                        }
                        if (row) {
                            //user is in the database
                            //send user a message with their reward tier
                            let rewardTier = row['reward tier'];
                            console.log(row);
                            let message = `You are a backer with reward tier ${rewardTier}.`;
                            await user.send(message);
                            //send user a message with the redeem token
                            let redeemToken = row.redeem_token;
                            message = `Your redeem token is ${redeemToken}. Please use this token to redeem your rewards.`;
                            await user.send(message);
                            //send user a message with the instructions to redeem rewards
                            message = `To redeem your rewards, please send this code back PLACEHOLDER`
                            await user.send(message);
                            const codeCollector = dmChannel.createMessageCollector({ filter, time: 300000 }); // 5 minutes timeout
                            codeCollector.on('collect', async message => {
                                const code = message.content;
                                //trim out whitespace from code
                                const trimmedCode = code.replace(/\s/g, '');
                                if (trimmedCode === redeemToken) {
                                    //user has redeemed their rewards
                                    //update the database to reflect the redeemed status
                                    db.run(`UPDATE backers SET redeemed = 1 WHERE email = ?`, [email], function(err) {
                                        if (err) {
                                            console.error(err.message);
                                            return;
                                        }
                                        console.log(`Row(s) updated: ${this.changes}`);
                                    });
                                    //Add relevant roles to the user in the guild
                                    const guild = interaction.guild;
                                    const member = await guild.members.fetch(user.id);
                                    if (rewardTier === 'Protoshell') {
                                        member.roles.add(protoshellId);
                                    }
                                    else if (rewardTier === 'Arika') {
                                        member.roles.add(arikaId);
                                    }
                                    else if (rewardTier === 'Platinum') {
                                        member.roles.add(jinsecId);
                                    }
                                    else if (rewardTier === 'Onryo') {
                                        member.roles.add(onryoId);
                                    }
                                    else if (rewardTier === 'Supporter') {
                                        member.roles.add(supporterId);
                                    }
                                    await user.send('Congratulations! You have successfully redeemed your rewards.');
                                    codeCollector.stop();
                                }
                                else {
                                    await user.send('Sorry, the code you entered is incorrect. Please try again.');
                                }
                            });
                        }
                        else {
                            //user is not in the database
                            await user.send('Sorry, we could not find your email in our database.');
                        }
                    });
                }
            });
        }
        catch (error) {
            console.error('Could not send message to user.');
            interaction.reply({ content: 'Could not send message to user.', ephemeral: true})
        }
    }
};
