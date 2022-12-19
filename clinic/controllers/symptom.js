const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
var os = require('os');
const { response, errorResponse } = require('../../commons/response');
const { getLimitOffset } = require('../../commons/paginator');

var getCusmoerIDList = async(clinic_id) => {
    var staffIdList = [];
    try {

        var myStaff = await db.user.findAll({
            include: [{
                model: db.customer,
                as: 'customer',
                where: { user_id: clinic_id }
            }]
        });
        if (myStaff) staffIdList = myStaff.map(item => item.id);
    } catch (e) {
        console.log(e);
    }
    return staffIdList;
};

var groupByDate = (data) => {
    // this gives an object with dates as keys
    const groups = data.reduce((groups, symptom) => {
        const date = symptom.createdAt.toString().split('T')[0];
        if (!groups[date]) groups[date] = [];

        groups[date].push(symptom);
        return groups;
    }, {});

    // Edit: to add it in the array format instead
    const groupArrays = Object.keys(groups).map((date) => {

        return {
            date,
            count: (groups[date] || []).length
        };
    });
    return groupArrays;

}

module.exports = {
    async addAnalysis(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {

            if (!!!data.user_id) data['user_id'] = req.user.id;
            try {
                let resp = {};
                if (data.id)
                    resp = await db.symptom_analysis.upsert(data, { returning: true });
                else {
                    await db.symptom_analysis.update({
                        changed_user_id: req.user.id,
                        symptom_status: {
                            remarks: 'SYMPTOMS.NEW_RECORD_AVAILABLE',
                            at: new Date(),
                            is_normal: false
                        }
                    }, {
                        where: {
                            changed_user_id: null,
                            changed_admin_id: null,
                            user_id: data.user_id,
                        }
                    });
                    resp = await db.symptom_analysis.create(data);
                    var customer = await db.customer.findOne({ where: { customer: data['user_id'] } });
                    if (customer) {
                        await db.symptom_analysis_clinic.create({ analysis_id: resp.id, clinic_id: customer.user_id });
                    }
                }

                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }
    },
    async allAnalysys(req, res, next) {
        if (req.user && req.user.id) {
            let query = req.query || {};
            let params = req.params || {};

            let where = {};
            let user_id = params.user_id || null;
            let wj = {}
            if (!!user_id) {
                wj = {
                    [Op.or]: [
                        { parent: user_id },
                        { id: user_id },
                    ]
                }
            }
            let include = [{
                    model: db.userFamilyView,
                    as: 'user',
                    where: wj,
                    required: true,
                    include: [{
                        model: db.health_advisor,
                        as: 'advisors',
                        required: true,
                        attributes: ['clinic_id', 'approved'],
                        where: { clinic_id: req.user.id, approved: 1 }
                    }]
                },
                'changed_admin', 'changed_user'
            ];

            if (params.user_id) {
                var customer = await db.customer.findOne({
                    where: { user_id: req.user.id },
                    include: {
                        as: 'familyHead',
                        model: db.userFamilyView,
                        required: true
                    }
                });
                if (customer == null) {
                    var staff = await db.associate.findAll({ where: { user_id: req.user.id } });
                    var staff_ids = staff.map(u => u.id);
                    include.push({
                        model: db.booking,
                        as: 'booking',
                        where: {
                            provider_id: {
                                [Op.in]: staff_ids
                            }
                        },
                        required: true
                    });
                }
            }
            if (query.id) {
                where.id = req.query.id;
            }


            if (query.status_changed == '1') {
                where = {
                    [Op.or]: [{
                            changed_admin_id: {
                                [Op.ne]: null
                            }
                        },
                        {
                            changed_user_id: {
                                [Op.ne]: null
                            }
                        },
                    ],
                    ...where
                };
            }
            if (req.query && req.query.status_changed == '0') {
                where = {
                    [Op.and]: [{
                            changed_admin_id: {
                                [Op.eq]: null
                            }
                        },
                        {
                            changed_user_id: {
                                [Op.eq]: null
                            }
                        },
                    ],
                    ...where
                };
            }

            db.symptom_analysis.findAll({
                where,
                include: include,
                order: [
                    ['createdAt', 'desc']
                ],
                limit: 100
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    async getActiveAnalysys(req, res, next) {
        if (req.user && req.user.id) {
            let query = req.query || {};

            let where = {
                changed_admin_id: {
                    [Op.eq]: null
                },
                changed_user_id: {
                    [Op.eq]: null
                },
                '$booking.id$': {
                    [Op.eq]: null
                },
                [Op.or]: [
                    // { '$user.advisor$': { [Op.ne]: null } },
                    // { '$user.customeredTo$': { [Op.ne]: null } },
                    db.sequelize.where(Sequelize.col('user.advisor.clinic_id'), '!=', null),
                    db.sequelize.where(Sequelize.col('user.customeredTo.user_id'), '!=', null),
                ]
            };
            if (req.params && req.params.id) {
                where.id = req.params.id;
            }

            if (!!!query || !!!eval(query.all)) {
                if (!!query && !!eval(query.emergency)) {
                    where = {
                        [Op.and]: db.sequelize.literal(`tirage->"$.triage_level" like '%emergency%'`),
                        ...where
                    };
                } else {
                    where = {
                        [Op.and]: db.sequelize.literal(`tirage->"$.triage_level" NOT LIKE '%emergency%'`),
                        ...where
                    };
                }
            } else {
                where = {
                    [Op.and]: db.sequelize.literal(`tirage->"$.triage_level" LIKE '%%'`),
                    ...where
                };
            }


            let include = [{
                    model: db.userFamilyView.scope('publicInfo', 'contactInfo'),
                    as: 'user',
                    required: true,
                    include: [{
                            model: db.health_advisor,
                            as: 'advisor',
                            required: false,
                            attributes: ['clinic_id', 'approved'],
                            where: { clinic_id: req.user.id, approved: 1 }
                        },
                        {
                            model: db.customer.scope(''),
                            as: 'customeredTo',
                            required: false,
                            attributes: ['user_id', 'customer'],
                            where: { user_id: req.user.id }
                        }
                    ]
                },
                'changed_admin',
                'changed_user',
                {
                    model: db.booking,
                    as: 'booking',
                    required: false,
                    where: { payment_status: 1 }
                },

            ];
            db.symptom_analysis.findAll({
                where,
                // attributes: ['tirage', 'conditions', 'id'],
                include: include,
                order: [
                    ['createdAt', 'desc']
                ]
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                console.log(`${err}`)
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    chengedAnalysis: async(req, res, next) => {
        let offset = 0;
        let pageSize = 25;
        let page = 1;
        let query = req.query || {};
        if (query.page) {
            page = parseInt(query.page) || 1;
        }
        if (query.pageSize) {
            pageSize = parseInt(query.pageSize) || 25;
        }
        offset = (page - 1) * pageSize;

        let sql = `SELECT symptom_analysis.id id, symptom_analysis.age,symptom_analysis.sex, symptom_analysis.tirage,symptom_analysis.createdAt,
        symptom_analysis.symptom_status, bookings.id AS booking_id, symptom_analysis.changed_admin_id,symptom_analysis.changed_user_id,symptom_analysis.conditions,
        JSON_OBJECT('fullName',CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')),'email',u.email,'phone_number',u.phone_number) AS user
        FROM symptom_analysis
        JOIN user_family_view u ON u.id = symptom_analysis.user_id AND u.deletedAt IS NULL
        JOIN health_advisors ON IF(u.id = u.parent, health_advisors.patient_id = symptom_analysis.user_id, (health_advisors.patient_id = u.parent AND health_advisors.family_access = 1))
        AND health_advisors.clinic_id = ${req.user.id} AND health_advisors.approved = 1
        LEFT JOIN bookings ON bookings.dignosis_id = symptom_analysis.id AND bookings.payment_status = 1
        WHERE (symptom_analysis.changed_admin_id IS NOT NULL OR symptom_analysis.changed_user_id IS NOT NULL OR  bookings.id IS NOT NULL) ORDER BY id desc #LIMIT ${offset},${pageSize}
        `;

        db.sequelize.query(sql)
            .spread((r, m) => res.send(r))
            .catch(e => res.status(400).send({ status: false, error: `${e}` }));
    },
    getAllCovidResponse: async(req, res, next) => {
        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "id";
            let order = 'desc';
            let pageSize = 25;
            let params = req.params || {};
            var where = {
                // [Op.or]: [
                //     { user_id: { [Op.in]: await getCusmoerIDList(req.user.id) } },
                //     { by_user_id: req.user.id }
                // ],
            };

            if (params.status == 'active') {
                where = {
                    changed_user_id: null,
                    changed_admin_id: null,
                    booking_id: null
                }
            }
            if (params.status == 'inactive') {
                where = {
                    [Op.or]: [{
                            changed_user_id: {
                                [Op.ne]: null
                            }
                        },
                        {
                            changed_admin_id: {
                                [Op.ne]: null
                            }
                        },
                        {
                            booking_id: {
                                [Op.ne]: null
                            }
                        }
                    ]
                }
            }
            let data = {};
            if (req.body) {
                data = req.body || {};
                search = data.search || "";
                orderKey = data.orderKey || "createdAt";
                order = data.order || "desc";
                page = data.page || 1;
                pageSize = data.pageSize || 25;
                if (data.id) where = { id: data.id };
            }


            var userWhere = {};
            if (search.length > 0) {
                userWhere = {
                    [Op.or]: [{
                            'first_name': {
                                [Op.like]: `%${search}%`
                            }
                        },
                        {
                            'last_name': {
                                [Op.like]: `%${search}%`
                            }
                        },
                        {
                            'middle_name': {
                                [Op.like]: `%${search}%`
                            }
                        },
                        {
                            'email': {
                                [Op.like]: `%${search}%`
                            }
                        },
                        {
                            'phone_number': {
                                [Op.like]: `%${search}%`
                            }
                        }
                    ]
                };
            }
            if (!!data.age) {
                where.age = data.age
            }
            if (!!data.dateStart && !!data.dateEnd) {
                let dateStart = new Date(data.dateStart)
                let dateEnd = new Date(data.dateEnd)
                where.createdAt = {
                    [Op.and]: [{
                            [Op.gte]: new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate())
                        },
                        {
                            [Op.lte]: new Date(dateEnd.getFullYear(), dateEnd.getMonth(), dateEnd.getDate(), 59, 59, 59)
                        }
                    ]
                }
            } else if (!!data.dateStart) {
                let dateStart = new Date(data.dateStart)
                where.createdAt = {
                    [Op.gte]: new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate())
                }
            } else if (!!data.dateEnd) {
                let dateEnd = new Date(data.dateEnd)
                where.createdAt = {
                    [Op.lte]: new Date(dateEnd.getFullYear(), dateEnd.getMonth(), dateEnd.getDate(), 59, 59, 59)
                }
            }



            if (!!data.gender) {
                where.gender = data.gender
            }
            if (!!data.triage) {
                where = {
                    [Op.and]: db.sequelize.literal(`triage->"$.triage_level"  LIKE '%${data.triage}%'`),
                    ...where
                };
            }
            console.log(where);

            db.covid_checker.findAndCountAll({
                order: [
                    [orderKey, order]
                ],
                limit: getLimitOffset(page, pageSize),
                where: where,
                include: [{
                    model: db.userFamilyView.scope('publicInfo', 'contactInfo'),
                    as: 'user',
                    where: userWhere,
                    include: [{
                        model: db.health_advisor,
                        as: 'advisors',
                        required: true,
                        attributes: ['clinic_id', 'approved'],
                        where: { clinic_id: req.user.id, approved: 1 }
                    }]
                }, 'changed_admin', 'changed_user']
            }).then(resp => response(res, resp)).catch(err => errorResponse(res, err));
        } else {
            res.sendStatus(406);
        }
    },
    analysis: (req, res) => {
        if (req.user && req.user.id) {
            let where = {
                // user_id: req.user.id
            };
            if (req.params && req.params.id) {
                where.id = req.params.id;
            }
            let include = [
                'changed_user', 'changed_admin'
            ];
            if (req.query && req.query.user_id) {
                where.user_id = req.query.user_id;
            }
            include.push('user');

            db.symptom_analysis.findOne({ where, include: include }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    summaryGraphData: async(req, res) => {
        var clinic_id = req.user.id;
        var sql = ` SELECT symptom_analysis.age,symptom_analysis.sex, JSON_EXTRACT(symptom_analysis.tirage,'$.triage_level') triage_level,symptom_analysis.symptom_status, bookings.id AS booking_id,
        symptom_analysis.changed_admin_id,symptom_analysis.changed_user_id
        FROM symptom_analysis
        JOIN user_family_view u ON u.id = symptom_analysis.user_id AND u.deletedAt IS NULL
        JOIN health_advisors ON (health_advisors.patient_id = u.id OR (health_advisors.patient_id = u.parent AND health_advisors.family_access = 1))
        AND health_advisors.clinic_id = ${clinic_id} AND health_advisors.approved = 1
        LEFT JOIN bookings ON bookings.dignosis_id = symptom_analysis.id  AND bookings.payment_status = 1
        WHERE health_advisors.deletedAt IS NULL`;

        var queryResult = await db.queryRun(sql);
        var list = queryResult || [];

        // list.forEach(symptom => {
        //     if (typeof symptom.tirage == 'string') symptom.tirage = JSON.parse(symptom.tirage)
        //     if (typeof symptom.symptom_status == 'string') symptom.symptom_status = JSON.parse(symptom.symptom_status)
        //     if (symptom.tirage) {
        //         symptom.triage_level = symptom.tirage.triage_level
        //     }
        // })
        // console.log(list);
        var active_symptoms = list.filter(symptom => symptom.booking_id == null &&
            symptom.changed_admin_id == null &&
            symptom.changed_user_id == null &&
            !!!(symptom.triage_level + '').includes('emergency'));
        var status_changed = list.filter(symptom => symptom.booking_id != null || symptom.changed_admin_id != null || symptom.changed_user_id != null);
        var emergency = list.filter(symptom => symptom.booking_id == null &&
            symptom.changed_admin_id == null &&
            symptom.changed_user_id == null &&
            symptom.booking_id == null &&
            (symptom.triage_level + '').includes('emergency'));

        var male_symptoms = list.filter(symptom => symptom.sex == 'male').length
        var female_symptoms = list.filter(symptom => symptom.sex == 'female').length

        var symptom_12_22 = 0;
        var symptom_22_32 = 0;
        var symptom_33_50 = 0;
        var symptom_50 = 0;

        // 12~22
        // 22~32
        // 33~50
        // >50
        list.forEach(symptom => {
            if (symptom.age < 22) symptom_12_22++;
            else if (symptom.age < 32) symptom_22_32++;
            else if (symptom.age < 50) symptom_33_50++;
            else symptom_50++;
        });
        var is_normal = 0;
        var is_required_immediate_care = 0
        var is_will_self_care = 0
        var is_taking_counselling_by_a_provider = 0;

        status_changed.forEach(symptom => {
            if (symptom.symptom_status == null) return
            if (symptom.symptom_status.is_normal) is_normal++;
            if (symptom.symptom_status.is_required_immediate_care) is_required_immediate_care++;
            if (symptom.symptom_status.is_will_self_care) is_will_self_care++;
            if (symptom.symptom_status.is_taking_counselling_by_a_provider) is_taking_counselling_by_a_provider++;
        });

        res.send({
            types: [active_symptoms.length, emergency.length, status_changed.length],
            gender: [male_symptoms, female_symptoms],
            age: [symptom_12_22, symptom_22_32, symptom_33_50, symptom_50],
            status: [is_normal, is_required_immediate_care, is_will_self_care, is_taking_counselling_by_a_provider],
        })
    },
    lineGraphData: async(req, res) => {
        var clinic_id = req.user.id;
        var data = req.body;
        var start = new Date(data.start);
        var end = new Date(data.end);

        var sql = `SELECT symptom_analysis.*, bookings.id AS booking_id FROM symptom_analysis
                JOIN health_advisors ON health_advisors.patient_id = symptom_analysis.user_id 
                LEFT OUTER JOIN bookings ON bookings.dignosis_id = symptom_analysis.id
                WHERE ((COALESCE(health_advisors.family_access,0) = 0 AND COALESCE(symptom_analysis.family_id) = 0) OR health_advisors.family_access = 1) AND
                (DATE(symptom_analysis.createdAt) BETWEEN DATE('${data.start}') AND DATE("${data.end}"))
                AND health_advisors.clinic_id = ${req.user.id} 
                AND health_advisors.approved = 1`;
        console.log(sql);
        var queryResult = await db.queryRun(sql).catch(e => {
            console.log(e);
            return [];
        });
        var list = queryResult || [];

        list.forEach(symptom => {
            if (typeof symptom.tirage == 'string') symptom.tirage = JSON.parse(symptom.tirage)
            if (typeof symptom.symptom_status == 'string') symptom.symptom_status = JSON.parse(symptom.symptom_status)
            if (symptom.tirage) {
                symptom.triage_level = symptom.tirage.triage_level
            }
        });
        var self_care = list.filter(symptom => symptom.tirage != null).filter(symptom => symptom.tirage.triage_level == 'self_care');
        var consultation = list.filter(symptom => symptom.tirage != null).filter(symptom => symptom.tirage.triage_level == 'consultation');
        var emergency = list.filter(symptom => symptom.tirage != null).filter(symptom => symptom.tirage.triage_level == 'emergency');
        var emergency_ambulance = list.filter(symptom => symptom.tirage != null).filter(symptom => symptom.tirage.triage_level == 'emergency_ambulance');

        var linedgraph_data = {
            self_care: groupByDate(self_care),
            consultation: groupByDate(consultation),
            emergency: groupByDate(emergency),
            emergency_ambulance: groupByDate(emergency_ambulance),
        }
        res.send({
            line_data: linedgraph_data
        })
    },

};