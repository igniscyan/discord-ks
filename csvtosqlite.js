const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { dbName } = require('./config.json');


//Keep a copy of the argument (path to our csv file)
const args = process.argv.slice(2);

//Update below with the correct header names for the desired columns: Backer number, email,
//reward tier, etc
const desiredHeaders = ['Backer number', 'email', 'reward tier'];

function processCSV(csvFilePath) {
    if (!csvFilePath) {
        console.error('No CSV file path was provided.');
        return;
    }


    const db = new sqlite3.Database(dbName, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log(`Connected to the ${dbName} database.`);
    });

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('headers', (headers) => {
            const columnDefs = desiredHeaders.map(header => `\`${header}\` TEXT`);
            const createTableSql = `CREATE TABLE IF NOT EXISTS backers (
                ${columnDefs},
                redeem_token TEXT,
                redeemed BOOLEAN DEFAULT 0
                )`;
            db.run(createTableSql, (err) => {
                if (err) {
                    console.error(err.message);
                }
                console.log('Table created.');
            });
            importCSVData(db, desiredHeaders, csvFilePath);
            console.log("Generated SQL: ", createTableSql);

        })

        .on('end', () => {
            db.close((err) => {
                if (err) {
                    console.error(err.message);
                }
                console.log('Database connection closed.');
            });
        });
}


function importCSVData(db, headers, csvFilePath) {
    const insertSql = `INSERT INTO backers (${headers.map(header => `\`${header}\``).join(', ')}, redeem_token) VALUES (${headers.map(() => '?').join(', ')},?)`;
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            const redeemToken = uuidv4();

            // Create an array of values including only desired columns
            const values = headers.map(header => row[header] || null).concat(redeemToken);
            console.log('Inserting row with values: ', values);
            console.log('Generated SQL: ', insertSql);
            db.run(insertSql, values);
        });
}

if (args.length === 1) {
    processCSV(args[0]);
}
else {
    console.error('Invalid number of arguments. Please provide the path to the CSV file.');
}