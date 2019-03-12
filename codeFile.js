let chatForm = document.getElementById('chat-form')
let chatLog = document.getElementById('chat-log')
let showMessageButton = document.getElementById('showRoomMessages')
let authorSearchButton = document.getElementById('author-search-button')
let bodySearchButton = document.getElementById('body-search-button')
let messagesSinceButton = document.getElementById('time-search-button')
let roomInput = 'general'
let body = document.querySelector('body')
let roomList = document.getElementById('room-list')
let theRooms = document.getElementById('the-rooms')
let intervalId

populateRoomList()
showAllMessages()
startAutoRefresh()

function startAutoRefresh() {
  document.getElementById("startAuto").disabled = true;
  document.getElementById("stopAuto").disabled = false;
  intervalId = setInterval(() => { showAllMessages() }, 5000)
}

function endAutoRefresh() {
  document.getElementById("startAuto").disabled = false;
  document.getElementById("stopAuto").disabled = true;
  clearInterval(intervalId)
}

function showAllMessages() {
  if (roomInput === '') {
    chatPath = '/chat'
  } else {
    chatPath = '/chat' + "/" + roomInput
  }

  function flattenDeep(arr1) {
    return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
  }

  fetch(chatPath, {
    method: 'GET',

  }).then(response => response.json())
    .then(messages => {
      allMessagesArray = messages.map((message) => {
        if (message.body) {
          return "<div class='message-class'><u>By:</u> " + message.author + " <u>At:</u> " + new Date(message.when) + " <u>Room:</u> " + message.room + "<br><u>Body:</u> " + message.body + "</div>";
        } else if (message.length > 0) {
          messageArray = []
          if (message.length > 1) {
            for (let theMessage of message) {
              theMessage = "<div class='message-class'><u>By:</u> " + theMessage.author + " <u>At:</u> " + new Date(theMessage.when) + " <u>Room:</u> " + theMessage.room + "<br><u>Body:</u> " + theMessage.body + "</div>";
              messageArray.push(theMessage)
            }
          } else {
            theMessage = "<div class='message-class'><u>By:</u> " + message[0].author + " <u>At:</u> " + new Date(message[0].when) + " <u>Room:</u> " + message[0].room + "<br><u>Body:</u> " + message[0].body + "</div>";
            messageArray.push(theMessage)
          }
          return messageArray

        }
      })
      allMessagesArray = allMessagesArray.filter(function (element) {
        return element !== undefined;
      });
      chatLog.innerHTML = flattenDeep(allMessagesArray).reverse().join('')
    })
}

function closeAlert() {
  let alert = document.getElementById('invalid-alert')
  alert.style = 'display: none;'
}

function populateRoomList() {
  fetch('/rooms', {
    method: 'GET'
  }).then(response => response.json())
    .then(rooms => {

      if (rooms[0].length > 1) {
        let roomList = []
        for (let room of rooms[0]) {
          room.chatRoomId = `<a onclick='submitRoom("${room.chatRoomId}")'><div class='class-room-list'>` + room.chatRoomId + "</div></a>"
          roomList.push(room.chatRoomId)
        }
        theRooms.innerHTML = ''
        theRooms.innerHTML += roomList.join('');

      } else if (rooms[0].length != 0) { // if theres only 1 room name
        rooms[0][0].chatRoomId = `<a onclick='submitRoom("${rooms[0][0].chatRoomId}")'><div class='class-room-list'>` + rooms[0][0].chatRoomId + "</div></a>"
        theRooms.innerHTML = ''
        theRooms.innerHTML += rooms[0][0].chatRoomId;
      } else {
      }
    })
}

function submitRoom(roomName) {
  roomInput = document.getElementById('room-name-input').value
  if (roomName) {
    roomInput = roomName
  }
  if (roomInput.includes(' ')) {
    roomInput = roomInput.split(' ').join('')
  }
  if (roomInput != '') {
    let regex = /^[a-z]+$/
    if (regex.test(roomInput)) {
      document.getElementById('room-name').textContent = 'Room name: ' + roomInput

      fetch(`/postRoom/${roomInput}`, {
        method: 'POST'
      }).then(response => response.json())
        .then(messages => {
          chatLog.innerHTML += messages.map(message => "<div class='message-class'><u>By:</u> " + message.author + " <u>At:</u> " + new Date(message.when) + " <u>Room:</u> " + message.room + "<br><u>Body:</u> " + message.body + "</div>").reverse().join('')
        })
      populateRoomList()

    } else {
      let alert = document.getElementById('invalid-alert')
      alert.style = "display: inline-block;"
      roomInput = 'general'
    }
  }
  document.getElementById('room-name-input').value = ''
  chatLog.innerHTML = ''
  if (roomInput === '') {
    document.getElementById('room-name').textContent = 'Room name: all'
    body.style = 'background-color: lightblue; color: white; background-image: url("images/lightsBackground.jpg"); background-position: center; background-size: 100%; background-repeat: no-repeat;'
  } else if (roomInput === 'dogs') {
    body.style = 'background-color: black; color: white; background-image: url("images/dallasField.jpg"); background-size: 100%; background-position: center; background-repeat:no-repeat;'
  } else if (roomInput === 'groot') {
    body.style = 'background-color: green; background-image: url("images/grootExplosion.jpg"), url("images/happyGroot.jpg"); background-position: bottom right, top right; background-size: 600px, 600px; background-repeat:no-repeat;'
  } else if (roomInput === 'general') {
    body.style = 'background-color: gray; color: white; background-image: url("images/webBackground.jpg"); background-position: bottom left; background-repeat: no-repeat;'
  } else {
    body.style = 'background-color: gray; color: white;'
    chatLog.style = 'background-color: rgba(0, 0, 0, 0.5);'
  }
  document.getElementById('messageBody').value = ''

}
chatForm.addEventListener('submit', (event) => {
  let inputElement = chatForm.querySelector('input[name=body]')
  let authorElement = chatForm.querySelector('input[name=author]')
  let author = authorElement.value
  let message = inputElement.value;
  let params = new URLSearchParams();
  params.append('author', author);
  params.append('body', message);
  document.getElementById('messageBody').value = ''

  if (roomInput === '' || roomInput === 'general') {
    chatPath = '/chat'
  } else {
    chatPath = '/chat' + "/" + roomInput
  }

  fetch(chatPath, {
    method: 'POST',
    body: params,
    author: params
  }).then(response => response.json())
    .then(messages => {
      // console.log(messages)
      chatLog.innerHTML = messages.map(message => "<div class='message-class'><u>By:</u> " + message.author + " <u>At:</u> " + new Date(message.when) + " <u>Room:</u> " + message.room + "<br><u>Body:</u> " + message.body + "</div>").reverse().join('')
      populateRoomList()
    })
  event.preventDefault();
})

showMessageButton.addEventListener('click', (event) => {
  document.getElementById('messageBody').value = ''
  if (roomInput === '') {
    chatPath = '/chat'
  } else {
    chatPath = '/chat' + "/" + roomInput
  }

  function flattenDeep(arr1) {
    return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
  }

  fetch(chatPath, {
    method: 'GET',

  }).then(response => response.json())
    .then(messages => {
      allMessagesArray = messages.map((message) => {
        if (message.body) {
          return "<div class='message-class'><u>By:</u> " + message.author + " <u>At:</u> " + new Date(message.when) + " <u>Room:</u> " + message.room + "<br><u>Body:</u> " + message.body + "</div>";
        } else if (message.length > 0) {
          messageArray = []
          if (message.length > 1) {
            for (let theMessage of message) {
              theMessage = "<div class='message-class'><u>By:</u> " + theMessage.author + " <u>At:</u> " + new Date(theMessage.when) + " <u>Room:</u> " + theMessage.room + "<br><u>Body:</u> " + theMessage.body + "</div>";
              messageArray.push(theMessage)
            }
          } else {
            theMessage = "<div class='message-class'><u>By:</u> " + message[0].author + " <u>At:</u> " + new Date(message[0].when) + " <u>Room:</u> " + message[0].room + "<br><u>Body:</u> " + message[0].body + "</div>";
            messageArray.push(theMessage)
          }
          return messageArray

        }
      })
      allMessagesArray = allMessagesArray.filter(function (element) {
        return element !== undefined;
      });
      chatLog.innerHTML = flattenDeep(allMessagesArray).reverse().join('')
    })

})

authorSearchButton.addEventListener('click', (event) => {
  endAutoRefresh()
  let authorValue = document.getElementById("author-name-search").value
  if (roomInput === '') {
    chatPath = '/chat'
  } else {
    chatPath = '/chat' + "/" + roomInput
  }
  if (authorValue) {
    chatPath = chatPath + "?author=" + authorValue

    function flattenDeep(arr1) {
      return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
    }

    fetch(chatPath, {
      method: 'GET',

    }).then(response => response.json())
      .then(messages => {
        allMessagesArray = messages.map((message) => {
          // console.log(message);
          if (message.body) {
            return "<div class='message-class'><u>By:</u> " + message.author + " <u>At:</u> " + new Date(message.when) + " <u>Room:</u> " + message.room + "<br><u>Body:</u> " + message.body + "</div>";
          } else if (message.length > 0) {
            messageArray = []
            if (message.length > 1) {
              for (let theMessage of message) {
                theMessage = "<div class='message-class'><u>By:</u> " + theMessage.author + " <u>At:</u> " + new Date(theMessage.when) + " <u>Room:</u> " + theMessage.room + "<br><u>Body:</u> " + theMessage.body + "</div>";
                messageArray.push(theMessage)
              }
            } else {
              theMessage = "<div class='message-class'><u>By:</u> " + message[0].author + " <u>At:</u> " + new Date(message[0].when) + " <u>Room:</u> " + message[0].room + "<br><u>Body:</u> " + message[0].body + "</div>";
              messageArray.push(theMessage)
            }
            return messageArray

          }
        })
        allMessagesArray = allMessagesArray.filter(function (element) {
          return element !== undefined;
        });
        chatLog.innerHTML = flattenDeep(allMessagesArray).reverse().join('')
      })
  }

})

bodySearchButton.addEventListener('click', (event) => {
  endAutoRefresh()
  let bodyValue = document.getElementById("body-search").value
  if (roomInput === '') {
    chatPath = '/chat'
  } else {
    chatPath = '/chat' + "/" + roomInput
  }
  if (bodyValue) {
    chatPath = chatPath + "?body=" + bodyValue

    function flattenDeep(arr1) {
      return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
    }

    fetch(chatPath, {
      method: 'GET',

    }).then(response => response.json())
      .then(messages => {
        allMessagesArray = messages.map((message) => {
          if (message.body) {
            return "<div class='message-class'><u>By:</u> " + message.author + " <u>At:</u> " + new Date(message.when) + " <u>Room:</u> " + message.room + "<br><u>Body:</u> " + message.body + "</div>";
          } else if (message.length > 0) {
            messageArray = []
            if (message.length > 1) {
              for (let theMessage of message) {
                theMessage = "<div class='message-class'><u>By:</u> " + theMessage.author + " <u>At:</u> " + new Date(theMessage.when) + " <u>Room:</u> " + theMessage.room + "<br><u>Body:</u> " + theMessage.body + "</div>";
                messageArray.push(theMessage)
              }
            } else {
              theMessage = "<div class='message-class'><u>By:</u> " + message[0].author + " <u>At:</u> " + new Date(message[0].when) + " <u>Room:</u> " + message[0].room + "<br><u>Body:</u> " + message[0].body + "</div>";
              messageArray.push(theMessage)
            }
            return messageArray

          }
        })
        allMessagesArray = allMessagesArray.filter(function (element) {
          return element !== undefined;
        });
        chatLog.innerHTML = flattenDeep(allMessagesArray).reverse().join('')
      })
  }
})

messagesSinceButton.addEventListener('click', (event) => {
  endAutoRefresh()
  let messagesSinceValue = new Date(document.getElementById("time-search").value).toISOString()
  if (roomInput === '') {
    chatPath = '/chat'
  } else {
    chatPath = '/chat' + "/" + roomInput
  }
  if (messagesSinceValue) {
    chatPath = chatPath + "?since=" + messagesSinceValue

    function flattenDeep(arr1) {
      return arr1.reduce(
        (acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
    }

    fetch(chatPath, {
      method: 'GET',

    }).then(response => response.json())
      .then(messages => {
        allMessagesArray = messages.map((message) => {
          if (message.body) {
            return "<div class='message-class'><u>By:</u> " + message.author + " <u>At:</u> " + new Date(message.when) + " <u>Room:</u> " + message.room + "<br><u>Body:</u> " + message.body + "</div>";
          } else if (message.length > 0) {
            messageArray = []
            if (message.length > 1) {
              for (let theMessage of message) {
                theMessage = "<div class='message-class'><u>By:</u> " + theMessage.author + " <u>At:</u> " + new Date(theMessage.when) + " <u>Room:</u> " + theMessage.room + "<br><u>Body:</u> " + theMessage.body + "</div>";
                messageArray.push(theMessage)
              }
            } else {
              theMessage = "<div class='message-class'><u>By:</u> " + message[0].author + " <u>At:</u> " + new Date(message[0].when) + " <u>Room:</u> " + message[0].room + "<br><u>Body:</u> " + message[0].body + "</div>";
              messageArray.push(theMessage)
            }
            return messageArray

          }
        })
        allMessagesArray = allMessagesArray.filter(function (element) {
          return element !== undefined;
        });
        chatLog.innerHTML = flattenDeep(allMessagesArray).reverse().join('')
      })
  }
})