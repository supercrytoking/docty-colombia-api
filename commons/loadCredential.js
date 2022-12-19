/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const fs = require("fs");

var credentials = {};

async function loadCredential() {
  try {
    db.credential.findAll().then(res => {
      res.forEach(element => {
        let key = element.key;
        if (element.user_id > 0) {
          key += `_${element.user_id}`
        }
        credentials[key] = element.value;
      });

      return global.credentials = credentials;
    });
  } catch (error) {

  }
}

module.exports = {
  loadCredential
};