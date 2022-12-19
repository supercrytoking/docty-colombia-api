var c = require("./userController");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const { getLimitOffset, limit } = require('../commons/paginator');
const db = require("../models");
const { findSuccessManager, generateToken, sendAndroidPushNotification, S3UploadToFile } = require('../commons/helper');
const invoicePDF = require('./invoicePDF');
const { otpTrigger, crmTrigger } = require("../commons/crmTrigger");

var main = async () => {
    var dated = new Date();
    var date_to = new Date()
    date_to.setDate(date_to.getDate())
    var patient_insurace_id = 34;
    db.user.findAll({
        // limit: getLimitOffset(1),
        where: {
            [Op.or]: [
                {
                    [Op.and]: [
                        { "$services.price$": { [Op.gt]: 0 } },
                    ]
                },
                {
                    "$services.associatedTo.company_service.copay$": { [Op.gt]: 0 }
                }
            ]
        },
        attributes: ["id", "email", 'expertise_level'],
        include: [
            {
                model: db.user_role,
                where: { role_id: 1 }
            },
            {
                model: db.schedule,
                where: {
                    start: { [Op.gte]: new Date(dated) },
                    end: { [Op.lte]: new Date(date_to) },
                    calendarId: { [Op.in]: [4] },
                    state: { [Op.ne]: 'Busy' }
                },
                required: true,
                attributes: ["id", "start", "end"],
                as: 'schedule',
            },
            {
                model: db.user_service,
                as: 'services',
                attributes: ['id', 'price', 'speciality_id'],
                required: true,
                include: [{
                    model: db.associate,
                    required: false,
                    as: 'associatedTo',
                    attributes: ['user_id', 'associate'],
                    include: [{
                        model: db.company_service,
                        as: 'company_service',
                        attributes: ['copay'],
                        include: [{
                            model: db.user_speciality,
                            as: 'user_speciality',
                            attributes: [],
                        }],
                        where: {
                            copay: { [Op.gt]: 0 },
                            type_code: 'video_call',
                            // user_speciality_id: ''
                            // expertise_level: 0,
                            insurance_provider_id:
                            {
                                [Op.or]: [
                                    { [Op.eq]: patient_insurace_id },
                                    { [Op.eq]: null }]
                            },
                        },
                    }]
                }],

            },
        ]
    })
        .then(r => {
            // console.log(JSON.parse(JSON.stringify(r)).count)
            process.exit();
        })
}
main()

