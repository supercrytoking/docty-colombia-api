var rp = require('request-promise');

function altiria() { }
altiria.prototype.sendMessage = async (data = {}) => {
  let requestHeaders = {
    "Content-Type": "application/json",
  }
  let header = JSON.parse(JSON.stringify(requestHeaders));
  let body = {
    "credentials": {
      "login": global.credentials.ALTIRIA_LOGIN,
      "passwd": global.credentials.ALTIRIA_PASSWORD
    },
    "destination": [
      data.to
    ],
    "message": {
      "msg": (data.message || '').substr(0, 160)
    },
    senderId: +18335611198
  }
  let options = {
    uri: "http://www.altiria.net/apirest/ws/sendSms",
    headers: header,
    method: "POST",
    body: JSON.parse(JSON.stringify(body)),
    json: true
  };

  return rp(options).then(r => r).catch(e => e)
}

module.exports = { altiria }

