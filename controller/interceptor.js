/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
var fs = require('fs');


module.exports = {
  emailReadImage: async (req, res, next) => {
    let query = req.query;
    if (query && query.type && query.email) {
      let user = await db.user.findOne({ where: { email: query.email } });
      if (!!user) {
        await db.userMeta.findOrCreate({
          where: { user_id: user.id, key: query.type }
        })
          .then(resp => resp[0].update({ value: true }).catch(err => console.log(err)))
          .catch(err => console.log(err));
      }
    }
    var s = fs.readFileSync('./public/interceptor/dot.png');
    return res.set('Content-Type', 'image/png').send(s);
  }
};