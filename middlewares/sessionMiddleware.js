const session = require('express-session');
const sessionMiddleware = session({ secret: 'keyboard cat', cookie: { maxAge: 3600000 }});
module.exports = sessionMiddleware;