const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

const { serverMessage, } = require('../../commons/serverMessage');

const { response, errorResponse } = require('../../commons/response');

module.exports = {
  addPharmacy: async (req, res, next) => {
    let input = req.body || {};
    if (!!input.pharmacy_id) {
      let ph = await db.clinic_pharmacy.findOrCreate({ where: { clinic_id: req.user.id, pharmacy_id: input.pharmacy_id, pharmacy_location_id: input.pharmacy_location_id } });
      if (!!ph && ph.length) {
        let p = ph[0];
        let ud = { location_id: input.location_id }
        if (!!!p.type) {
          ud.type = input.type;
        }
        p.update(ud).then(resp => res.send({ status: true, data: p }))
          .catch(e => res.status(400).send({ status: false, message: `${e}` }))
      } else {
        res.status(400).send({ status: false, message: serverMessage(`SERVER_MESSAGE.SONTHING_WRONG`, req.lang) })
      }
    } else {
      let u = await db.user.findOne({ where: { email: input.support_email, email_verified: true } });
      if (!!u) {
        return res.status(403).send({ status: false, message: serverMessage(`SERVER_MESSAGE.EMAIL_UNAVALABLE`, req.lang) })
      }
      let user_info = {
        company_name: input.company_name, email: input.support_email,
        phone_number: input.support_phone, status: input.status, email_verified: true,
        user_role: { role_id: 6 },
        pharmacy_clinic: { clinic_id: req.user.id, type: input.type, location_id: input.location_id }
      }
      return db.user.create(user_info, { include: ['user_role', 'pharmacy_clinic'] }).then(async (resp) => {
        let contacts =
          [
            { user_id: resp.id, full_name: input.manager_name, phone: input.manager_phone, email: input.manager_email, type: 'manager', location_id: input.location_id },
            { user_id: resp.id, full_name: input.support_name, phone: input.support_phone, email: input.support_email, type: 'support', location_id: input.location_id },
          ]
        await db.org_contacts.bulkCreate(contacts);
        return resp
      }).then(resp => res.send(resp))
        .catch(e => res.status(400).send({ status: false, message: `${e}` }))
    }
  },
  getMyPharmas: async (req, res, next) => {
    let where = { clinic_id: req.user.id };
    if (!!req.params && !!req.params.type) {
      where.type = req.params.type;
    }
    const TODAY_START = new Date().setHours(0, 0, 0, 0);
    const NOW = new Date();
    let query = req.query || {};
    let include = []
    let includeAttr = [];
    if (!!query.include) {
      let includeAttr = ['id'];
      include = query.include.split(',');
    } else {
      includeAttr = ['id',
        [db.sequelize.fn('COUNT', db.sequelize.col('bookings.id')), 'todaysOrders'],
        [db.sequelize.fn('SUM', db.sequelize.col('invoices.total')), 'totalSales'],
      ];
      include = [
        'pharmacy',
        {
          model: db.location.scope(''),
          attributes: ['id', 'title', 'address', 'latitude', 'longitude'],
          as: 'location',
          required: false
        },
        {
          model: db.prescription_invoice,
          attributes: [],
          as: 'invoices',
          required: false
        },
        {
          model: db.booking,
          as: 'bookings',
          attributes: [],
          required: false,
          seperate: true,
          where: {
            createdAt: {
              [Op.gt]: TODAY_START,
              [Op.lt]: NOW
            },
          }
        }
      ]
    }

    db.clinic_pharmacy.findAll({
      where: where,
      attributes: {
        include: includeAttr
      },
      include: include,
      group: ['pharmacy_id']
    }).then(resp => res.send(resp))
      .catch(e => {
        res.status(400).send({ status: false, message: `${e}`, e })
      })
  },
  getMyPharma: async (req, res, next) => {
    let where = { clinic_id: req.user.id };
    if (req.params && req.params.pharmacy_id) {
      where.pharmacy_id = req.params.pharmacy_id;
    }
    db.clinic_pharmacy.findOne({
      where: where,
      include: [
        {
          model: db.user,
          attrubutes: ['id', 'company_name', 'status'],
          as: 'pharmacy'
        }, 'org_contacts'
      ]
    }).then(resp => res.send(resp))
      .catch(e => {
        res.status(400).send({ status: false, message: `${e}`, e })
      })
  },
  delete: async (req, res, next) => {
    db.clinic_pharmacy.destroy({
      where: {
        pharmacy_id: req.params.pharmacy_id,
        clinic_id: req.user.id
      }
    }).then(resp => res.send({ status: true }))
      .catch(e => res.status(400).send({ status: false, message: `${e}`, e }))
  }
};
