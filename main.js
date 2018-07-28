let chatForm = document.getElementById('chat-form')
let chatLog = document.getElementById('chat-log')
let showMessageButton = document.getElementById('showRoomMessages')
let roomDropdown = document.getElementById('room-dropdown').value
let body = document.querySelector('body')
let roomList = document.getElementById('room-list')
let theRooms = document.getElementById('the-rooms')

function closeAlert() {
    let alert = document.getElementById('invalid-alert')
    alert.style = 'display: none;'
}

function populateRoomList() {
    theRooms.innerHTML = ''
    fetch('/rooms', {
        method: 'GET',

    }).then(response => response.json())
        .then(rooms => {
            console.log(rooms)
            theRooms.innerHTML += rooms.join('<br>');
        })
}

function submitRoom() {
    roomDropdown = document.getElementById('room-dropdown').value
    if (roomDropdown.includes(' ')) {
        roomDropdown = roomDropdown.split(' ').join('')
        console.log(roomDropdown)
    }
    if (roomDropdown != '') {
        let regex = /^[a-z]+$/
        if (regex.test(roomDropdown)) {
            document.getElementById('room-name').textContent = 'Room name: ' + roomDropdown
            fetch(`/postRoom/${roomDropdown}`, {
                method: 'POST',
            }).then(response => response.json())
                .then(room => {
                    chatLog.innerHTML = messages.map(message => message.body).join('<br>')
                })
            populateRoomList()

        } else {
            let alert = document.getElementById('invalid-alert')
            alert.style = "display: inline-block;"
        }
    }
    document.getElementById('room-dropdown').value = ''
    chatLog.innerHTML = ''
    if (roomDropdown === '') {
        document.getElementById('room-name').textContent = 'Room name: all'
        body.style = 'background-color: rgb(3, 194, 3); color: yellow;'
    } else if (roomDropdown === 'dogs') {
        body.style = 'background-color: black; color: white;'
        chatLog.style = 'color: yellow; background-color: rgba(255, 255, 255, 0.5);'
    } else if (roomDropdown === 'general') {
        body.style = 'background-color: rgb(2, 83, 2); color: white;'
    } else {
        // body.style = 'background-color: rgb(2, 83, 2);'
        // chatLog.style = 'background-color: rgba(0, 0, 0, 0.5); color: white;'
    }
    document.getElementById('messageBody').value = ''

}
function initiate() {
    populateRoomList()
    chatForm.addEventListener('submit', (event) => {
        let inputElement = chatForm.querySelector('input[author=body]')
        let message = inputElement.value;
        let params = new URLSearchParams();
        params.append('body', message);
        document.getElementById('messageBody').value = ''

        if (roomDropdown === '' || roomDropdown === 'general') {
            chatPath = '/chat'
        } else {
            chatPath = '/chat' + "/" + roomDropdown
        }

        fetch(chatPath, {
            method: 'POST',
            body: params
        }).then(response => response.json())
            .then(messages => {
                chatLog.innerHTML = messages.map(message => message.body).join('<br>')
                populateRoomList()
            })
        event.preventDefault();
    })

    showMessageButton.addEventListener('click', (event) => {
        console.log('show messages!')
        document.getElementById('messageBody').value = ''
        if (roomDropdown === '') {
            chatPath = '/chat'
        } else {
            chatPath = '/chat' + "/" + roomDropdown
        }

        function flattenDeep(arr1) {
            return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
        }

        fetch(chatPath, {
            method: 'GET',

        }).then(response => response.json())
            .then(messages => {
                allMessagesArray = messages.map((message) => {
                    console.log(message);
                    if (message.body) {
                        return message.body;
                    } else if (message.length > 0) {
                        messageArray = []
                        if (message.length > 1) {
                            for (let theMessage of message) {
                                theMessage = theMessage.body
                                messageArray.push(theMessage)
                            }
                        } else {
                            theMessage = message[0].body
                            messageArray.push(theMessage)
                        }
                        return messageArray

                    }
                })
                chatLog.innerHTML = flattenDeep(allMessagesArray).join('<br>')
            })

    })
}