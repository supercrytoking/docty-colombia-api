const config = require(__dirname + '/../config/config.json');
var rp = require('request-promise');

async function linkGen(link) {
    let linkRequest = { /* destination is the long url which is to be shorten */
      destination: link
    }
    let requestHeaders = { 
      "Content-Type": "application/json",
      "apikey": config.rebrandly.apikey     /* api key is found when logged into rebrandly account and is declared in config.json*/
    }
  
    let header = JSON.parse(JSON.stringify(requestHeaders)); 
    let options = {    
      uri: "https://api.rebrandly.com/v1/links",
      headers: header,
      method: "POST",
      body: JSON.parse(JSON.stringify(linkRequest)),
      json: true
    };
   
   return   rp(options)
    .then((data) => {
     return data.shortUrl;   /* returning short url */
    }).catch(err=>{
      return 'error occurred while creating short url';
    });
  }

  module.exports = {
    linkGen
  }


