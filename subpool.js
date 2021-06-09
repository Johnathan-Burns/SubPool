// Johnathan Burns
// 2021-06-06
// SubPool server application

// Import/require all dependencies
const MongoClient = require("mongodb").MongoClient;
const Web3 = require("web3");
const config = require('config');
const https = require('https');

/*----------------------------------------------------------------------------*/
/*----------------------------------------------------------------------------*/

// Read configuration file (config/default.json)
const webConfig = config.get('MiningWebsite');
const dbConfig = config.get('Database');
const maticConfig = config.get('MaticConfig');

// Setup and confirm database connection first
const databaseConnectionURI = 'mongodb://' + dbConfig.Username + ':' + dbConfig.Password + '@' + dbConfig.DatabaseHostname;

// Setup web3 and subscription to specific events
console.log("Connecting to RPC: " + maticConfig.MaticRPCURL);
var web3 = new Web3(maticConfig.MaticRPCURL);

/*----------------------------------------------------------------------------*/
/*----------------------------------------------------------------------------*/

// TODO: Test the subscription method to make sure it does something

var subscription = web3.eth.subscribe('logs', {
	address: webConfig.MaticWETHTokenAddress,
	topics: ['0xddf252ad'], // This is the ERC20 "Transfer" method
}, function(error, result){
	if(error)
	{
		console.error(result);
	}
	else
	{
		console.log(result);
	}
})
.on("connected", function(subscriptionId){
	console.log(subscriptionId);
})
.on("data", function(log){
	console.log(log);
})
.on("changed", function(log){
});

//while(1); // Infinite loop to wait for subscription activity

// MAIN
update_all_worker_data();
//get_worker_names( (names) => { console.log(names); });

/*----------------------------------------------------------------------------*/
/*----------------------------------------------------------------------------*/

///
/// Get all worker names and update them with the latest data
///
function update_all_worker_data()
{
	get_worker_names( (names) => {
		for(let x of names)
		{
			get_worker_stats(x._id, (jsondata) =>
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
	//client.close();
}

///
/// Read out worker records from the database
/// callback: <function(array)> Callback function to process name list
///
function get_worker_names(callback)
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

	//client.close();
}

function get_worker_shares_from_db(workerName, shares)
{
	let client = new MongoClient(databaseConnectionURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	client.connect(function(err, db) {
		if(err) throw(err);
		var dbo = db.db("workers");
		dbo.collection(`${workerName}-sum`).find().toArray(function(err, results)
		{
			if(err) throw err;
			shares = results.totalShares;
		});
	});
}

///
/// Gets the current stats of a worker from the mining website
/// workerName: <string> The name of the individual worker
/// callback: <function(JSON Object)> Callback function to process the raw JSON worker stats
///
function get_worker_stats(workerName, callback)
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

// TODO: Function to swap some WETH automatically for MATIC tokens


// TODO: Initiate payout from WETH reciept
function intiate_WETH_payout()
{

}

// Check if an object (json data in this case) is empty
function isEmpty(obj) { return Object.keys(obj).length === 0; }
