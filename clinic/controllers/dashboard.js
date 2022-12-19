const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse, responseObject } = require('../../commons/response');


module.exports = {
    dashboard: async (req, res, next) => {
        let dateFrom = new Date();
        let dateTo = new Date();
        dateTo.setMonth(dateTo.getMonth() + 1); // default between 1 Month

        if (req.body.dateFrom) dateFrom = new Date(req.body.dateFrom)
        if (req.body.dateTo) dateTo = new Date(req.body.dateTo)

        let where = {
            start: {
                [Op.gte]: dateFrom
            },
            end: {
                [Op.lte]: dateTo
            }
        };
        let usrs = await db.sequelize.query(`SELECT COUNT(u.id) c,u.status FROM
            clinic_user_family_view c,users u 
        WHERE c.patient = u.id AND c.clinic = ${req.user.id} AND u.deletedAt IS NULL
        AND u.status >=0
        GROUP BY u.status`).spread((r, me) => {
            let m = [0, 0];
            r.forEach(element => {
                if (!!element.status) {
                    m[1] = element.c
                } else {
                    m[0] = element.c
                }
            });
            return m
        }).catch(e => [0, 0]);
        let ss = `SELECT COUNT(DISTINCT(umh.user_id)) value,JSON_EXTRACT(response, '$.cronic_condition') name
        FROM user_medical_histories umh
        JOIN clinic_user_family_view c ON c.patient = umh.user_id
        WHERE c.clinic = ${req.user.id} AND JSON_EXTRACT(response, '$.cronic_condition') IS NOT NULL and umh.deletedAt IS NULL AND umh.status = 1
        GROUP BY name`;
        let primary_cc_graph = await db.sequelize.query(ss).spread((r, m) => r)
        let ssq = `SELECT COUNT(cc.user_id) count,JSON_EXTRACT(triage, '$.triage_level') triage FROM covid_checkers cc
        JOIN users u ON cc.user_id = u.id AND u.deletedAt IS NULL
        JOIN customers c ON cc.user_id = c.customer AND c.user_id = ${req.user.id}
        LEFT JOIN user_kindreds uk ON uk.user_id = c.customer AND c.family_access = 1 AND uk.member_id = cc.user_id
        GROUP BY JSON_EXTRACT(triage, '$.triage_level')`
        let covidGraph = await db.sequelize.query(ssq).spread((r, m) => r)

        db.booking.findAndCountAll({
            where: {
                // 
                '$providerInfo.associatedTo.user_id$': req.user.id,
                status: {
                    [Op.in]: [0, 1, 3, 5,]
                }, // "waiting", "running", "complete", "accepted"
                [Op.or]: [
                    { payment_status: 1 },
                    {
                        payment_status: 0,
                        '$booking_update_request.status$': 5 // new_booking_by_support
                    }
                ]
            },
            include: [{
                model: db.booking_update_request,
                as: 'booking_update_request',
                where: { status: 5 }, // new_booking_by_support
                required: false
            },
            {
                model: db.schedule,
                as: 'schedule',
                attributes: ['start', 'end', 'id'],
                where: where
            },
            {
                model: db.user,
                as: 'providerInfo',
                attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name'],
                include: [{
                    model: db.associate.scope('withoutUser'),
                    as: 'associatedTo',
                    attributes: ['user_id', 'associate'],
                }],
            },
            {
                model: db.userFamilyView,
                as: 'patientInfo',
                attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name'],
            }
            ],
            order: [
                ['schedule', 'start', 'desc']
            ],
            // group: ['provider_id']
        }).then(async resp => {
            let respObj = responseObject(resp);

            let lang = req.lang || 'en';
            let attr = ['title', 'id', 'role_id'];
            if (lang == 'es') {
                attr = [
                    ['title_es', 'title'], 'id', 'role_id'
                ];
            }

            let staff = await db.user.findAll({
                where: {
                    '$associatedTo.user_id$': req.user.id,
                    status: {
                        [Op.gt]: 0
                    }
                },
                attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'isAvailableStatus', 'speciality_type'],
                include: [{
                    model: db.associate.scope('withoutUser'),
                    as: 'associatedTo',
                    attributes: ['user_id', 'associate'],
                },
                {
                    model: db.schedule,
                    as: 'schedule',
                    attributes: ['start', 'end', 'user_id', 'state', 'id', 'calendarId'],
                    required: true,
                    where: {
                        calendarId: {
                            [Op.in]: [4, 3]
                        },
                        start: {
                            [Op.gte]: dateFrom
                        },
                        end: {
                            [Op.lte]: dateTo
                        },
                    },
                },
                {
                    model: db.user_service,
                    as: 'services',
                    include: [{
                        model: db.speciality,
                        as: 'speciality',
                        attributes: attr,
                        where: {
                            status: true,
                        },
                        required: true
                    },],
                    required: false
                },
                ],
            })
            staff = JSON.parse(JSON.stringify(staff))
            staff = staff.map(user => {
                user.services = (user.services || []).filter(s => (s.speciality || {}).role_id == user.speciality_type);
                return user;
            })

            return res.send({ ...respObj, staff, users: usrs, primary_cc_graph, covidGraph });
        })

    },
    booking_stastic: async (req, res) => {
        try {
            var clinic_id = req.user.id;

            var data = req.body;


            var start = null;
            let end = null;
            if (data.start) {
                start = new Date(data.start);

                if (data.end) {
                    end = new Date(data.end);
                } else {
                    end = new Date(data.dated);
                    end.setHours(0);
                    end.setMinutes(0);
                    end.setSeconds(0);
                    end.setDate(end.getDate() + 1);
                }
            }
            let lang = req.lang || 'en';
            let attr = ['title', 'id', 'role_id'];
            if (lang == 'es') {
                attr = [
                    ['title_es', 'title'], 'id', 'role_id'
                ];
            }

            db.user.findAll({
                where: { '$associatedTo.user_id$': req.user.id, },
                include: [{
                    model: db.schedule,
                    as: 'schedule',
                    attributes: ['start', 'end', 'id', 'user_id'],
                    where: {
                        start: {
                            [Op.gte]: start
                        },
                        end: {
                            [Op.lte]: end
                        },
                        calendarId: {
                            [Op.in]: [3, 4]
                        },
                    },
                    required: true
                },
                {
                    model: db.user_service,
                    as: 'services',
                    required: true,
                    include: [{
                        model: db.speciality,
                        as: 'speciality',
                        attributes: attr,
                        where: {
                            status: true,
                        },
                        required: true
                    },]
                },
                {
                    model: db.booking,
                    as: 'provider_bookings',
                    required: false,
                    include: [{
                        model: db.schedule,
                        as: 'schedule',
                        attributes: ['start', 'end', 'id'],
                        where: {
                            start: {
                                [Op.gte]: start
                            },
                            end: {
                                [Op.lte]: end
                            },
                        },
                        required: true
                    },
                        'patientInfo'
                    ]
                },
                {
                    model: db.associate,
                    as: 'associatedTo',
                    required: false,
                },
                ]
            }).then(resp => {
                resp = JSON.parse(JSON.stringify(resp));
                resp.map(user => {
                    user.services = (user.services || []).filter(s => s.speciality.role_id == user.speciality_type);
                    return user;
                });
                res.send(resp);
            }).catch(e => { throw e; });

        } catch (e) {
            console.log(e)
            res.sendStatus(406);
        }
    }
}