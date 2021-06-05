// Johnathan Burns
// 2021-06-04
// SubPool server applet to update client data

// Import/require all dependencies
const MongoClient = require("mongodb").MongoClient;
const config = require('config');
const https = require('https');

// Read configuration file (config/default.json)
const webConfig = config.get('MiningWebsite');
const dbConfig = config.get('Database');

// Setup and confirm database connection first
const databaseConnectionURI = 'mongodb://' + dbConfig.Username + ':' + dbConfig.Password + '@' + dbConfig.DatabaseHostname;

// MAIN FUNCTION
get_and_insert_all_miner_records();


///
/// Get all worker names and update them with the latest data
///
function get_and_insert_all_miner_records()
{
	get_all_worker_names( (names) => {
		for(let x of names)
		{
			get_worker_records(x._id, (jsondata) =>
			{
				if(!isEmpty(jsondata.data))
				{
					insert_worker_records(jsondata);
				}
				else
				{
					console.log("data is empty");
				}
			});
		}
	});
}

///
/// Insert new records into the database
/// Note: MongoDB is used because of this feature
/// jsonData: <JSON Object> The JSON document to insert into the database
///
function insert_worker_records(jsonData)
{
	let client = new MongoClient(databaseConnectionURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	let workerName = jsonData.status;

	client.connect(function(err, db) {
		if(err) throw err;
		var dbo = db.db("workers");

		dbo.collection(workerName).insertOne(jsonData, function(err, res)
		{
			if(err) throw err;
			console.log('1 document inserted for ' + workerName);
			db.close();
		});
	});
}

///
/// Read out worker records from the database
/// callback: <function(array)> Callback function to process name list
///
function get_all_worker_names(callback)
{
	let client = new MongoClient(databaseConnectionURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	client.connect(function(err, db) {
		if(err) throw err;
		var dbo = db.db("workers");
		dbo.collection("worker-names").find().toArray(function(err, results)
		{
			if(err) throw err;
			callback(results);
			db.close();
		});
	});
}

///
/// Gets the current stats of a worker from the mining website
/// workerName: <string> The name of the individual worker
/// callback: <function(JSON Object)> Callback function to process the raw JSON worker stats
///
function get_worker_records(workerName, callback)
{
	let options = {
		hostname: webConfig.WebsiteHostname,
		port: 443,
		path: webConfig.WebsitePath1 + webConfig.PayoutAddress + webConfig.WebsitePath2 + workerName + webConfig.WebsitePath3,
		method: 'GET'
	}

	const req = https.request(options, res => {
		let body = "";
		console.log(`Web connect status code: ${res.statusCode}`);
		res.setEncoding('utf8');

		res.on('data', (chunk) => {
			body += chunk;
		});

		res.on('end', () => {
			try
			{
				let json = JSON.parse(body);

				json.status = workerName;

				callback(json);
			}
			catch (error)
			{
				console.error(error);
			}
		});
	});

	req.on('error', error => {
		console.error(error);
	});

	req.end();
}

// Check if an object (json data in this case) is empty
function isEmpty(obj) { return Object.keys(obj).length === 0; }
