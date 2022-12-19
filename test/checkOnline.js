const request = require('request');
const config = require('../config/config.json');
var url = `${config.socket_server_url}/api/socket_io/checkUserOnline`;

var options = {
    'method': 'POST',
    'url': url,
    'headers': { 'Content-Type': 'application/json' },
    body: JSON.stringify([])

};
request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
});
