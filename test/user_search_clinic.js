const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const { getLimitOffset, limit } = require('../commons/paginator');
const db = require("../models");

var main = async () => {

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
                where: { role_id: 5 }
            },
            {
                model: db.associate,
                as: 'staff',
                required: true,
                include: []
            },
            {
                required: true,
                model: db.company_service,
                as: 'company_service',
                attributes: ['copay'],
                where: {
                    copay: { [Op.gt]: 0 },
                    type_code: 'video_call',
                    insurance_provider_id:
                    {
                        [Op.or]: [
                            { [Op.eq]: patient_insurace_id },
                            { [Op.eq]: null }]
                    },
                },
            }
        ]
    })
        .then(r => {
            // console.log(JSON.parse(JSON.stringify(r)).count)
            process.exit();
        })
}
main()

