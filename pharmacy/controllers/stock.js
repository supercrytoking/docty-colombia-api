const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
var xlsx = require("node-xlsx");
const { serverMessage } = require("../../commons/serverMessage");
const { ExcelDateToJSDate } = require("../../commons/helper");

module.exports = {
  store: async (req, res, next) => {
    let data = req.body || {};
    data.user_id = req.user.id;
    db.stock.upsert(data)
      .then(rep => res.send(rep))
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  },
  bulkAddMedicine: async (req, res) => {

    try {
      if (req.file == null) {
        return res.status(400).send({
          status: false,
          errors: `require file`,
        });
      }
      var excel_path = req.file.path;

      if (!excel_path.endsWith("xlsx") && !excel_path.endsWith("csv")) {
        return res.status(400).send({
          status: false,
          errors: `Unsupported file format, must xlsx, csv file`,
        });
      }
      var obj = xlsx.parse(excel_path);
      if (obj.length == 0) {
        return res.status(400).send({
          status: false,
          errors: `Cannot parse xlsx`,
        });
      }
      let limit = 500;
      let cred = await db.credential.findOne({ where: { key: 'BULK_UPLOAD_ROW_LIMIT' } });
      if (!!cred && !!cred.value) {
        limit = parseInt(cred.value);
      }
      if (isNaN(limit) || !!!limit) limit = 500;
      let data = obj[0].data || [];
      data.shift();
      if (data.length > limit) {
        let msg = serverMessage('SERVER_MESSAGE.BULK_UPLOAD_ROW_LIMIT_EXCEED ', (req.lang || 'es'));
        msg = msg.replace('${limit}', limit);
        res.status(400).send({
          status: false,
          message: msg,
          errors: msg,
          error: msg
        });
      }
      let locations = await db.location.findAll({ where: { user_id: req.user.id } });
      if (!!!locations) {
        locations = []
      }
      let promises = [];
      for (let row of data) {
        let loc = locations.find(e => (e.title || '').toLowerCase().includes((row[6] || '').toLowerCase()))
        if (!!!loc) {
          loc = {}
        }
        let inst = {
          user_id: req.user.id,
          title: row[0],
          manufacturer: row[1],
          mfg_date: ExcelDateToJSDate(row[2]),
          exp_date: ExcelDateToJSDate(row[3]),
          quantity: row[4],
          type: row[5],
          location_id: loc.id || null,
          used_for: row[7]
        }
        if (inst.title) {
          promises.push(
            db.stock.findOrCreate({ where: { title: inst.title, user_id: inst.user_id, location_id: inst.location_id } }).then(resp => {
              resp[0].update(inst);
              return resp[0]
            }).catch(e => e)
          )
        }
      }
      Promise.all(promises)
        .then(re => res.send({ status: true }))
        .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
    } catch (error) {
      res.status(400).send({ status: false, error: (e.message || `${error}`) })
    }
  },
  stocks: async (req, res) => {
    let query = req.query || {};
    let order = 'DESC';
    let orderKey = 'title';
    let limit = 25;
    let page = 1;
    let where = { user_id: req.user.id };

    if (!!query.orderKey) {
      orderKey = query.orderKey
    }
    if (!!query.order) {
      order = query.order
    }
    if (!!query.page) {
      page = query.page
    }
    if (page < 1) {
      page = 1
    }
    if (!!query.limit) {
      limit = query.limit
    }

    if (!!query.location_id) {
      where.location_id = query.location_id
    }
    if (!!query.type) {
      where.type = query.type
    }
    if (!!query.search) {
      where[[Op.or]] = [
        { title: { [Op.like]: `%${search}%` } },
        { used_for: { [Op.like]: `%${search}%` } },
      ]
    }
    if (!!query.mfg_before) {
      where.mfg_date = { [Op.lte]: query.mfg_before }
    }
    if (!!query.mfg_after) {
      where.mfg_date = { [Op.gte]: query.mfg_after }
    }
    if (!!query.exp_before) {
      where.exp_date = { [Op.lte]: query.exp_before }
    }
    if (!!query.exp_after) {
      where.exp_date = { [Op.gte]: query.exp_after }
    }

    db.stock.findAndCountAll({
      where,
      limit: getLimitOffset(page, limit),
      order: [[orderKey, order]],
      include: [{ as: 'location', model: db.location, attributes: ['id', 'title'] }]
    })
      .then(rep => response(res, rep, null, limit))
      .catch(e => res.status(400).send({ status: false, error: (e.message || `${e}`) }))
  }
}