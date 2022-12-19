const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { serverMessage } = require('../../commons/serverMessage');


module.exports = {
  addHis: async (req, res, next) => {
    let user = req.user.id;
    let data = req.body;
    data.user_id = user;
    data.base_url = data.base_url.replace(/\/$/, "");
    db.his_info.upsert(data).then(resp => {
      return res.send({
        status: true
      })
    }).catch(r => {
      return res.status(500).send({
        status: false,
        error: `${r}`,
        errors: r
      })
    })
  },
  getHisIntegrations: async (req, res, next) => {
    let user = req.user.id;
    db.his_info.findAll({ where: { user_id: req.user.id } }).then(resp => {
      return res.send(resp)
    }).catch(r => {
      return res.status(500).send({
        status: false,
        error: `${r}`,
        errors: r
      })
    })
  },
  deleteHis: async (req, res, next) => {
    db.his_info.destroy({
      where: { id: req.params.id, user_id: req.user.id }
    }).then(resp => {
      return res.send({
        status: true
      })
    }).catch(r => {
      return res.status(500).send({
        status: false,
        error: `${r}`,
        errors: r
      })
    })
  },
  syncRequest: async (req, res, next) => {
    let d = await db.his_info.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    })
    if (!!d) {
      if (['pending', 'running'].includes(d.status)) {
        return res.status(500).send({
          status: false,
          message: serverMessage('SERVER_MESSAGE.INPROGESS')
        })
      }
      d.update({
        // last_synced: new Date(),
        status: 'pending'
      })
      return res.send({
        status: true,
        message: serverMessage('SERVER_MESSAGE.REQUEST_SUBMITTED')
      })
    } else {
      return res.status(500).send({
        status: false,
        message: serverMessage('SERVER_MESSAGE.SONTHING_WRONG')
      })
    }

  }
}