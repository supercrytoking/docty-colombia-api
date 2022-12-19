const db = require("../models")
var rp = require('request-promise');
const config = require(__dirname + '/../config/config.json');

const getInfermedicaNames = async (lang) => {
  let headers = config.infermedicHeaders;
  headers.Model = `infermedica-${lang}`;
  let options = {
    uri: `https://api.infermedica.com/v3/concepts?types=condition,symptom,risk_factor`,
    headers: headers,
    json: true
  };
  rp(options).then((res) => {
    return res.map(e => {
      return { identity: e.id, language: lang, keyword: e.common_name, type: `infermedica_${e.type}` }
    })
  })
    .then(r => db.dropdown.bulkCreate(r, { returning: true })
    )
}

getInfermedicaNames('en').then(() => getInfermedicaNames('es'))