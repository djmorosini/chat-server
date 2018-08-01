const http = require('http');
const mime = require('mime-types');
const Assistant = require('./lib/assistant');
const House = require('./lib/house')
const port = process.env.PORT || 5000;
let house = new House()

http.createServer(handleRequest).listen(port)
console.log("Listening on port: " + port);

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
    console.log(extraRequest.split("="))
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
          let room = house.roomWithId(roomId)
          let messages = room.messagesSince(0)

          sendResponse(messages)
        })
      } else {

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
            console.log(allMessages)
            for (let message of allMessages) {
              console.log(message)
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
          for (let roomId of allRooms) {
            theRoom = house.roomWithId(roomId)
            roomMessages.push(theRoom.messages)
          }
          sendResponse(roomMessages)
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
          let messages = room.messagesSince(0)
          sendResponse(messages)
        }

      }
    } else if (path === '/rooms') {

      allTheRooms = house.allRoomIds()
      sendResponse(allTheRooms)

    } else if (path === `/postRoom/${roomId}`) {
      house.roomWithId(roomId)
    } else {
      let fileName = request.url.slice(1)
      assistant.sendFile(fileName)
    }
  } catch (error) {
    assistant.sendError(404, "Error: " + error.toString())
  }
}