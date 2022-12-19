
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const json2xls = require('json2xls');

module.exports = {
  async invoices(req, res, next) {
    if (req.user && req.user.id) {
      var myStaff = await db.associate.findAll({
        where: { user_id: req.user.id }
      });
      var staffIdList = [];
      if (myStaff) staffIdList = myStaff.map(item => item.associate);
      staffIdList.push(req.user.id);
      let where = { from_id: { [Op.in]: staffIdList } };
      if (req.query && req.query.from_id) {
        where.from_id = req.query.from_id
      }
      if (req.query && req.query.to_id) {
        where.to_id = req.query.to_id
      }
      db.invoice.findAll({ where: where, include: ['from', 'to', 'booking'], order: [['createdAt', 'DESC']] }).then(resp => {
        res.send(resp)
      }).catch(err => {
        console.log(err)
        res.status(400).send({
          status: false,
          errors: err
        })
      })

    }
    else {
      res.sendStatus(406)
    }
  },
  async downloadCSV(req, res, next) {
    var query = req.query;

    var where = {};
    if (query.from) {
      where['createdAt'] = { [Op.gte]: (new Date(query.from)) }
    }
    if (query.to) {
      where['createdAt'] = { [Op.lte]: (new Date(query.to)) }
    }

    if (query.from && query.to) {
      where['createdAt'] = { [Op.and]: [{ [Op.gte]: (new Date(query.from)) }, { [Op.lte]: (new Date(query.to)) }] }
    }

    if (query.user_id == null) {
      res.status(404).send({
        status: false,
        errors: `Require user_id`
      });
      return;
    }
    var myStaff = await db.associate.findAll({
      where: { user_id: query.user_id }
    });
    var staffIdList = [];
    if (myStaff) staffIdList = myStaff.map(item => item.associate);

    where.from_id = { [Op.in]: staffIdList };

    db.invoice.findAll({ where: where, include: ['from', 'to'] }).then(resp => {
      var mySTAFFInvoice = JSON.parse(JSON.stringify(resp));

      let csvObj = [];
      for (var i = 0; i < mySTAFFInvoice.length; i++) {
        var invoice = mySTAFFInvoice[i];
        invoice.from = invoice.from || { fullName: 'UNKOWN' }
        invoice.to = invoice.to || { fullName: 'UNKOWN' }
        csvObj.push({
          "Invice ID": invoice.invoice_id,
          "From": invoice.from.fullName,
          "To": invoice.to.fullName,
          "Booking ID": invoice.booking_id,
          "Payment Mode": invoice.payment_mod,
          "Amount": invoice.amount,
          "Status": invoice.status,
          "Discount": invoice.discount
        })
      }
      return res.xls('invoce.xlsx', csvObj)

    }).catch(err => {
      res.status(400).send({
        status: false,
        errors: err
      })
    })
  },
  async saveSettings(req, res, next) {
    let data = req.body;
    db.userMeta.findOrCreate({
      where: {
        user_id: req.user.id,
        key: data.key
      }
    }).then(resp => {
      return resp[0].update(data)
    }).then(resp => res.send(resp))
      .catch(e => res.status(400).send({ status: false, error: `${e}` }))
  },
  async getSettings(req, res, next) {
    let data = req.params;
    db.userMeta.findOne({
      where: {
        user_id: req.user.id,
        key: data.key
      }
    }).then(resp => res.send(resp))
      .catch(e => res.status(400).send({ status: false, error: `${e}` }))
  }
}