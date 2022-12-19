const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const static = require('../../config/static.json');

module.exports = {
  families(req, res, next) {
    if (req.user && req.user.id) {
      let user_id = req.user.id;
      let query = req.query || {};
      if (query.user_id) user_id = query.user_id;
      let include = [];
      if (query.include) {
        include = query.include.split(',');
      }
      let arrtibutes = [
        [db.sequelize.col('rel.relation'), 'relation'],
        [db.sequelize.col('rel.allow_access'), 'allow_access'],
        [db.sequelize.col('permitted.permissions'), 'permittedTo']
      ]
      if (include.includes('permissions')) {
        include.filter(e => e !== 'permissions')
        include.push({
          model: db.family_access,
          as: 'permissions',
          where: { user_id },
          required: false,
          attributes: []
        })
        arrtibutes.push([db.sequelize.col('permissions.permissions'), 'permittedBy'])
      }
      db.user.scope('familyInfo').findAll({
        attributes: arrtibutes,
        include: [
          ...include,
          {
            model: db.user_kindred,
            as: 'rel',
            where: { user_id: user_id },
            required: true,
            attributes: []
          },
          {
            model: db.family_access,
            as: 'permitted',
            where: { permitted_to: user_id },
            required: false,
            attributes: []
          }
        ]
      })
        .then(async (resp) => {
          resp = JSON.parse(JSON.stringify(resp))
          let parents = await db.user_kindred.findOne({
            where: { member_id: req.user.id },
            include: [{
              model: db.user,
              as: 'parent',
              include: [{
                model: db.family_access,
                // where: { permitted_to: user_id },
                as: 'permitted',
                required: false,
              }]
            }]
          });
          if (!!parents && !!parents.parent) {
            let parent = JSON.parse(JSON.stringify(parents.parent));
            console.log(parent, user_id)
            try {
              parent['relation'] = static.reverseRelation[req.user.gender][parents.relation]
            } catch (error) {
              parent['relation'] = null
            }
            parent['permittedTo'] = parent.permitted && parent.permitted.permissions ? parent.permitted.permissions : {}
            resp.push(parent)
          }

          res.send(resp);
        }).catch(err => {
          res.send({
            status: false,
            errors: `${err}`
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  family(req, res) {
    if (req.user && req.user.id) {
      let user_id = 0;
      let query = req.query || {};
      if (query.user_id) user_id = query.user_id;
      if (req.params && req.params.member_id) user_id = req.params.member_id;
      let include = [];
      if (query.include) {
        include = query.include.split(',');
      }
      db.user.scope('familyInfo', 'idInfo').findByPk(user_id, {
        attributes: [
          [db.sequelize.col('rel.relation'), 'relation'],
          [db.sequelize.col('rel.allow_access'), 'allow_access']],
        include: [
          ...include,
          {
            model: db.user_kindred,
            as: 'rel',
            where: { member_id: user_id },
            required: false,
            attributes: []
          }
        ]
      })
        .then(async (resp) => {
          resp = JSON.parse(JSON.stringify(resp))
          let cons = await db.booking.findOne({ where: { patient_id: resp.id, payment_status: 1 } }).catch(r => null);
          resp.profileLock = !!cons && !!cons.id
          res.send(resp);
        }).catch(err => {
          res.status(400).send({
            status: false,
            errors: `${err}`
          });
        });
    } else {
      res.sendStatus(406);
    }
  }
};