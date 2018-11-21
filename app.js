import bodyParser from 'body-parser';
import express from 'express';
import db from './db/db';
import mondodb from 'mongodb';
// Set up the express app
const assert = require('assert');
const app = express();
const ttlLimit = 20;
const mongoData = mondodb.MongoClient;
const mongoUrl = "mongodb://fcloudtest1:Test123@ds035693.mlab.com:35693/fcloudtest";
let tempDb;
let currDBLen;
let collectionDB;

Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}

function fnGetRandomString(len, callBack) {
    let randomString = Math.random().toString(36).substring(len);
    isExists(randomString,function(resp){
		if(!resp){
			randomString = Math.random().toString(36).substring(len);	
		}
		callBack(randomString, resp);
	});
	
}

function isExists(randomString,callBack) {
    collectionDB.find({'randomString': randomString}).toArray(function(err, res) {
        if(res.length < 1){
			callBack(false);
		}else{
			callBack(true);
		}
    });
}

//connecting to the database
const client = new mongoData(mongoUrl, {
    useNewUrlParser: true
});

client.connect(function(err) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    tempDb = client.db('fcloudtest');
    collectionDB = tempDb.collection('fclouddata');
    //client.close();
});


// Parse incoming requests data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
// get all todos

app.get('/api/v1/todos/all', (req, res) => {
    collectionDB.find().toArray(function(err, results) {
        // send HTML file populated with quotes here
        res.status(200).send({
            success: 'true',
            message: 'todos retrieved successfully',
            todos: results
        })
    });
});
app.get('/api/v1/todos/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    collectionDB.find({
        'id': id
    }).toArray(function(err, results) {
        if (results.length < 1) {
            return res.status(404).send({
                success: 'false',
                message: 'todo does not exist',
            });
        } else {
            updateDocument({
                'id': id
            }, {
                createdAt: new Date(),
                ttl: new Date().addHours(3)
            }, collectionDB, function(results) {
                res.status(200).send({
                    success: 'true',
                    message: 'todo retrieved successfully',
                    todos: results
                })
            });


        }
    });
});
//update the data
app.post('/api/v1/todos/post/', (req, res) => {
    
    if (!req.body.title) {
        return res.status(400).send({
            success: 'false',
            message: 'title is required'
        });
    } else if (!req.body.description) {
        return res.status(400).send({
            success: 'false',
            message: 'description is required'
        });
    }
	
    collectionDB.countDocuments(function(reject, dbCount) {
		console.log('comes here' , dbCount);
		
        if (dbCount + 1 > ttlLimit) {
            //do something here
        } else {
			fnGetRandomString(5, function(resp, boll){
				const todo = {
                id: dbCount + 1,
                createdAt: new Date(),
				ttl: new Date().addHours(3),
                title: req.body.title,
                description: resp,
            }
			
            collectionDB.insertOne(todo, (err, result) => {
                if (err) return console.log(err);
                else {
                    console.log('saved to database');
                    return res.status(201).send({
                        success: 'true',
                        message: 'todo added successfully',
                        todo
                    })
                }
            });
			});
            
        }
    });

});
const updateDocument = function(currData, newData, collection, callback) {
    // Update document where a is 2, set b equal to 1
    collection.updateOne(currData, {
        $set: newData
    }, function(err, result) {
        console.log("Updated the document from:", currData, "  \nto:", newData);
        callback(result);
    });
}
//delete the data
app.post('/api/v1/todos/del/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
	
    collectionDB.deleteOne({"id": id}, function(err, res) {
        if(res.result.n > 0){
			return {
				success: 'true',
				message: 'Todo ' + id + ' deleted successfuly',
			};
		}else{
			return {
				success: 'false',
				message: 'todo does not exist',
			};
		}
    });
});
app.post('/api/v1/todos/del/all', (req, res) => {
    const id = parseInt(req.params.id, 10);
    db.map((todo) => {
        if (todo.id === id) {
            db.splice(index, 1);
            return res.status(200).send({
                success: 'true',
                message: 'Todo ' + id + ' deleted successfuly',
            });
        }
    });
    return res.status(404).send({
        success: 'false2',
        message: 'todo does not exist',
    });
});
const PORT = 5123;

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
});