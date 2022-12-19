/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models");
const config = require(__dirname + "/../config/config.json");


module.exports = {
  getProfile: async (req, res) => {
    db.user.findByPk(req.user.id)
      .then(async ress => {
        let repss = JSON.parse(JSON.stringify(ress));
        let contacts = await db.org_contacts.findAll({ where: { user_id: repss.id } });
        if (!!contacts && !!contacts.length) {
          contacts.forEach(element => {
            repss[element.type] = { full_name: element.full_name, phone: element.phone, email: element.email }
          });
        }
        res.send(repss)
      })
      .catch(e => res.status(400).send({ status: false, error: `${e}` }))
  },

  saveProfile: async (req, res) => {

  },
  updateOrgContacts: async (data) => {
    return db.org_contacts.findOrCreate({ where: { user_id: data.user_id, type: data.type } }).then(resp => {
      resp[0].update(data)
      console.log(resp[0])

      return resp[0];
    })
  }
}