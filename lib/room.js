module.exports = class Room {
    constructor(options, name) {
        if (!options || options === '') {
            throw ('room id required')
        } else if (options === '') {
            throw ('room id required')
        } else if (options.match(/^[a-z]+$/)) {
            this.id = options
        } else {
            throw ('room id must contain only lowercase letters')
        }

        if (!name) {
            this.name = this.capitalize(`${this.id}`)
        } else {
            this.name = name
        }
        this.messages = []
    }
    capitalize(name) {
        return name[0].toUpperCase() + name.slice(1).toLowerCase();
    }
    messageCount() {
        return this.messages.length
    }
    sendMessage(message) {
        
        this.messages.push(message)
    }
    messagesSince(time) {
        
        return this.messages.filter(message =>  new Date(message.when) > new Date(time));
    }
}