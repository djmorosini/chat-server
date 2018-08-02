const http = require('http');
const mime = require('mime-types');
const Assistant = require('./lib/assistant');
const House = require('./lib/house')
const MongoClient = require('mongodb').MongoClient;
const MongoURL = process.env.MONGO_CONNECTION || 'mongodb://localhost:27017'
const port = process.env.PORT || 5000;

const assert = require('assert');

const dbName = 'my_chat_server'

let house = new House()

http.createServer(handleRequest).listen(port)
console.log("Listening on port: " + port);
console.log("MONGO URL IS: " + MongoURL);

function handleRequest(request, response) {
  console.log('request.url = ' + request.url)
  let assistant = new Assistant(request, response)
  let path = assistant.path

  let roomId = path.slice(1).split('/')[1]

  let extraRequest
  let identifier
  let value

  if (request.url.includes('?')) {
    extraRequest = request.url.split('?')[1]
    let keyValues = extraRequest.split("=");
    [identifier, value] = keyValues;
  }

  function sendResponse(messages) {
    let data = JSON.stringify(messages);
    let type = mime.lookup('json')
    assistant.finishResponse(type, data)
  }

  try {
    if (path === "/") {
      assistant.sendFile('./public/index.html')

    } else if (path === "/chat") {

      if (request.method === "POST") {
        console.log('Parsing the POST')
        if (!roomId) {
          roomId = 'general'
        }
        assistant.parsePostParams((params) => {
          let message = {
            author: params.author || 'Anonymous',
            body: params.body || 'nothing',
            when: new Date().toISOString(),
            room: roomId
          }
          house.sendMessageToRoom(roomId, message);
          saveMessage(message)
          let room = house.roomWithId(roomId)
          let messages = room.messagesSince(0)

          sendResponse(messages)
        })
      } else {

        // const findDocuments = function(db, callback) {
        //   // Get the documents collection
        //   const collection = db.collection('documents');
        //   // Find some documents
        //   collection.find({}).toArray(function(err, docs) {
        //     assert.equal(err, null);
        //     console.log("Found the following records");
        //     console.log(docs)
        //     callback(docs);
        //   });
        // }

        let allRooms = house.allRoomIds()
        let roomMessages = []

        if (extraRequest && identifier === 'since') {
          for (let roomId of allRooms) {
            theRoom = house.roomWithId(roomId)
            messagesSince = theRoom.messagesSince(value)
            roomMessages.push(messagesSince)
          }
          sendResponse(roomMessages)
        } else if (extraRequest && identifier === 'author') {
          for (let roomId of allRooms) {
            theRoom = house.roomWithId(roomId)
            allMessages = theRoom.messagesSince(0)
            for (let message of allMessages) {
              if (message.author === value) {
                roomMessages.push(message)
              }
            }
          }
          sendResponse(roomMessages)
        } else if (extraRequest && identifier === 'body') {
          for (let roomId of allRooms) {
            theRoom = house.roomWithId(roomId)
            allMessages = theRoom.messagesSince(0)
            for (let message of allMessages) {
              if (message.body.includes(`${value}`)) {
                roomMessages.push(message)
              }
            }
          }
          sendResponse(roomMessages)
        } else {
          // for (let roomId of allRooms) {
          //   theRoom = house.roomWithId(roomId)
          //   roomMessages.push(theRoom.messages)
          // }
          // console.log(roomMessages)
          // sendResponse(roomMessages)
          printAllMessages({}, (messages) => {

            // return messages
            roomMessages.push(messages)
            sendResponse(roomMessages)
          })
        }
      }
    } else if (path === `/chat/${roomId}`) {

      if (request.method === "POST") {
        console.log('Parsing the POST')
        assistant.parsePostParams((params) => {
          let message = {
            author: params.author || 'Anonymous',
            body: params.body || 'nothing',
            when: new Date().toISOString(),
            room: roomId
          }
          house.sendMessageToRoom(roomId, message);

          saveMessage(message)

          let room = house.roomWithId(roomId)
          let messages = room.messagesSince(0)
          sendResponse(messages)
        })
      } else {

        let room = house.roomWithId(roomId)
        let roomMessages = []

        if (extraRequest && identifier === 'since') {
          let messages = room.messagesSince(value)
          sendResponse(messages)
        } else if (extraRequest && identifier === 'author') {
          let allMessages = room.messagesSince(0)
          for (let message of allMessages) {
            if (message.author === value) {
              roomMessages.push(message)
            }
          }
          sendResponse(roomMessages)
        } else if (extraRequest && identifier === 'body') {
          let allMessages = room.messagesSince(0)
          for (let message of allMessages) {
            if (message.body.includes(`${value}`)) {
              roomMessages.push(message)
            }
          }
          sendResponse(roomMessages)
        } else {
          // let messages = room.messagesSince(0)
          // sendResponse(messages)

          printAllMessages({ room: `${roomId}` }, (messages) => {

            // return messages
            roomMessages.push(messages)
            sendResponse(roomMessages)
          })
        }

      }
    } else if (path === '/rooms') {

      allTheRooms = house.allRoomIds()
      sendResponse(allTheRooms)

    } else if (path === `/postRoom/${roomId}`) {
      room = house.roomWithId(roomId)
      roomMessages = room.messagesSince(0)
      sendResponse(roomMessages)
    } else {
      let fileName = request.url.slice(1)
      assistant.sendFile(fileName)
    }
  } catch (error) {
    assistant.sendError(404, "Error: " + error.toString())
  }
}



function connectAnd(callback) {
  console.log("mongo url: " + MongoURL)
  MongoClient.connect(MongoURL, { useNewUrlParser: true }, function (err, client) {
    assert.equal(null, err);
    console.log("Connected successfully to server");

    const db = client.db(dbName);
    const collection = db.collection('messages');

    callback(db, collection, () => {
      client.close();
    });
  });
}

// function printMessage(message) {
// let when = message.when
// if (!currentDay) {
//   currentDay = when;
// }
//   return message;
// }
// roomID = params[room_id]
// printAllMessages({room: roomId})

function printAllMessages(query = {}, callback) {

  connectAnd((db, collection, finishUp) => {
    let cursor = collection.find(query).sort([['when', 1]]);

    messages = []

    cursor.forEach((message) => {
      // theMessage = printMessage(message);

      messages.push(message)
    }, function (err) {
      assert.equal(null, err);
      finishUp();
      callback(messages)
    });
  });

}

function saveMessage(message) {
  connectAnd((db, collection, finishUp) => {
    collection.insertOne(message, (err, r) => {
      assert.equal(null, err);
      assert.equal(1, r.insertedCount);
      console.log("saved message: " + message)
      finishUp();
    });
  });
}