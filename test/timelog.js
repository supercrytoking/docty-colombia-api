const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

var daysOfDiff = (listOfdata) => {
    var loginDays = 0;
    if (listOfdata.length > 1) {
        loginDays = new Date(listOfdata[0]).getTime() - new Date(listOfdata[1]).getTime();
    } else if (listOfdata.length == 1) {
        loginDays = new Date().getTime() - new Date(listOfdata[0]).getTime();
    }
    loginDays = Math.round(loginDays / (1000 * 60 * 60 * 24));
    return loginDays;
};

(async () => {
    var user_id = 415;
    var activity_logs = await db.activity_log.findAll({
        where: {
            user_id: user_id
        },
        limit: 2,
        order: [['createdAt', 'DESC']],

    });
    activity_logs = activity_logs.map(a => a.createdAt);
    var loginDays = daysOfDiff(activity_logs);

    var symptom_analysis = await db.symptom_analysis.findAll({
        where: {
            user_id: user_id
        },
        limit: 2,
        order: [['createdAt', 'DESC']],

    });
    symptom_analysis = symptom_analysis.map(a => a.createdAt);
    var symptomDays = daysOfDiff(symptom_analysis);

    var books = await db.booking.findAll({
        where: {
            patient_id: user_id,
            status: 3,//complete
            family_member_id: 0,

        },
        limit: 2,
        order: [[{
            model: db.schedule,
            as: 'schedule',
        }, 'start', 'DESC']],
        include: [{
            model: db.schedule,
            as: 'schedule',
            required: true,
        }]
    });
    books = books.map(b => b.schedule.start);
    var bookingDays = daysOfDiff(books);
    console.log(loginDays, symptomDays, bookingDays);

    process.exit();
})();