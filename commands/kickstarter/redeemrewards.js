//import discord js
const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { dbName, protoshellId, arikaId, jinsecId, onryoId, supporterId, kickstarterRewardsChannel } = require('../../config.json');

//initialize sqlite database
const db = new sqlite3.Database(dbName, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the backers database.');
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeemrewards')
        .setDescription('Initiates Kickstarter rewards verification process.'),
    async execute(interaction) {
        const user = interaction.user;
        let email = '';

        try {
            const initialMessage = `
            **Hello!**
            <a:hypeglitch:1172174603595026483> Thank you for backing the Kickstarter and helping hit our goal! <a:hypeglitch:1172174603595026483> 
            
            To receive your backer roles, please provide the email address you used to back the Kickstarter campaign.

            \`Example\`: \`f4rtWH15P3R@arikacorp.net\`
            
            **Please note:**
            These rewards can only be redeemed on *one* Discord account. Be sure this is the account you want to receieve awards on!`
            await user.send(initialMessage);
            interaction.reply({ content: 'Please check your DMs for further instructions.', ephemeral: true });
            const dmChannel = await user.createDM(); // Create DM channel if it doesn't exist
            const filter = m => m.author.id === user.id; // Filter for messages from the user
            const collector = dmChannel.createMessageCollector({ filter, time: 30000 }); // 30-second timeout

            collector.on('collect', async message => {
                email = message.content;
                //remove whitespace from email 
                email = email.replace(/\s/g, '');
                collector.stop(); // Stop the collector after receiving the email
                
                await message.reply('Received. Processing...');
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    await user.send('You did not respond in time. Please try again.');
                }
                else {
                    // Check if provided email exists in sqlite database
                    await user.send('Performing ArikaDB <:arika:1171969470982529135> analysis:' + email);
                    // Query database for provided email
                    db.get(`SELECT * FROM backers WHERE email = ?`, [email], async (err, row) => {
                        if (err) {
                            console.error(err.message);
                            await user.send('S0m3th1ng has g0n3 c@t@str0ph1c@lly wr0ng. Please try again later.');
                            return;
                        }
                        if (row) {
                            // User is in the database
                            // Send user a message with their reward tier
                            let rewardTier = row['reward tier'];
                            console.log(row);
                            let message = `You are a backer with reward tier ${rewardTier}.`;
                            await user.send(message);

                            if (row.redeemed === 1) {
                                // Reward already redeemed
                                await user.send('Your rewards have already been redeemed. If this is an error');
                            } else {
                                // Reward not redeemed, grant rewards
                                // Add relevant roles to the user in the guild
                                const guild = interaction.guild;
                                const member = await guild.members.fetch(user.id);
                                
                                if (rewardTier === 'Proto-Shell') {
                                    let protoShellAwards = [protoshellId, arikaId, jinsecId, onryoId, supporterId]
                                    member.roles.add(protoShellAwards)
                                    .then(()=> console.log('Roles added successfully!'))
                                    .catch(error => console.error(`Error adding roles: ${error}`))
                                    
                                }
                                else if (rewardTier === 'Jin-Sec Loyalist') {
                                    let jinSecAwards = [jinsecId, supporterId]
                                    member.roles.add(jinSecAwards)
                                    .then(()=> console.log('Roles added successfully!'))
                                    .catch(error => console.error(`Error adding roles: ${error}`))
                                }

                                else if (rewardTier === 'Onryō Insurgent') {
                                    let onryoAwards = [onryoId, supporterId]
                                    member.roles.add(onryoAwards)
                                    .then(()=> console.log('Roles added successfully!'))
                                    .catch(error => console.error(`Error adding roles: ${error}`))
                                }
                                
                                else if (rewardTier === 'Arika Executive' || rewardTier === 'Arika Overseer') {
                                    let arikaAwards = [arikaId, onryoId, jinsecId, supporterId]
                                    member.roles.add(arikaAwards)
                                    .then(()=> console.log('Roles added successfully!'))
                                    .catch(error => console.error(`Error adding roles: ${error}`))
                                }
                                //Several tiers get the supporter role.
                                else if (rewardTier === 'Supporter' || rewardTier === 'Prime Supporter' || rewardTier === 'Benefactor' || rewardTier === 'Devout Benefactor') {
                                    member.roles.add(supporterId);
                                }
                                await user.send('Congratulations! You have successfully redeemed your rewards.');
                                // Update the database to reflect the redeemed status
                                db.run(`UPDATE backers SET redeemed = 1 WHERE email = ?`, [email], function(err) {
                                    if (err) {
                                        console.error(err.message);
                                        return;
                                    }
                                    console.log(`Row(s) updated: ${this.changes}`);
                                });
                            }
                        }
                        else {
                            // User is not in the database
                            await user.send('Sorry, we could not find your email in our database.');
                        }
                    });
                }
            });
        }
        catch (error) {
            console.error('Could not send message to user.');
            interaction.reply({ content: 'Could not send message to user.', ephemeral: true });
        }
    }
};