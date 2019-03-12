const http = require('http');
const fs = require('fs');
const mime = require('mime-types');
const assert = require('assert');
const MongoClient = require('mongodb').MongoClient;
const MongoURL = process.env.MONGO_CONNECTION || 'mongodb://localhost:27017'
const port = process.env.PORT || 5000;

const dbName = 'my_chat_server'

http.createServer(handleRequest).listen(port)
console.log("Listening on port: " + port);
console.log("MONGO URL IS: " + MongoURL);

function handleRequest(request, response) {
  let path = request.url

  let roomId = path.slice(1).split('/')[1]

  let extraRequest
  let identifier
  let value

  if (request.url.includes('?')) {
    extraRequest = request.url.split('?')[1]
    let keyValues = extraRequest.split("=");
    [identifier, value] = keyValues;
  }

  function finishResponse(contentType, data) {
    response.setHeader('Content-Type', contentType + '; charset=utf-8');
    response.write(data);
    response.end();
  }

  function sendResponse(messages) {
    let data = JSON.stringify(messages);
    let type = mime.lookup('json')
    finishResponse(type, data)
  }

  function sendFile(file) {
    console.log('Sending ' + file);
    fs.readFile(file, (error, data)=> {
      if (error) {
        console.log(error);
        if (error.code === 'ENOENT') {
          let safeFileName = file.substring(this.publicDir.length);
          this.sendError(404, `File ${safeFileName} not found`); // 404 Not Found
        } else {
          this.sendError(500, 'Unknown error'); // 404 Not Found
        }
      } else {
        let contentType = mime.lookup(file);
        finishResponse(contentType, data);
      }
    });
  }

  function sendError(statusCode, message) {
    console.log(`Error ${statusCode}: ${message}`);
    response.statusCode = statusCode;
    finishResponse('text/plain', message);
  }

  function decodeParams(query) {
    let fields = query.split('&');
    let params = {};
    let author;
    let value;
    for (let field of fields) {
      // see http://unixpapa.com/js/querystring.html section 3.1
      [ author, value ] = field.split('=');
      value = value.replace(/\+/g,' ');
      params[author] = decodeURIComponent(value);
    }
    return params;
  }

  function parsePostParams(callback) {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      // at this point, `body` has the entire request body stored in it as a string
      console.log("received post body: " + body)
      let params = decodeParams(body);
      callback(params);
    });
  }

  try {
    if (path === "/") {
      sendFile('./public/index.html')

    } else if (path === "/chat") {

      if (request.method === "POST") {
        console.log('Parsing the POST')
        if (!roomId) {
          roomId = 'general'
        }
        parsePostParams((params) => {
          let message = {
            author: params.author || 'Anonymous',
            body: params.body || 'nothing',
            when: new Date().toISOString(),
            room: roomId
          }
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

        if (!roomId) {
          roomId = 'general'
        }

        let roomMessages = []

        if (extraRequest && identifier === 'since') {

          printAllMessages({ when: { $gt: value }, room: roomId }, (messages) => {

            for (let message of messages) {
              roomMessages.push(message)
            }
            sendResponse(roomMessages)
          })

        } else if (extraRequest && identifier === 'author') {
          printAllMessages({ author: value }, (messages) => {
            for (let message of messages) {
              roomMessages.push(message)
            }
            sendResponse(roomMessages)
          })
        } else if (extraRequest && identifier === 'body') {
          value = value.split('%20')
          value.join()
          printAllMessages({ body: new RegExp(value, 'i'), room: roomId }, (messages) => {

            for (let message of messages) {
              roomMessages.push(message)
            }
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
        parsePostParams((params) => {
          let message = {
            author: params.author || 'Anonymous',
            body: params.body || 'nothing',
            when: new Date().toISOString(),
            room: roomId
          }
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

          printAllMessages({ when: { $gt: value }, room: roomId }, (messages) => {

            for (let message of messages) {
              roomMessages.push(message)
            }
            sendResponse(roomMessages)
          })
        } else if (extraRequest && identifier === 'author') {

          printAllMessages({ author: value, room: roomId }, (messages) => {

            for (let message of messages) {
              roomMessages.push(message)
            }
            sendResponse(roomMessages)
          })
        } else if (extraRequest && identifier === 'body') {
          value = value.split('%20')
          value.join()
          printAllMessages({ body: new RegExp(value, 'i'), room: roomId }, (messages) => {

            for (let message of messages) {
              roomMessages.push(message)
            }
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
      sendFile(fileName)
    }
  } catch (error) {
    sendError(404, "Error: " + error.toString())
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

  connectAnd((db, messageCollection, roomCollection, finishConnection) => {
    let cursor = messageCollection.find(query).sort([['when', 1]]);

    messages = []

    cursor.forEach((message) => {

      messages.push(message)
    }, function (err) {
      assert.equal(null, err);
      finishConnection();
      callback(messages)
    });
  });

}

function printAllRooms(query = {}, callback) {

  connectAnd((db, messageCollection, roomCollection, finishConnection) => {
    let cursor = roomCollection.find(query).sort([['when', 1]]);

    rooms = []

    cursor.forEach((room) => {

      rooms.push(room)
    }, function (err) {
      assert.equal(null, err);
      finishConnection();
      callback(rooms)
    });
  });

}

function saveMessage(message) {
  connectAnd((db, messageCollection, roomCollection, finishConnection) => {
    messageCollection.insertOne(message, (err, r) => {
      assert.equal(null, err);
      assert.equal(1, r.insertedCount);
      console.log("saved message: " + message)
      finishConnection();
    });
  });
}

function saveRoom(room) {
  connectAnd((db, messageCollection, roomCollection, finishConnection) => {

    roomCollection.find({ chatRoomId: `${room}` }).toArray((err, roomDoc) => {
      if (roomDoc.length === 0) {
        roomCollection.insertOne({ chatRoomId: `${room}` }, (err, roomArray) => {
          if (err) {
            console.log(err)
          }
          console.log("saved room: " + room)
        });
      }
      finishConnection()
    })
  });
}