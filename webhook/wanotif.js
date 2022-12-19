const config = require('../config/config.json');
const twilioPhoneNumber = config.twilio.twilioPhoneNumber;
const client = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
const request = require('request');
var rp = require('request-promise');
const formidable = require('formidable');

var url = "https://docty.ai";
var hook = 'https://kakaleenacom.webhook.office.com/webhookb2/c8c94f3b-c4d9-4d2c-8b96-37f9eb8bd527@c173ad65-8736-440a-9f5a-4683b23de990/IncomingWebhook/e5c244e92ab84534a2814c3cea70dddd/89129df0-f4ed-492e-86df-2a763ed86374';
var hook1 = `https://kakaleenacom.webhook.office.com/webhookb2/c2bc162b-1cba-4c3a-8b23-a6a740aa1e8e@c173ad65-8736-440a-9f5a-4683b23de990/IncomingWebhook/17cfb1bcaba04d3e9de0c819c674ab4b/89129df0-f4ed-492e-86df-2a763ed86374`;
var json = (module, status, icon, title, text, summary = "Docty.ai | Deployment pipe notification bot") => {
  return {
    "@context": "https://schema.org/extensions",
    "@type": "MessageCard",
    "themeColor": "0072C6",
    "summary": summary,//"Docty.ai | Deployment pipe notification bot",
    // "title": "Docty.ai | Deployment pipe notification bot",
    // "text": '${url} has been deployment is finished. Please visit to site and verify sanity',
    "name": {
      "short": "Sample App",
      "full": "Sample App"
    },
    "accentColor": "#FFFFFF",
    "sections": [{
      "activityTitle": title,
      "activitySubtitle": text,
      "activityImage": `https://apicotest.docty.ai/public/icons/${icon}.png`,
      "facts": [{
        "name": "Module",
        "value": module.toUpperCase()
      }, {
        "name": "Date Time",
        "value": new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' IST'
      }, {
        "name": "Status",
        "value": status
      }],
      "markdown": true
    }],
    "description": {
      "full": "This is a small sample app we made for you! This app has samples of all capabilities Microsoft Teams supports.",
      "short": "This is a small sample app we made for you!"
    },
    "potentialAction": [],
    "icons": {
      "outline": "sampleapp-outline.png",
      "color": "sampleapp-color.png"
    },
  };
};

module.exports = {
  sendWhatsAppMessage: async (req, res, next) => {
    try {
      if (!!req.query && !!req.query.contacts) {
        let contacts = req.query.contacts.split('-');
        let promises = [];
        contacts.forEach(element => {
          promises.push(
            client.messages
              .create({
                body: req.query.message,
                from: 'whatsapp:+14155238886',
                to: 'whatsapp:+' + element
              })
          );
        });
        Promise.all(promises).then(message => res.send(message))
          .done();
      } else {
        client.messages
          .create({
            body: req.query.message,
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+919450612058'
          }).then(message => res.send(message))
          .done();
      }
    } catch (error) {
      res.send(error);
    }
  },
  sendTeamsNotif: async (req, res, next) => {
    try {
      let domain = req.params.domain;
      url = `https://${domain}.docty.ai`;
      let payload = {};//JSON.parse(JSON.stringify(json(domain, 'SUCCESS')));
      let text = '';
      let title = '';
      let potentialAction = [];
      let themeColor = '035d1b';
      let icon = '';
      let status = 'SUCCESS';
      let summary = "Docty.ai | Deployment pipe notification bot";
      if (!!req.query && +req.query.status == 1) {
        text = `${url} has been deployed successfully. Please visit to site and verify sanity`;
        title = `SUCCESS | ${domain.toUpperCase()}`;
        themeColor = '035d1b';
        icon = 'check-o';
        status = "SUCCESS";
        summary = `${domain}  Successfully Deployed`;
        potentialAction.push(
          {
            "@type": "OpenUri",
            "name": `Visit Page`,
            "targets": [
              { "os": "default", "uri": url }
            ]
          }
        );
      } else {
        text = `Opps! There are some errors in deployment. Please see build log in console for more details`;
        title = `FAILED | ${domain.toUpperCase()}`;
        themeColor = 'fe055b';
        icon = 'warning';
        status = "FAILED";
        summary = `${domain} Deployement Failed`;
      }
      payload = JSON.parse(JSON.stringify(json(domain, status, icon, title, text, summary)));
      payload.potentialAction = potentialAction;
      payload.themeColor = themeColor;
      payload = JSON.stringify(payload);
      let options = {
        'method': 'POST',
        'url': hook,
        'headers': { 'Content-Type': 'application/json' },
        body: payload
      };
      let options1 = {
        'method': 'POST',
        'url': hook1,
        'headers': { 'Content-Type': 'application/json' },
        body: payload
      };
      // res.send(payload)
      rp(options).then(() => rp(options1)).then(r => res.send(r)).catch(e => res.send(e));
    } catch (error) {
      res.send(error);
    }
  }
};