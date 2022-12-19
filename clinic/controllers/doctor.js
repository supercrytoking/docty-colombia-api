const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

const { getLimitOffset, limit } = require('../../commons/paginator');

const { response, errorResponse } = require('../../commons/response');

// Doctors (No show for 0 price, 0 specialty)

var availableDoctor = async (req) => {

  return new Promise(async (resolve, reject) => {
    var dated = null;
    let endDate = null;
    var data = req.body;
    var search = data.search || '';
    if (data.dated) {
      dated = new Date(data.dated);

      if (data.date_to) {
        endDate = new Date(data.date_to);
      } else {
        endDate = new Date(data.dated);
        endDate.setHours(0);
        endDate.setMinutes(0);
        endDate.setSeconds(0);
        endDate.setDate(endDate.getDate() + 1);
      }
    }

    var userWhere = '';
    if (req.body && req.body.online && req.body.offline) {

    } else if (req.body.online) {
      userWhere += ` AND "user"."isAvailableStatus" = true`;

      try {
        var idList = Object.keys(global.onlineSocket);
        idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
        if (idList.length == 0) {
          return resolve([]);
        }
        userWhere += ` AND "user"."id" IN (${idList.join(',')})`;
      } catch (e) {
      }
    } else if (req.body.offline) {
      try {
        var idList = Object.keys(global.onlineSocket);
        idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
        if (idList.length > 0) userWhere += ` AND "user"."id" NOT IN (${idList.join(',')})`;
      } catch (e) {
      }
    }
    if (search && search.length > 0) {
      userWhere = ` AND (first_name LIKE '%${search}%' OR last_name LIKE '%${search}%' OR middle_name LIKE '%${search}%' OR company_name LIKE '%${search}%' OR email LIKE '%${search}%' OR phone_number LIKE '%${search}%')`;
    }


    var patient_id = req.user.id;
    if (req.body && req.body.patient_id) patient_id = req.body.patient_id;
    var family_id = 0;
    if (req.body && req.body.family_id) family_id = req.body.family_id;
    var type_code = 'video_call';

    var patient_user_insurance_id = null;
    var patient_user_insurance = await db.user_insurance.findOne({ where: { user_id: patient_id, member_id: family_id } });
    if (patient_user_insurance) patient_user_insurance_id = patient_user_insurance.company;
    var slot_join_sql = '';

    if (dated) {
      slot_join_sql = `
            INNER JOIN "schedules" AS "schedule" ON "user"."id" = "schedule"."user_id"
            AND "schedule"."start" >= '${dated.toISOString()}'
            AND "schedule"."end" <= '${endDate.toISOString()}'
            AND "schedule"."calendarId" IN (4)
            AND "schedule"."state" != 'Busy'
            `;
    }

    var speciality_where = '';
    if (req.body && req.body.speciality_list) {
      speciality_where = ` AND "services"."speciality_id" IN (${req.body.speciality_list.joing('')})`;
    }

    var sql = `
        (
            SELECT user.id id
            FROM users AS user
            ${slot_join_sql}
                JOIN user_services services 
                    ON user.id = services.user_id AND services.price > 0 ${speciality_where}
                LEFT JOIN associates ON user.id = associates.associate
            WHERE associates.associate IS NULL ${userWhere}
        )
        UNION
        (
            SELECT user.id as id
            from users AS user
                ${slot_join_sql}
                JOIN user_services services ON user.id = services.user_id ${speciality_where}
                JOIN associates ass ON user.id = ass.associate
                JOIN company_services cs ON ass.user_id = cs.user_id AND cs.type_code= '${type_code}'
                    AND cs.copay > 0 AND (cs.insurance_provider_id= '${patient_user_insurance_id}' OR cs.insurance_provider_id IS NULL)
                    AND cs.expertise_level = user.expertise_level
                JOIN user_specialities spec on spec.id = cs.user_speciality_id
                AND spec.speciality_id = services.speciality_id
                WHERE ass.associate IS NOT NULL ${userWhere}
        )`;


    sql = sql.replace(/\"/gi, "`"); // Replace " with `
    console.log(sql);
    db.sequelize.query(sql).spread(resp => {
      resolve(resp);
    }).catch(error => {
      reject(error);
    });
  });
};

async function search(req, res, next) {
  try {
    // Top Rating Doctors - client side, sort 

    // Online + Top Rating Doctors (No show for 0 price, 0 specialty)
    // Online + Top Rating Clinics (No show for 0 price, 0 specialty, 0 Staff)
    // Offline + Top rated Doctors (No show for 0 price, 0 specialty)
    // Offline + top rated clinics (No show for 0 price, specialty, 0 staff)

    let where = { status: { [Op.gt]: 0 } };
    if (req.body.id) where.id = req.body.id;
    let role_id = req.body.role || 1;
    var search = req.body.search || '';
    if (search.length > 0 && role_id == 5) {
      where = {
        ...where,
        [Op.or]: [
          { 'first_name': { [Op.like]: `%${search}%` } },
          { 'last_name': { [Op.like]: `%${search}%` } },
          { 'middle_name': { [Op.like]: `%${search}%` } },
          { 'email': { [Op.like]: `%${search}%` } },
          { 'phone_number': { [Op.like]: `%${search}%` } },
          { 'company_name': { [Op.like]: `%${search}%` } },
        ]
      };
    }

    let page = 1;
    let pageSize = 25;
    if (req.body && req.body.page) {
      page = req.body.page;
    }
    if (req.body && req.body.pageSize) {
      pageSize = req.body.pageSize;
      try { if (typeof pageSize == 'string') pageSize = parseInt(pageSize); } catch (e) { }
    }

    if (req.body && req.body.online && req.body.offline) {
      //do something
    } else if (req.body.online) {
      where.isAvailableStatus = true;
      try {
        var idList = Object.keys(global.onlineSocket);
        idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
        where.id = { [Op.in]: idList };
      } catch (e) {
      }
    } else if (req.body.offline) {
      try {
        var idList = Object.keys(global.onlineSocket);
        idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
        where.id = { [Op.notIn]: idList };
      } catch (e) {
      }
    }

    if (role_id == 1) {
      var totalDoctorList = await availableDoctor(req);
      var idList = totalDoctorList.map(item => item.id);
      var limitObject = getLimitOffset(page, pageSize);
      idList = idList.slice(limitObject[0], limitObject[0] + limitObject[1]); //paginate
      where.id = { [Op.in]: idList };
    }
    if (req.body.id) where.id = req.body.id;

    var patient_id = req.user.id;
    if (req.query && req.query.patient_id) patient_id = req.query.patient_id;
    var family_id = 0;
    if (req.query && req.query.family_id) family_id = req.query.family_id;
    var patient_user_insurance = await db.user_insurance.findOne({ where: { user_id: patient_id, member_id: family_id } });

    let include = ['rating_summary', {
      model: db.my_favorite,
      as: 'favorite_of',
      left: false,
      required: false,
      where: { user_id: req.user.id }
    }];

    if (req.query && req.query.includes) {
      include = req.query.includes.split(',');
    }
    var specialityWhere = {};
    if (req.body && req.body.speciality_list) {
      specialityWhere.speciality_id = { [Op.in]: req.body.speciality_list };
    }
    let attributes = ['id', 'details', 'title', 'symbol', 'status'];
    if (req.lang && req.lang == 'es') {
      attributes = ['id', ['details_es', 'details'], ['title_es', 'title'], 'symbol', 'status'];
    }
    if (role_id == 1) {
      //ignore no sepciality
      include.push({
        model: db.user_service,
        as: 'services',
        include: [
          {
            model: db.speciality,
            as: 'speciality',
            attributes
          }
        ],
        required: true,
        where: specialityWhere
      });

      // filter with associated company 's insurance provider
      if (req.body.insurance_provider_id) {
        var clinicWhere = {};
        if (req.body.clinic_id) {
          clinicWhere.id = req.body.clinic_id;
        }
        include.push({
          model: db.associate,
          as: 'associatedTo',
          required: true,
          include: [{
            model: db.user,
            attributes: ['id', 'company_name', 'picture'],
            required: true,
            as: 'user',
            where: clinicWhere,
            include: [{
              model: db.insurance_associate,
              as: 'insurance_associates',
              required: true,
              where: { provider_id: req.body.insurance_provider_id }
            },
            {
              required: false,
              model: db.company_service,
              as: 'company_service',
              attributes: ['copay'],
              where: {
                copay: { [Op.gt]: 0 },
                type_code: 'video_call',
                insurance_provider_id:
                {
                  [Op.or]: [
                    { [Op.eq]: patient_user_insurance ? patient_user_insurance.company : null },
                    { [Op.eq]: null }]
                },
              },
            }]
          }]
        });
      } else {
        var associatedToRequired = false;
        var clinicWhere = {};
        if (req.body.clinic_id) {
          clinicWhere.id = req.body.clinic_id;
          associatedToRequired = true;
        }
        include.push({
          model: db.associate, as: 'associatedTo', required: associatedToRequired,
          include: [{
            model: db.user, as: 'user', required: associatedToRequired, attributes: ['id', 'company_name', 'picture'],
            where: clinicWhere,
            include: ['insurance_associates',
              {
                required: false,
                model: db.company_service,
                as: 'company_service',
                where: {
                  copay: { [Op.gt]: 0 },
                  type_code: 'video_call',
                  insurance_provider_id:
                  {
                    [Op.or]: [
                      { [Op.eq]: patient_user_insurance ? patient_user_insurance.company : null },
                      { [Op.eq]: null }]
                  },
                },
                include: [{
                  required: false,
                  model: db.user_speciality,
                  as: 'user_speciality',
                }]
              }]
          }]
        });
      }
    }
    if (role_id == 5) {// retail clinics
      //ignore 0 staff
      include.push({
        model: db.associate,
        as: 'staff',
        required: true,
        include: []
      });

      //ignore 0 speciality
      include.push({
        model: db.user_speciality,
        as: 'user_speciality',
        include: [
          {
            model: db.speciality,
            as: 'speciality',
            attributes
          }
        ],
        required: true,
        where: specialityWhere
      });

      //ignore 0 price
      include.push({
        required: true,
        model: db.company_service,
        as: 'company_service',
        where: {
          copay: { [Op.gt]: 0 },
          type_code: 'video_call',
          insurance_provider_id:
          {
            [Op.or]: [
              { [Op.eq]: patient_user_insurance ? patient_user_insurance.company : null },
              { [Op.eq]: null }]
          },
        },
        include: [{
          required: true,
          model: db.user_speciality,
          as: 'user_speciality',
        }]
      });

      if (req.body.insurance_provider_id) {
        include.push({
          model: db.insurance_associate,
          as: 'insurance_associates',
          required: true,
          where: { provider_id: req.body.insurance_provider_id }
        });
      } else include.push('insurance_associates');
    }

    if (req.body && req.body.dated) {
      let endDate = null;
      if (req.body.date_to) {
        endDate = req.query.date_to;
      } else {
        endDate = new Date(req.body.dated);
        endDate.setHours(0);
        endDate.setMinutes(0);
        endDate.setSeconds(0);
        endDate.setDate(endDate.getDate() + 1);
      }
      include.push({
        model: db.schedule,
        where: {
          start: { [Op.gte]: new Date(req.body.dated) },
          end: { [Op.lte]: new Date(endDate) },
          calendarId: { [Op.in]: [4] },
          state: { [Op.ne]: 'Busy' }
        },
        required: true,
        attributes: ["id", "start", "end"],
        as: 'schedule',
      });
    }

    if (role_id) {
      include.push({
        model: db.user_role,
        where: { role_id: role_id }
      });
    } else {
      include.push('user_role');
    }

    let options = {
      include: include,
      where: where,
      limit: getLimitOffset(page, pageSize),
      distinct: true,
      col: `id`,
    };

    db.user.scope('publicInfo', 'availableStatus').findAndCountAll(options).then(async resp => {
      try {
        resp = JSON.parse(JSON.stringify(resp));
        for (var i = 0; i < resp.rows.length; i++) {
          let user = resp.rows[i];

          user.services = (user.services || [])
            .map(s => {
              if (user.associatedTo != null && user.associatedTo.user != null) {
                s.price = 0;
                if (user.associatedTo.user.company_service != null && user.associatedTo.user.company_service[0]) {
                  var match_service = user.associatedTo.user.company_service.find(cs => cs.user_speciality != null && cs.user_speciality.speciality_id == s.speciality_id);
                  if (match_service) {
                    s.price = match_service.copay;
                    s.insured_cover = match_service.insured_cover;
                  }
                }
                return s;
              }
              else return s;
            })
            .filter(s => s.price > 0);

          if (role_id == 1) {
            user.isAvailableStatus = user.isAvailableStatus && global.onlineSocket[`userid${user.id}`] != null;
          }
          else user.isAvailableStatus = global.onlineSocket[`userid${user.id}`] != null;

          if (
            user.associatedTo
            && user.associatedTo.user
            && user.associatedTo.user.insurance_associates
            && patient_user_insurance
          ) {
            let pr = user.associatedTo.user.insurance_associates.find(r => r.provider_id == patient_user_insurance.company);
            if (pr && pr.provider)
              user.insurance_associates = pr.provider.name;
          }
        }

        response(res, resp, null, pageSize);
      } catch (e) {
        console.log(e);
        throw e;
      }
    }).catch(err => {
      console.log(err);
      res.status(400).send({
        status: false,
        errors: `${err}`
      });
    });
  } catch (e) {
    console.log(e);
    res.status(400).send({
      status: false,
      errors: `${e}`
    });
  }
}

module.exports = {
  search: search
};
