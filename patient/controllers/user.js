/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

const { getLimitOffset, limit } = require('../../commons/paginator');

const { response, errorResponse } = require('../../commons/response');

// Doctors (No show for 0 price, 0 specialty)

var LIMIT_KM = 2342342342300000; //20 * 1.60934; // 20 Mile

var availableDoctor = async(req) => {

    return new Promise(async(resolve, reject) => {
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
        var userIdOrderBy = '';
        if (req.body && req.body.online && req.body.offline) {
            // select only user first
            var idList = Object.keys(global.onlineSocket);
            idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
            if (idList.length > 0)
                userIdOrderBy = ` ORDER BY (case when ("id" in (${idList.join(',')}) AND "isAvailableStatus" = true) then 1 end) DESC `;
        } else if (req.body.online) {
            userWhere += ` AND "user"."isAvailableStatus" = true`;

            try {
                var idList = Object.keys(global.onlineSocket);
                idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
                if (idList.length == 0) {
                    return resolve([]);
                }
                userWhere += ` AND "user"."id" IN (${idList.join(',')})`;
            } catch (e) {}
        } else if (req.body.offline) {
            try {
                var idList = Object.keys(global.onlineSocket);
                idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
                if (idList.length > 0) userWhere += ` AND "user"."id" NOT IN (${idList.join(',')})`;
            } catch (e) {}
        }
        if (search && search.length > 0) {
            userWhere += ` AND (first_name LIKE '%${search}%' 
        OR last_name LIKE '%${search}%' OR middle_name LIKE '%${search}%' 
        OR company_name LIKE '%${search}%' 
        OR email LIKE '%${search}%' 
        OR phone_number LIKE '%${search}%'
        OR specialities.title LIKE '%${search}%'
        OR specialities.title_es LIKE '%${search}%'
        OR specialities.tags LIKE '%${search}%'
        )`;
        }
        userWhere += ` AND "user"."status" > 0 `;


        var patient_id = (req.user || {}).id;
        if (req.body && req.body.patient_id) patient_id = req.body.patient_id;
        var family_id = 0;
        if (req.body && req.body.family_id) family_id = req.body.family_id;
        var type_code = 'video_call';

        var patient_user_insurance_id = null;
        var patient_user_insurance = null;
        if (patient_id)
            patient_user_insurance = await db.user_insurance.findOne({
                where: {
                    user_id: patient_id,
                    member_id: family_id,
                    start_date: {
                        [Op.or]: [{
                            [Op.lte]: new Date()
                        }, {
                            [Op.eq]: null
                        }]
                    },
                    end_date: {
                        [Op.or]: [{
                            [Op.gte]: new Date()
                        }, {
                            [Op.eq]: null
                        }]
                    },
                },
            });

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
            let list = req.body.speciality_list.filter(e => !!e);
            if (!!list.length)
                speciality_where = ` AND "services"."speciality_id" IN (${list.join(',')})`;
        }

        var userLocation_join = '';
        if (req.body.longitude && req.body.latitude) {
            var longitude = req.body.longitude;
            var latitude = req.body.latitude;

            userLocation_join = `
      INNER JOIN "addresses" AS "address" ON "user"."id" = "address"."user_id"
       AND (ST_Distance(point("longitude", "latitude"), point(${longitude}, ${latitude})) < ${LIMIT_KM / 100})
      `;
        }

        var sql = `
        
            SELECT DISTINCT(user.id) id,
            user.isAvailableStatus isAvailableStatus
            FROM users AS user
            ${slot_join_sql}
            ${userLocation_join}
                JOIN user_services services 
                    ON user.id = services.user_id AND services.price > 0 ${speciality_where}
                JOIN specialities ON services.speciality_id = specialities.id AND specialities.role_id = user.speciality_type AND specialities.status = 1
                LEFT JOIN associates ON user.id = associates.associate
            WHERE (associates.associate IS NULL OR associates.user_id IS NULL) ${userWhere}
        
        UNION
        
            SELECT DISTINCT(user.id) as id,
            user.isAvailableStatus isAvailableStatus
            from users AS user
                ${slot_join_sql}
                JOIN user_services services ON user.id = services.user_id ${speciality_where}
                JOIN specialities ON services.speciality_id = specialities.id AND specialities.role_id = user.speciality_type AND specialities.status = 1
                JOIN associates ass ON user.id = ass.associate
                JOIN company_services cs ON ass.user_id = cs.user_id AND cs.type_code= '${type_code}'
                    AND cs.copay > 0 AND (cs.insurance_provider_id= '${patient_user_insurance_id}' OR cs.insurance_provider_id IS NULL)
                    AND cs.expertise_level = user.expertise_level
                JOIN user_specialities spec on spec.id = cs.user_speciality_id
                AND spec.speciality_id = services.speciality_id
                WHERE ass.associate IS NOT NULL ${userWhere}
        ${userIdOrderBy}
        `;


        sql = sql.replace(/\"/gi, "`"); // Replace " with `
        // console.log(sql);
        db.sequelize.query(sql).spread(resp => {
            resolve(resp);
        }).catch(error => {
            reject(error);
        });
    });
};

var availableClinic = async(req) => {

    return new Promise(async(resolve, reject) => {
        var data = req.body;
        var search = data.search || '';

        var userWhere = '';
        var userIdOrderBy = '';
        if (req.body && req.body.online && req.body.offline) {
            // select only user first
            var idList = Object.keys(global.onlineSocket);
            idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
            if (idList.length > 0)
                userIdOrderBy = ` ORDER BY (case when ("user"."id" in (${idList.join(',')}) AND "isAvailableStatus" = true) then 1 end) DESC `;
        } else if (req.body.online) {
            userWhere += ` AND "user"."isAvailableStatus" = true`;

            try {
                var idList = Object.keys(global.onlineSocket);
                idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
                if (idList.length == 0) {
                    return resolve([]);
                }
                userWhere += ` AND "user"."id" IN (${idList.join(',')})`;
            } catch (e) {}
        } else if (req.body.offline) {
            try {
                var idList = Object.keys(global.onlineSocket);
                idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
                if (idList.length > 0) userWhere += ` AND "user"."id" NOT IN (${idList.join(',')})`;
            } catch (e) {}
        }
        if (search && search.length > 0) {
            userWhere += ` AND (company_name LIKE '%${search}%' OR email LIKE '%${search}%' OR phone_number LIKE '%${search}%')`;
        }
        userWhere += ` AND "user"."status" > 0 `;


        var patient_id = (req.user || {}).id;
        if (req.body && req.body.patient_id) patient_id = req.body.patient_id;
        var family_id = 0;
        if (req.body && req.body.family_id) family_id = req.body.family_id;
        var type_code = 'video_call';

        var patient_user_insurance_id = null;
        var patient_user_insurance;

        if (patient_id)
            patient_user_insurance = await db.user_insurance.findOne({
                where: {
                    user_id: patient_id,
                    member_id: family_id,
                    start_date: {
                        [Op.or]: [{
                            [Op.lte]: new Date()
                        }, {
                            [Op.eq]: null
                        }]
                    },
                    end_date: {
                        [Op.or]: [{
                            [Op.gte]: new Date()
                        }, {
                            [Op.eq]: null
                        }]
                    },
                },
            });
        if (patient_user_insurance) patient_user_insurance_id = patient_user_insurance.company;

        var speciality_where = '';
        if (req.body && req.body.speciality_list) {
            let list = req.body.speciality_list.filter(e => !!e);
            if (!!list.length)
                speciality_where = ` AND "spec"."speciality_id" IN (${list.join(',')})`;
        }

        var sql = `
            SELECT DISTINCT(user.id) as id
            from users AS user
                JOIN user_roles ON user_roles.user_id = user.id AND user_roles.role_id = 5
                JOIN associates staff ON user.id = staff.user_id
                JOIN company_services cs ON staff.user_id = cs.user_id AND cs.type_code= '${type_code}'
                    AND cs.copay > 0 AND (cs.insurance_provider_id= '${patient_user_insurance_id}' OR cs.insurance_provider_id IS NULL)
                JOIN user_specialities spec on spec.id = cs.user_speciality_id  ${speciality_where}
                WHERE user.deletedAt IS NULL ${userWhere} #${userIdOrderBy}
        `;


        sql = sql.replace(/\"/gi, "`"); // Replace " with `
        db.sequelize.query(sql).spread((resp, m) => {
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


        let where = {
            status: {
                [Op.gt]: 0
            }
        };
        if (req.body.id) where.id = req.body.id;
        let role_id = req.body.role || 1;

        var longitude = null;
        var latitude = null;

        if (req.body.longitude && req.body.latitude) {
            longitude = req.body.longitude;
            latitude = req.body.latitude;
        }

        let page = 1;
        let pageSize = 25;
        if (req.body && req.body.page) {
            page = req.body.page;
        }
        if (req.body && req.body.pageSize) {
            pageSize = req.body.pageSize;
            try { if (typeof pageSize == 'string') pageSize = parseInt(pageSize); } catch (e) {}
        }

        if (req.body && req.body.online && req.body.offline) {
            //do something
        } else if (req.body.online) {
            where.isAvailableStatus = true;
            try {
                var idList = Object.keys(global.onlineSocket);
                idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
                where.id = {
                    [Op.in]: idList
                };
            } catch (e) {}
        } else if (req.body.offline) {
            try {
                var idList = Object.keys(global.onlineSocket);
                idList = idList.filter(id => id.includes('userid')).map(id => id.replace('userid', '')).filter(id => parseInt(id) > 0);
                where.id = {
                    [Op.notIn]: idList
                };
            } catch (e) {}
        }

        var total = 0;
        if (role_id == 1) {
            var totalDoctorList = await availableDoctor(req);
            total = totalDoctorList.length;
            var idList = totalDoctorList.map(item => item.id);
            var limitObject = getLimitOffset(page, pageSize);
            idList = idList.slice(limitObject[0], limitObject[0] + limitObject[1]); //paginate
            where.id = {
                [Op.in]: idList
            };
        } else if (role_id == 5) {
            var totalClinicList = await availableClinic(req);
            total = totalClinicList.length;
            var idList = totalClinicList.map(item => item.id);
            var limitObject = getLimitOffset(page, pageSize);
            idList = idList.slice(limitObject[0], limitObject[0] + limitObject[1]); //paginate
            where.id = {
                [Op.in]: idList
            };
        }
        if (req.body.id) where.id = req.body.id;

        var patient_id = (req.user || {}).id;
        if (req.query && req.query.patient_id) patient_id = req.query.patient_id;
        var family_id = 0;
        if (req.query && req.query.family_id) family_id = req.query.family_id;
        var patient_user_insurance;
        if (patient_id)
            patient_user_insurance = await db.user_insurance.findOne({
                where: {
                    user_id: patient_id,
                    member_id: (family_id || 0),
                    start_date: {
                        [Op.or]: [{
                            [Op.lte]: new Date()
                        }, {
                            [Op.eq]: null
                        }]
                    },
                    end_date: {
                        [Op.or]: [{
                            [Op.gte]: new Date()
                        }, {
                            [Op.eq]: null
                        }]
                    },
                },
            });

        let include = ['rating_summary', ];
        if (patient_id) {
            include.push({
                model: db.my_favorite,
                as: 'favorite_of',
                left: false,
                required: false,
                where: { user_id: patient_id }
            });
        }

        if (req.query && req.query.includes) {
            include = req.query.includes.split(',');
        }
        var specialityWhere = {};
        let disaleSpec = await db.speciality.findAll({
            where: {
                status: {
                    [Op.ne]: true
                }
            },
            attributes: ['id']
        });
        let dsp = [];
        if (!!disaleSpec) {
            dsp = disaleSpec.map(e => e.id);
        }
        if (req.body && req.body.speciality_list) {
            let list = req.body.speciality_list.filter(e => !!e);
            if (!!list.length) {
                specialityWhere.speciality_id = {
                    [Op.in]: list,
                    [Op.notIn]: dsp
                };
            } else {
                specialityWhere.speciality_id = {
                    [Op.notIn]: dsp
                };
            }

        } else {
            specialityWhere.speciality_id = {
                [Op.notIn]: dsp
            };
        }
        let attributes = ['id', 'details', 'title', 'symbol', 'status', 'role_id', 'title_es'];
        if (req.lang && req.lang == 'es') {
            attributes = ['id', ['details_es', 'details'],
                ['title_es', 'title'], 'symbol', 'status', 'role_id', 'title_es'
            ];
        }
        if (role_id == 1) {
            //ignore no sepciality
            include.push({
                model: db.user_service,
                as: 'services',
                where: specialityWhere,
                include: [{
                    model: db.speciality,
                    as: 'speciality',
                    required: true,
                    where: { status: true },
                    attributes
                }],
                required: true,
                // where: specialityWhere
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
                                    copay: {
                                        [Op.gt]: 0
                                    },
                                    type_code: 'video_call',
                                    insurance_provider_id: {
                                        [Op.or]: [{
                                                [Op.eq]: patient_user_insurance ? patient_user_insurance.company : null
                                            },
                                            {
                                                [Op.eq]: null
                                            }
                                        ]
                                    },
                                },
                            }
                        ]
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
                    model: db.associate,
                    as: 'associatedTo',
                    required: associatedToRequired,
                    include: [{
                        model: db.user,
                        as: 'user',
                        required: associatedToRequired,
                        attributes: ['id', 'company_name', 'picture'],
                        where: clinicWhere,
                        include: ['insurance_associates',
                            {
                                required: false,
                                model: db.company_service,
                                as: 'company_service',
                                where: {
                                    copay: {
                                        [Op.gt]: 0
                                    },
                                    type_code: 'video_call',
                                    insurance_provider_id: {
                                        [Op.or]: [{
                                                [Op.eq]: patient_user_insurance ? patient_user_insurance.company : null
                                            },
                                            {
                                                [Op.eq]: null
                                            }
                                        ]
                                    },
                                },
                                include: [{
                                    required: false,
                                    model: db.user_speciality,
                                    as: 'user_speciality',
                                }]
                            }
                        ]
                    }]
                });
            }
        }
        if (role_id == 5) { // retail clinics
            //ignore 0 staff
            include.push({
                model: db.associate.scope('withoutUser'),
                as: 'staff',
                required: true,
                include: []
            });

            //ignore 0 speciality
            include.push({
                model: db.user_speciality.scope('nothing'),
                as: 'user_speciality',
                include: [{
                    model: db.speciality,
                    as: 'speciality',
                    attributes
                }],
                required: true,
                where: specialityWhere
            });

            //ignore 0 price
            // include.push({
            //   required: true,
            //   model: db.company_service,
            //   as: 'company_service',
            //   where: {
            //     copay: { [Op.gt]: 0 },
            //     type_code: 'video_call',
            //     insurance_provider_id:
            //     {
            //       [Op.or]: [
            //         { [Op.eq]: patient_user_insurance ? patient_user_insurance.company : null },
            //         { [Op.eq]: null }]
            //     },
            //   }
            // });

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
                    start: {
                        [Op.gte]: new Date(req.body.dated)
                    },
                    end: {
                        [Op.lte]: new Date(endDate)
                    },
                    calendarId: {
                        [Op.in]: [4]
                    },
                    state: {
                        [Op.ne]: 'Busy'
                    }
                },
                required: true,
                attributes: ["id", "start", "end"],
                as: 'schedule',
            });
        } else {
            include.push({
                model: db.schedule,
                where: {
                    start: {
                        [Op.gte]: new Date()
                    },
                    calendarId: {
                        [Op.in]: [4]
                    },
                    state: {
                        [Op.ne]: 'Busy'
                    }
                },
                required: false,
                limit: 1,
                attributes: ["id", "start", "end"],
                as: 'schedule',
            });
        }

        if (longitude && latitude) {
            include.push({
                model: db.address,
                as: 'address',
                attributes: {
                    include: [
                        [Sequelize.fn(
                                'ST_Distance',
                                Sequelize.fn('point', Sequelize.col("longitude"), Sequelize.col("latitude")),
                                Sequelize.fn('point', longitude, latitude)
                            ),
                            'distance'
                        ]
                    ]
                },
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
            // limit: getLimitOffset(page, pageSize),
            // distinct: true,
            // col: `id`,
        };

        var b = new Date().getTime();
        db.user.scope('publicInfo', 'availableStatus').findAll(options).then(async resp => {
            var d = new Date().getTime() - b;

            try {
                resp = JSON.parse(JSON.stringify(resp));
                resp = resp.sort((a, b) => {
                    if (a.rating_summary == null && b.rating_summary == null) return 1;
                    if (a.rating_summary == null || a.rating_summary.rating == null) return 1;
                    if (b.rating_summary == null || b.rating_summary.rating == null) return -1;

                    return parseInt(b.rating_summary.rating) - parseInt(a.rating_summary.rating);
                });

                for (var i = 0; i < resp.length; i++) {
                    let user = resp[i];
                    user.services = (user.services || [])
                        .filter(s => (s.speciality || {}).role_id == user.speciality_type)
                        .map(s => {
                            if (user.associatedTo != null && user.associatedTo.user != null) {
                                s.price = 0;

                                if (user.associatedTo.user.company_service != null && user.associatedTo.user.company_service[0]) {
                                    var match_service;
                                    if (patient_user_insurance) {
                                        match_service = user.associatedTo.user.company_service.find(cs => cs.user_speciality != null && cs.user_speciality.speciality_id == s.speciality_id && cs.insurance_provider_id == patient_user_insurance.company && cs.expertise_level == user.expertise_level);
                                    }

                                    if (match_service == null) // if there is no insurance match price
                                        match_service = user.associatedTo.user.company_service.find(cs => cs.user_speciality != null && cs.user_speciality.speciality_id == s.speciality_id && cs.expertise_level == user.expertise_level);

                                    if (match_service) {
                                        s.price = match_service.copay;
                                        s.insured_cover = match_service.insured_cover;
                                    }
                                }
                                return s;
                            } else return s;
                        })
                        .filter(s => s.price > 0);


                    if (role_id == 1) {
                        user.isAvailableStatus = user.isAvailableStatus && global.onlineSocket[`userid${user.id}`] != null;
                    } else user.isAvailableStatus = global.onlineSocket[`userid${user.id}`] != null;

                    if (
                        user.associatedTo &&
                        user.associatedTo.user &&
                        user.associatedTo.user.insurance_associates &&
                        patient_user_insurance
                    ) {
                        let pr = user.associatedTo.user.insurance_associates.find(r => r.provider_id == patient_user_insurance.company);
                        if (pr && pr.provider)
                            user.insurance_associates = pr.provider.name;
                    }

                    if (user.address) {
                        var km = user.address.distance * 100;
                        var mile = km * 0.621371;
                        user.address.mile = mile;
                    }
                }

                response(res, { count: total, rows: resp }, null, pageSize);
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
        res.status(400).send({
            status: false,
            errors: `${e}`
        });
    }
}

module.exports = {
    search: search,
    doctorDetails: async(req, res, next) => {
        let id = req.params.id;
        let query = req.query || {};
        let user_id = null;
        if (!!req.user) {
            user_id = req.user.id
        }
        if (!!query.user_id) {
            user_id = query.user_id
        }
        let member_id = 0
        if (!!query.member_id) {
            member_id = query.member_id
        }
        let doctorSql = `SELECT u.id,u.speciality_type,u.expertise_level, REPLACE(
        CONCAT(
          COALESCE(u.first_name,''),' ',COALESCE(u.middle_name,''),' ',COALESCE(u.last_name,''),' ',COALESCE(u.last_name_2,'')
        ),'  ', ' '
      ) AS fullName,u.picture,JSON_OBJECT("rating",rs.rating,"reviews",rs.reviews) rating_summary, au.company_name clinic_name,au.id clinic_id,u.overview
      FROM users u
      LEFT JOIN rating_summaries rs ON u.id = rs.user_id
      LEFT JOIN (SELECT uu.company_name, a.associate,uu.id FROM associates a, users uu WHERE uu.id = a.user_id AND a.associate = ${id}) AS au ON au.associate = u.id
      WHERE u.id = ${id}`;


        let doctor = await db.sequelize.query(doctorSql).spread((r, m) => r[0]);
        if (!!!doctor) {
            return res.send({});
        } else {
            let nexts = await db.schedule.findOne({
                where: {
                    user_id: id,
                    calendarId: {
                        [Op.in]: [4]
                    },
                    start: {
                        [Op.gte]: new Date()
                    },
                    state: {
                        [Op.ne]: 'Busy'
                    }
                },
                attributes: ['start', 'end']
            })
            doctor = JSON.parse(JSON.stringify(doctor));
            nexts = JSON.parse(JSON.stringify(nexts));
            doctor.next_slot = nexts;
        }
        let services = []
        let serviceSql = ''
        if (!!doctor.clinic_id) {
            serviceSql = `SELECT cs.id, cs.type_code,cs.copay price,cs.insured_cover,cs.details,cs.total,s.title,s.title_es,cs.insurance_provider_id,ip.name insurance_provider,s.id speciality_id FROM company_services cs
            JOIN user_specialities uss ON cs.user_speciality_id = uss.id
            JOIN specialities s ON s.id = uss.speciality_id
            JOIN user_services us ON us.speciality_id = uss.speciality_id AND us.user_id = ${id}
            LEFT JOIN insurence_providers ip ON ip.id = cs.insurance_provider_id
            WHERE cs.status = 1 AND cs.user_id = ${doctor.clinic_id} AND cs.expertise_level = ${doctor.expertise_level}`
            if (!!user_id) {
                serviceSql +=
                    ` AND (cs.insurance_provider_id IN (SELECT DISTINCT ui.company FROM user_insurances ui
        LEFT JOIN user_insurance_members uim ON uim.insurance_id = ui.id
        WHERE
        #ui.user_id = ${user_id} AND 
        (ui.end_date IS NULL OR ui.end_date > NOW())
        AND(uim.member_id = ${user_id} OR ui.user_id = ${user_id})) OR cs.insurance_provider_id IS NULL)`
            }
            if (!!!user_id && !!member_id) {
                serviceSql +=
                    ` AND (cs.insurance_provider_id IN (SELECT DISTINCT ui.company FROM user_insurances ui
        LEFT JOIN user_insurance_members uim ON uim.insurance_id = ui.id
        WHERE  (ui.end_date IS NULL OR ui.end_date > NOW())
        AND(uim.member_id = ${member_id} OR ui.user_id = ${member_id})) OR cs.insurance_provider_id IS NULL)`
            }

        } else {
            serviceSql = `SELECT us.service,us.description,s.title,s.title_es,us.price,s.id speciality_id
            FROM user_services us, specialities s
            WHERE us.speciality_id = s.id AND us.user_id = ${id} AND s.role_id = 1 AND us.price IS NOT NULL`
        }
        if (!!parseInt(query.speciality_id)) {
            serviceSql += ` AND s.id = ${parseInt(query.speciality_id)}`
        }
        services = await db.sequelize.query(serviceSql).spread((r, m) => r);
        if (!!serviceSql)
            services = await db.sequelize.query(serviceSql).spread((r, m) => r);
        if (!!services && services.length) {
            doctor = JSON.parse(JSON.stringify(doctor));
            services = JSON.parse(JSON.stringify(services));
            doctor.service = services
        }
        if (typeof doctor.rating_summary == 'string') {
            doctor.rating_summary = JSON.parse(doctor.rating_summary);
        }
        if (!!user_id && !!eval(query.favorited)) {
            let fav = await db.my_favorite.findOne({ where: { user_id, provider_id: id }, attributes: ['id'] });
            doctor.favorite = (!!fav && !!fav.id)
        }
        if (!!eval(query.education)) {
            let edu = await db.user_education.findAll({ where: { user_id: id } });
            doctor.education = edu
        }
        return res.send(doctor);
    }
};