/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

var creds = {};
var time = Date.now();

async function getCredential() {
  if (!!!Object.keys(creds).length || Date.now() > time) {
    return db.credential.findAll().then(res => {
      res.forEach(element => {
        creds[element.key] = element.value;
      });
      time = Date.now() + (60 * 60 * 1000);
      return;
    });
  }
  return;
}
getCredential();

module.exports = {
  credentials: creds
};