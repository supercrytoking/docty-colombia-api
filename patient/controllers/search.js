const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const config = require(__dirname + '/../../config/config.json');

module.exports = {
  async doctor(req, res, next) {
    let data = req.body || {};
    let sql = `SELECT um.json_data AS env,um.user_id FROM customers c
      LEFT JOIN usermeta um ON um.user_id = c.user_id AND "key" = 'networkVisibility'
      WHERE c.customer = ${req.user.id}`;
    sql = sql.replace(/\"/gi, '`')
    let limit = getLimitOffset((data.page || 1), (data.pageSize || 25));
    let p = await db.sequelize.query(sql).spread((r, m) => r[0]);
    let where = {
      '$user_role.role_id$': { [Op.in]: [1] },
      status: { [Op.gt]: 0 },
    }
    let assocInc = {
      model: db.associate.scope(''),
      as: 'associatedTo', //attributes: ['id'],
      include: [{ model: db.user, as: 'user', attributes: ['company_name'] }],
      // where: { inNetworks: true },
      required: false
    }
    if (!!p && !!p.env && !!p.env.patientCloseEnvironment) {
      // where = {
      //   ...where,
      //   '$associatedTo.user_id$': p.user_id,
      // }
      assocInc = {
        model: db.associate,
        as: 'associatedTo', //attributes: [],
        include: [{ model: db.user, as: 'user', attributes: ['company_name'] }],
        where: { user_id: p.user_id },
        required: true
      }
    } else {
      where = {
        ...where,
        // '$associatedTo.id$': null
      }
    }

    if (!!data.gender) {
      where = {
        ...where,
        gender: data.gender
      }
    }
    let specWhere = {}
    if (!!data.speciality_list && !!data.speciality_list.length) {
      specWhere.id = { [Op.in]: data.speciality_list }
    }
    if (!!data.online) {
      var idList = Object.keys(global.onlineSocket);
      idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
      if (idList.length > 0)
        where.id = { [Op.in]: idList }
    }
    if (!!data.search) {
      where = {
        ...where,
        [Op.or]: [
          { 'first_name': { [Op.like]: `%${data.search}%` } },
          { 'last_name': { [Op.like]: `%${data.search}%` } },
          { 'middle_name': { [Op.like]: `%${data.search}%` } },
          { 'last_name_2': { [Op.like]: `%${data.search}%` } },
          { '$specialities.title$': { [Op.like]: `%${data.search}%` } },
          { '$specialities.title_es$': { [Op.like]: `%${data.search}%` } },
          { '$specialities.tags$': { [Op.like]: `%${data.search}%` } },
        ]
      }
    }
    let separate = true;
    let dated = new Date();
    let scheduleWhere = { calendarId: 4, start: { [Op.gt]: dated } };
    if (!!data.dated) {
      dated = new Date(data.dated);
      separate = false;
      let dEnd = new Date(dated.getFullYear(), dated.getMonth(), dated.getDate() + 1)
      scheduleWhere = { calendarId: 4, start: { [Op.gt]: dated }, end: { [Op.lte]: dEnd } };
    }
    let inNetwork = false;
    let netWhere = { status: 1, expertise_level: { $col: 'user.expertise_level' } }
    if (!!data.insurance_provider) {
      netWhere.insurance_provider_id = data.insurance_provider;
      inNetwork = true;
    } else {
      let uid = data.user_id || req.user.id;
      let si = `SELECT DISTINCT(company) cp FROM user_insurances ui
      LEFT JOIN user_insurance_members uim ON ui.id = uim.insurance_id
      WHERE uim.member_id = 186 OR ui.user_id = ${uid}`;
      await db.sequelize.query(si).spread((r, m) => {
        if (r && r.length) {
          let e = r.map(e => e.cp)
          return netWhere.insurance_provider_id = { [Op.in]: e };
        }
      })
    }
    let include = [
      {
        model: db.schedule,
        as: 'schedule',
        attributes: ['user_id', 'start', 'end'],
        where: scheduleWhere,
        required: !separate, subQuery: false,
        separate: separate,
        limit: [0, 2]
      },
      'rating_summary',
      {
        model: db.company_service, as: 'networkProviders', through: { attributes: [] },
        attributes: ['insurance_provider_id', 'expertise_level', 'copay', 'insured_cover', 'total'],
        where: netWhere, required: inNetwork, subQuery: false
      },
      assocInc,
      { model: db.user_role, as: 'user_role', attributes: [], required: true },
      { model: db.user_education, as: 'education', attributes: ['degree', 'institute', 'from', 'to'] },
      {
        model: db.speciality, as: 'specialities',
        attributes: ['title', 'title_es', 'id'], through: { attributes: ['price'] },
        where: specWhere,
        subQuery: false,
        required: true
      }
    ]
    let options = { where, include, subQuery: false }
    if (!!!data.search && !!!data.insurance_provider) options = {
      where, include,
      // limit,
      subQuery: false
    };
    db.user.scope('publicInfo').findAll(options).then(r => {
      r = JSON.parse(JSON.stringify(r));
      // if (!!data.search || !!data.insurance_provider) {
      r = r.splice(limit[0], limit[1])
      // }
      res.json(r);
    }).catch(console.log)
  }
}