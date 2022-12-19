/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

var messages = {};
var time = Date.now();

async function getTranslations() {
  return db.translation.findAll({
    where: { section: 'SERVER_MESSAGE' },
    attributes: ['keyword', 'en', 'es']
  }).then(res => {
    res.forEach(element => {
      messages[element.keyword] = { en: element.en, es: element.es };
    });
    time = Date.now() + (60 * 60 * 1000);
    return;
  });
}
getTranslations();

module.exports = {
  serverMessage: (text, lang = 'en') => {
    if (!!!Object.keys(messages).length || Date.now() > time) {
      getTranslations();
    }
    let key = text.split('.').pop();
    try {
      return messages[key][lang];
    } catch (error) {
      return text;
    }
  }
};