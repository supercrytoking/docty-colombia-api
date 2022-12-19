const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
  modules: async (req, res, next) => {
    db.org_permission_module.findAll()
      .then(rep => res.send(rep))
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
  groups: async (req, res, next) => {
    db.org_staff_group.findAll({ where: { user_id: req.user.id } })
      .then(rep => res.send(rep))
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
  getGroup: async (req, res, next) => {
    db.org_staff_group.findOne({ where: { id: req.params.id, user_id: req.user.id } })
      .then(rep => res.send(rep))
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
  createGroups: async (req, res, next) => {
    let data = req.body || {};
    data.user_id = req.user.id;
    db.org_staff_group.upsert(data)
      .then(rep => res.send({ satus: true }))
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
  getStaffPermission: async (req, res) => {
    let params = req.params || {};
    let user_id = req.user.id;
    db.org_staff_permission.findOne({
      where: {
        user_id: user_id, staff_id: params.staff_id
      }
    })
      .then(resp => res.send(resp))
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
  setStaffPermission: async (req, res) => {
    let data = req.body || {};
    data.user_id = req.user.id;
    db.org_staff_permission.findOrCreate({
      where: {
        user_id: data.user_id, staff_id: data.staff_id
      }
    }).then(async (resp) => {
      await resp[0].update(data);
      return res.send(resp[0])
    })
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
}