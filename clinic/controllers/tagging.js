const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
var os = require('os');
const { response, errorResponse } = require('../../commons/response');
const { getLimitOffset } = require('../../commons/paginator');

module.exports = {
  tagUser: async (req, res, next) => {
    let user_id = req.user.id;
    let data = req.body || {};
    if (!!!data.customer || !!!data.tags) {
      return res.status(400).send({ status: false, error: 'data error' })
    }
    db.customer.update({ tags: data.tags }, { where: { user_id, customer: data.customer } })
      .then(async (r) => {
        res.send({ status: true })
      }).catch(e => res.status(400).send({ status: false, error: `${e}` }))
  },
  taglist: async (req, res, next) => {
    db.clinic_user_taglist.findOne({ where: { clinic_id: req.user.id } }).then(re => {
      let tags = [];
      if (!!re)
        tags = re.tags || [];
      if (typeof tags == 'string') tags = JSON.parse(tags)
      res.send(re.tags)
    }).catch(() => res.send([]))
  },
  addtag: async (req, res) => {
    let newtags = req.body.tags;
    if (!!!newtags || !!!newtags.length) {
      return res.status(400).send({ status: false, error: 'data error' })
    }
    let tag = await db.clinic_user_taglist.findOne({ where: { clinic_id: req.user.id } });
    let tags = []
    if (!!tag) {
      tags = tag.tags || [];
    }
    if (typeof tags == 'string') tags = JSON.parse(tags);
    for (let newtag of newtags) {
      if (!!!tags.includes(newtag)) {
        tags.push(newtag);
      }
    }
    await db.clinic_user_taglist.findOrCreate({ where: { clinic_id: req.user.id } }).then(r =>
      db.clinic_user_taglist.update({ tags }, { where: { clinic_id: req.user.id } })
    )
    return res.send({ status: true })
  },
  removetag: async (req, res, next) => {
    let newtags = req.body.tags;

    let tag = await db.clinic_user_taglist.findOne({ where: { clinic_id: req.user.id } });
    let tags = []
    if (!!tag) {
      tags = tag.tags || [];
    }
    if (typeof tags == 'string') tags = JSON.parse(tags);
    tags = tags.filter(e => !!!newtags.includes(e))
    db.clinic_user_taglist.findOrCreate({ where: { clinic_id: req.user.id } }).then(r => {
      db.clinic_user_taglist.update({ tags }, { where: { clinic_id: req.user.id } });
      return module.exports.taglist(req, res, next);
    }).catch(() => {
      return module.exports.taglist(req, res, next);
    })
  }
}