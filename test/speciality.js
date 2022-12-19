const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const db = require("../models");

var main = async () => {

    var dated = new Date();
    var date_to = new Date()
    var patient_insurace_id = 34;
    var type_code = 'video_call';

    dated.setDate(dated.getDate() + 1)

    date_to.setDate(date_to.getDate() + 500)

    db.speciality.findAll({
        where: {
            [Op.or]: [
                {
                    [Op.and]: [
                        { "$user_service.price$": { [Op.gt]: 0 } },
                    ]
                },
                {
                    "$user_service.associatedTo.company_service.copay$": { [Op.gt]: 0 }
                }
            ]
        },
        include: [
            {
                model: db.user_service,
                as: 'user_service',
                attributes: ['id', 'price', 'speciality_id'],
                required: true,
                // where: {
                //     [Op.and]: [
                //         // Sequelize.where(Sequelize.col("$associatedTo.company_service.user_speciality.speciality_id$"), Sequelize.col("speciality_id"))
                //     ]
                // },
                include: [
                    {
                        required: true,
                        model: db.user,
                        as: 'user',
                        attributes: ['id', 'expertise_level'],
                        include: [
                            {
                                required: true,
                                model: db.schedule,
                                where: {
                                    start: { [Op.gte]: new Date(dated) },
                                    end: { [Op.lte]: new Date(date_to) },
                                    calendarId: { [Op.in]: [4] },
                                    state: { [Op.ne]: 'Busy' }
                                },
                                attributes: [],
                                as: 'schedule',
                            },
                        ]
                    },
                    {
                        model: db.associate,
                        required: false,
                        as: 'associatedTo',
                        attributes: ['user_id', 'associate'],
                        include: [{
                            required: true,
                            model: db.company_service,
                            as: 'company_service',
                            attributes: ['expertise_level'],
                            include: [{
                                model: db.user_speciality,
                                as: 'user_speciality',
                                attributes: ['speciality_id'],
                            }],
                            where: {
                                copay: { [Op.gt]: 0 },
                                // expertise_level: 0,
                                type_code: type_code,
                                insurance_provider_id:
                                {
                                    [Op.or]: [
                                        { [Op.eq]: patient_insurace_id },
                                        { [Op.eq]: null }]
                                },
                            },
                        },
                        ]
                    }]
            },

        ]
    })
        .then(r => {
            console.log(JSON.parse(JSON.stringify(r)).length)
            process.exit();
        })
}
main()

