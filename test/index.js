var c = require("./userController");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const { getLimitOffset, limit } = require('../commons/paginator');
const db = require("../models");
const { findSuccessManager, generateToken, sendAndroidPushNotification, S3UploadToFile } = require('../commons/helper');
const invoicePDF = require('./invoicePDF');
const { otpTrigger, crmTrigger } = require("../commons/crmTrigger");

//c.createBulkDoctorUser();
// c.createSchedule();
// c.deleteSchedule();
// c.createBulkNurseUser();
// c.assignAddressBulkNurseUser()
var main = async () => {

    let include = ['rating_summary', {
        model: db.my_favorite,
        as: 'favorite_of',
        left: false,
        required: false,
        where: { user_id: 415 }
      },];

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

            }
        ],
        required: true,

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
                    { [Op.eq]: null }]
            },
        },
        include: [{
            required: true,
            model: db.user_speciality,
            as: 'user_speciality',
        }]
    });

    include.push({
        model: db.user_role,
        where: { role_id: 5 }
    });

    let options = {
        include: include,
        where: {},
        distinct: true,
        col: `id`,
    }

    db.user.scope('publicInfo', 'availableStatus').findAndCountAll(options).then(async resp => {
        resp = JSON.parse(JSON.stringify(resp))
        console.log(resp)
        process.exit()
    })
}
main()

