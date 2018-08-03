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

          let roomMessages = []
          printAllMessages({ room: `${roomId}` }, (messages) => {

            for (let message of messages) {
              roomMessages.push(message)
            }
            sendResponse(roomMessages)
          })
        })
      } else {
        let roomMessages = []

        if (extraRequest && identifier === 'since') {

          printAllMessages({ when: { $gt: value } }, (messages) => {

            roomMessages.push(messages)
            sendResponse(roomMessages)
          })

        } else if (extraRequest && identifier === 'author') {
          printAllMessages({ author: value }, (messages) => {
            roomMessages.push(messages)
            sendResponse(roomMessages)
          })
        } else if (extraRequest && identifier === 'body') {

          printAllMessages({ body: { $in: value } }, (messages) => {

            roomMessages.push(messages)
            sendResponse(roomMessages)
          })
        } else {
          printAllMessages({}, (messages) => {

            for (let message of messages) {
              roomMessages.push(message)
            }
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
          let roomMessages = []
          printAllMessages({ room: `${roomId}` }, (messages) => {

            for (let message of messages) {
              roomMessages.push(message)
            }
            sendResponse(roomMessages)
          })
        })
      } else {

        let room = house.roomWithId(roomId)
        let roomMessages = []

        if (extraRequest && identifier === 'since') {

          printAllMessages({ when: { $gt: value } }, (messages) => {

            roomMessages.push(messages)
            sendResponse(roomMessages)
          })
        } else if (extraRequest && identifier === 'author') {

          printAllMessages({ author: value }, (messages) => {

            roomMessages.push(messages)
            sendResponse(roomMessages)
          })
        } else if (extraRequest && identifier === 'body') {

          printAllMessages({ body: { $in: value } }, (messages) => {

            roomMessages.push(messages)
            sendResponse(roomMessages)
          })
        } else {

          printAllMessages({ room: `${roomId}` }, (messages) => {
            for (let message of messages) {
              roomMessages.push(message)
            }
            sendResponse(roomMessages)
          })
        }

      }
    } else if (path === '/rooms') {

      let allRoomsArray = []
      printAllRooms({}, (rooms) => {

        allRoomsArray.push(rooms)
        sendResponse(allRoomsArray)
      })

    } else if (path === `/postRoom/${roomId}`) {
      room = house.roomWithId(roomId)
      saveRoom(roomId)
      let roomMessages = []

      printAllMessages({ room: `${roomId}` }, (messages) => {
        for (let message of messages) {
          roomMessages.push(message)
        }
        sendResponse(roomMessages)
      })
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
    const messageCollection = db.collection('messages');
    const roomCollection = db.collection('rooms');

    callback(db, messageCollection, roomCollection, () => {
      client.close();
    });
  });
}

function printAllMessages(query = {}, callback) {

  connectAnd((db, messageCollection, roomCollection, finishUp) => {
    let cursor = messageCollection.find(query).sort([['when', 1]]);

    messages = []

    cursor.forEach((message) => {

      messages.push(message)
    }, function (err) {
      assert.equal(null, err);
      finishUp();
      callback(messages)
    });
  });

}

function printAllRooms(query = {}, callback) {

  connectAnd((db, messageCollection, roomCollection, finishUp) => {
    let cursor = roomCollection.find(query).sort([['when', 1]]);

    rooms = []

    cursor.forEach((room) => {

      rooms.push(room)
    }, function (err) {
      assert.equal(null, err);
      finishUp();
      callback(rooms)
    });
  });

}

function saveMessage(message) {
  connectAnd((db, messageCollection, roomCollection, finishUp) => {
    messageCollection.insertOne(message, (err, r) => {
      assert.equal(null, err);
      assert.equal(1, r.insertedCount);
      console.log("saved message: " + message)
      finishUp();
    });
  });
}

function saveRoom(room) {
  connectAnd((db, messageCollection, roomCollection, finishUp) => {

    roomCollection.find({ chatRoomId: `${room}` }).toArray((err, roomDoc) => {
      if (roomDoc.length === 0) {
        roomCollection.insertOne({ chatRoomId: `${room}` }, (err, roomArray) => {
          if (err) {
            console.log(err)
          }
          console.log("saved room: " + room)
        });
      }
      finishUp()
    })
  });
}