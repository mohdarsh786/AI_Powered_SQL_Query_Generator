const EventEmitter = require('events');

class SessionEmitter extends EventEmitter {}

// Export a singleton instance
module.exports = new SessionEmitter();
