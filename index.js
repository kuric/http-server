const server = require('./server');
const config = require('./config/config');


server.listen(config.port, '127.0.0.1', () => {
    console.log(`Server started on "http://127.0.0.1/${config.port}"`);
});