process.stdin.setEncoding("utf8");
const fs = require("fs");
const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(express.static('public'));

const un = process.env.MONGO_DB_USERNAME;
const pw = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const coll = process.env.MONGO_COLLECTION;

const uri = `mongodb+srv://${un}:${pw}@cluster0.2xyim.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const databaseAndCollection = {db: db, collection: coll};

if (process.argv.length != 3) {
  process.exit(1);
}

const portNumber = process.argv[2]

app.listen(portNumber, () => {
  process.stdout.write(
    `Web server started and running at http://localhost:${portNumber}\n`
  );
  process.stdout.write("Stop to shutdown the server: "); //output the prompt after web server started message
});

process.stdin.on("readable", function () {
  const dataInput = process.stdin.read();
  if (dataInput !== null) {
    const command = dataInput.trim();
    if (command === "stop") {
      process.stdout.write("Shutting down the server\n");
      process.exit(0);
    }
    process.stdin.resume();
  }
});

app.get("/", (request, response) => {
  response.render("index.ejs");
});

app.get("/submit", (request, response) => {
    response.render("submit.ejs");
});

app.post("/processSubmission", async(request, response) => {

    const {name, email, team} = request.body
    let team_col;

    const url = 'https://nfl-api-data.p.rapidapi.com/nfl-team-listing/v1/data';
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': '9504eb5a6dmshfd7a5eb70e70beap107a3djsn55652a779cea',
            'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com'
        }
    };

    try {
        const response = await fetch(url, options);
        let apiresult = await response.text();
        apiresult = JSON.parse(apiresult);
        console.log(apiresult);

        let value = apiresult.find((elem) => { 
            if(elem.team.displayName.toLowerCase() == team.toLowerCase()){
                return true;
            }else{
                return false;
            }
        });

        if(value){
            let found = {
                color: value.team.color
            };
            console.log(found.color);
            team_col = found.color
        }else{
            console.log("Team not found");
        }
    } catch (error) {
        console.error(error);
    }

    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let entry = {name: name, email: email, team: team};
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(entry);;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    let info = `<p><b>Name: </b>${name}<br><b>Email Address: </b>${email}<br><b>Team: </b>${team}<hr><br><b>Switched Background Color to Team Color: #${team_col}<b><br>`;
    response.render("processSubmission.ejs", {info, team_col});
});

app.get("/reviewSubmission", (request, response) => {
    response.render("reviewSubmission.ejs");
});

app.post("/processReviewSubmission", async(request, response) => {
    const {email} = request.body
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
                const result = await client.db(databaseAndCollection.db)
                .collection(databaseAndCollection.collection)
                .findOne({email: email});
        let info;
        if (result) {
            info = `<p><b>Name: </b>${result.name}<br><b>Email Address: </b>${result.email}<br><b>Team: </b>${result.team}<hr></p>`;
        }else {
            info = `<p>No Record Found for ${email}</p>`
        }
        response.render("processReviewSubmission.ejs", {info})

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/clearEntries", (request, response) => {
    response.render("clearEntries.ejs");
});

app.post("/processClearEntries", async(request, response) => {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
                const result = await client.db(databaseAndCollection.db)
                .collection(databaseAndCollection.collection)
                .deleteMany({});
        
        let info = `<p>All submissions have been removed from the database. Number of submissions removed: ${result.deletedCount}</p>`;
    
        response.render("processClearEntries.ejs", {info})
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});