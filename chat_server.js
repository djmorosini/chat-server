const http = require('http');
const mime = require('mime-types');
const Assistant = require('./lib/assistant');
const port = process.env.PORT || 5000;
let messages = [];

http.createServer(handleRequest).listen(port)
console.log("Listening on port: " + port);

function handleRequest(request, response) {
    console.log('request.url = ' + request.url)
    let assistant = new Assistant(request, response)
    let path = assistant.path

    function sendMessages() {
        let data = JSON.stringify(messages);
        let type = mime.lookup('json')
        assistant.finishResponse(type, data)
    }

    try {
        if (request.url === "/") {
            assistant.sendFile('index.html')

        } else if (request.url === "/chat") {

            if (request.method === "POST") {
                console.log('Parsing the POST')
                assistant.parsePostParams((params) => {
                    let message = {
                        author: 'Anonymous',
                        body: params.body,
                        when: new Date().toISOString()
                    }
                    messages.push(message);
                    sendMessages()
                })
            } else { // GET
                if (messages.length > 0) {
                    // let mostRecentMessageAt = messages[messages.length - 1].when
                    // console.log(mostRecentMessageAt)
                    // fetch('/chat?since=' + mostRecentMessageAt, {
                    //     method: 'GET'
                    // })
                    //     .then(response => response.json())
                    //     .then(messages => {
                    //         sendMessages()
                    //     })


                    sendMessages()

                } else {
                    console.log('No messages!')
                }
            }
        } else {
            let fileName = request.url.slice(1)
            assistant.sendFile(fileName)
        }
    } catch (error) {
        assistant.sendError(404, "Error: " + error.toString())
    }
}