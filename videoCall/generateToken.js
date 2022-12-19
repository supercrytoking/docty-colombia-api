var jsSHA = require('jssha');
var btoa = require('btoa');
var fs = require('fs');
const commandLineArgs = require('command-line-args');
var tokenGenerated = false;
var vCardFileSpecified = false;
const staticConfig = require('../config/static')

const optionDefinitions = [{
    name: 'key',
    type: String
}, {
    name: 'appID',
    type: String
}, {
    name: 'userName',
    type: String
}, {
    name: 'vCardFile',
    type: String
}, {
    name: 'expiresInSecs',
    type: Number
}, {
    name: 'expiresAt',
    type: String,
    multiple: true
}, {
    name: 'help',
    alias: 'h',
    type: String
}];

const options = commandLineArgs(optionDefinitions);

function printHelp() {
    process.exit();
}

// if ((typeof options.help !== 'undefined') || (typeof options.key == 'undefined') || (typeof options.appID == 'undefined') || (typeof options.userName == 'undefined')) {
//     printHelp();
// }

// if (typeof options.vCardFile !== 'undefined') {
//     vCardFileSpecified = true;
// }

function checkForVCardFileAndGenerateToken(key, appID, userName, expiresInSeconds) {
    if (vCardFileSpecified) {
        fs.readFile(options.vCardFile, 'utf8', function (err, data) {
            if (err) {
                return console.log("error reading vCard file " + err);
            }
            console.log("read in the fillowing vCard: " + data);
            generateToken(key, appID, userName, expiresInSeconds, data);
        });
    } else {
        generateToken(key, appID, userName, expiresInSeconds, "");
    }
}

async function generateToken(key, appID, userName, expiresInSeconds, vCard = '') {
    var EPOCH_SECONDS = 62167219200;
    var expires = Math.floor(Date.now() / 1000) + expiresInSeconds + EPOCH_SECONDS;
    var shaObj = new jsSHA("SHA-384", "TEXT");
    shaObj.setHMACKey(key, "TEXT");
    var jid = userName + '@' + appID;
    var body = 'provision' + '\x00' + jid + '\x00' + expires + '\x00' + vCard;
    shaObj.update(body);
    var mac = shaObj.getHMAC("HEX");
    var serialized = body + '\0' + mac;
    console.log("\nGenerated Token: \n" + btoa(serialized));
    return Promise.resolve(btoa(serialized));
}

//Date is in the format: "October 13, 2014 11:13:00"
function generateTokenExpiresOnDate(key, appID, userName, date) {
    var currentDate = new Date(date);
    var dateInSeconds = Math.floor(currentDate.valueOf() / 1000);
    var nowInSeconds = Math.floor(Date.now() / 1000);
    var expiresInSeconds = 0;
    if (dateInSeconds < nowInSeconds) {
        console.log("Date is before current time, so token will be invalid");
        expiresInSeconds = 0;
    } else {
        expiresInSeconds = dateInSeconds - nowInSeconds;
        console.log("Expires in seconds: " + expiresInSeconds);
    }
    checkForVCardFileAndGenerateToken(key, appID, userName, expiresInSeconds);
}

// if (typeof options.vCardFile !== 'undefined') {
//     console.log("vCardFile: " + options.vCardFile);
// }

// if (typeof options.expiresInSecs !== 'undefined') {
//     console.log("expiresInSecs: " + options.expiresInSecs);
//     checkForVCardFileAndGenerateToken(options.key, options.appID, options.userName, options.expiresInSecs);

// } else if (typeof options.expiresAt !== 'undefined') {
//     console.log("expiresAt: " + options.expiresAt);
//     generateTokenExpiresOnDate(options.key, options.appID, options.userName, options.expiresAt);
// } else {
//     console.log("Error: Neither expiresInSecs or expiresAt parameters passed in");
// }

module.exports = {
    getToken(req, res, next) {
        if (req.body.username) {
            generateToken(staticConfig.vidyoKey, staticConfig.vidyoId, req.body.username, staticConfig.vidyoDefaultDuration, '').then(resp => {
                res.send({
                    success: true,
                    token: resp
                })
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                })
            })
        } else {
            res.status(400).send({
                success: false,
                errors: req.body.username
            })
        }

    }
}