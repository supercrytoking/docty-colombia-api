const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const bcrypt = require('bcryptjs');
const db = require("../models");
const moment = require('moment');

const { findSuccessManager } = require('../commons/helper');

var getPasswordHash = (pwd) => {
    return new Promise(resolve => {
        bcrypt.genSalt(10, async function (err, salt) {
            bcrypt.hash(pwd, salt, async function (err, newPassword) {
                resolve(newPassword);
            })
        })
    })
}

var createBulkDoctorUser = async () => {
    var password = await getPasswordHash('123456');
    for (var i = 0; i < 50; i++) {
        var email = `testuser_${i}@yopmail.com`
        if (await db.user.findOne({ where: { email: email, } })) {
            console.log('exist ', email)
            continue;
        }
        var user = await db.user.create({ email: email, password: password, status: 1, first_name: `first${i}`, last_name: `last${i}`, picture: 'http://localhost/phpmyadmin/themes/pmahomme/img/logo_left.png' });
        await db.user_role.create({ user_id: user.id, role_id: 1 })// doctor
    }
    console.log('created')
}

var createBulkNurseUser = async () => {
    var password = await getPasswordHash('123456');
    for (var i = 0; i < 2; i++) {
        var email = `testNurseUser_${i}@yopmail.com`
        if (await db.user.findOne({ where: { email: email, } })) {
            console.log('exist ', email)
            continue;
        }
        var user = await db.user.create({ email: email, password: password, status: 1, first_name: `first${i}`, last_name: `Nurse ${i}`, picture: 'http://localhost/phpmyadmin/themes/pmahomme/img/logo_left.png' });
        await db.user_role.create({ user_id: user.id, role_id: 3 })// doctor
        await db.address.create({ user_id: user.id, longitude: -74.14749739999999, latitude: 40.2862385 })// doctor
    }
    console.log('created')
}

var assignAddressBulkNurseUser = async () => {

    for (var i = 0; i < 5; i++) {
        var email = `testNurseUser_${i}@yopmail.com`
        var user = await db.user.findOne({ where: { email: email } })
        if (user) {
            await db.address.destroy({ where: { user_id: user.id } })
            await db.address.create({ user_id: user.id, longitude: -74.14749739999999, latitude: 40.2862385 })// doctor
        } else {
            console.log('there is no user list', email);
        }
    }
    console.log('created')
}

var assignSuccessManager = async () => {
    for (var i = 0; i < 50; i++) {
        var email = `testuser_${i}@yopmail.com`
        var user = await db.user.findOne({ where: { email: email } })
        if (user) {
            var admin = await findSuccessManager();
            if (admin && admin.id) {
                console.log(admin.id)
                await db.user_profile_reviewer.destroy({ where: { user_id: user.id } });
                await db.user_profile_reviewer.upsert({ user_id: user.id, admin_id: admin.id });
            }
            else {
                console.log('else ', admin)
            }
        } else {
            console.log('there is no user list');
        }
    }
    console.log('created')
}
var duration = 15;
var intervals = (startString, endString) => {
    var start = moment(startString);//, 'YYYY-MM-DD hh:mm a'
    var end = moment(endString);//, 'YYYY-MM-DD hh:mm a'
    start.minutes(Math.ceil(start.minutes() / duration) * duration);
    var result = [];
    var current = moment(start);
    while (current < end) {
        result.push({
            start: current.toDate(),
            end: current.add(duration, 'minutes').toDate()
        });
        // current.add(15, 'minutes');
    }
    return result;
}
var deleteSchedule = async () => {
    for (var i = 0; i < 1; i++) {
        var email = `testuser_${i}@yopmail.com`
        var user = await db.user.findOne({ where: { email: email } })
        if (user) {
            var r = await db.schedule.destroy({ where: { user_id: user.id } });
            console.log(r)
        }
    }
}
var createSchedule = async () => {
    console.log('Creating Schedule --');
    var startDate = new Date('2020/08/05')
    var endDate = new Date('2020/08/20 00:45')
    var slots = intervals(new Date(startDate).toISOString(), new Date(endDate).toISOString());

    for (var i = 27; i < 50; i++) {
        console.log('i', i)
        var email = `testuser_${i}@yopmail.com`
        var user = await db.user.findOne({ where: { email: email } })
        if (user) {
            try {
                var slotsCopy = JSON.parse(JSON.stringify(slots));
                let schedule = {
                    user_id: user.id,
                    title: `Available at Docty.ai`,
                    calendarId: 4,
                    category: 'time',
                    location: null,
                    dueDateClass: '',
                    isReadOnly: false,
                    state: `Free`,
                    isAllDay: false,
                    start: null,
                    end: null
                }

                console.log('Creating slot for ' + email, slotsCopy.length);

                for (var jj = 0; jj < slotsCopy.length; jj++) {
                    var slot = slotsCopy[jj];
                    // var oldSchedule = await db.schedule.findOne({ where: { start: slot.start, end: slot.end, user_id: user.id } })
                    // if (!oldSchedule) {
                    schedule.start = slot.start;
                    schedule.end = slot.end;
                    var newS = await db.schedule.create(schedule);
                    // console.log('created schedule', newS.id);
                    // } else {
                    // console.log('already exist schedule', oldSchedule.id);
                    // }
                }

            } catch (error) {
                console.log(error)
            }

        } else {
            console.log('no exist ', email)
        }

    }
}
// var xlsx = require('node-xlsx');
var fs = require('fs');

var crmTriggerExportCSV = async () => {
    var t = await db.email_trigger.findAll({ include: ['template'] });
    var csv = 'Trigger, Mapped Template, Template URL, Description\n'
    for (var i = 0; i < t.length; i++) {
        var trigger = t[i];
        var template = trigger.template || [];

        console.log(JSON.parse(JSON.stringify(t[i].template.length)))

        csv += `${trigger.name},${template.map(t => `{{${t.title}}}`).join()},${template.map(t => `{{https://cms.docty.ai/email-template/view/${t.id}}}`).join()},${trigger.description}\n`
    }
    fs.writeFileSync('trigger_export.csv', csv);
}

var findDuplicatedTranslate = async () => {
    let sql = `SELECT *, COUNT(*) as COUNT FROM translations GROUP BY en HAVING  COUNT(*) > 1`;
    db.sequelize.query(sql).spread((resp) => {
        var t = JSON.parse(JSON.stringify(resp));
        var csv = 'ID,COUNT, SECTION, KEYWORD, en, es\n'

        for (var i = 0; i < t.length; i++) {
            var translate = t[i];
            csv += `${translate.id},${translate.COUNT},${translate.section},${translate.keyword},${translate.en},${translate.es}\n`
        }
        fs.writeFileSync('translate_export.csv', csv);
    })
}

var userSearch = async () => {
    var sql =
        `
    SELECT user.id
    FROM users AS user
        LEFT OUTER JOIN customers AS customers ON user.id = customers.customer
        INNER JOIN user_roles AS user_role ON user.id = user_role.user_id
        AND user_role.role_id = 2
    WHERE (
            user.deletedAt IS NULL
            AND customers.id IS NULL
        );
    ORDER BY user.id ASC
    `
    // LIMIT 0, 25;
    var queryResult = await db.queryRun(sql);
    var count = queryResult[0].count;
    console.log(queryResult)
    // process.exit()
}

module.exports = {
    createBulkDoctorUser: createBulkDoctorUser,
    createBulkNurseUser: createBulkNurseUser,
    assignAddressBulkNurseUser: assignAddressBulkNurseUser,
    createSchedule: createSchedule,
    deleteSchedule: deleteSchedule,
    assignSuccessManager: assignSuccessManager,
    crmTriggerExportCSV: crmTriggerExportCSV,
    findDuplicatedTranslate: findDuplicatedTranslate,
    userSearch: userSearch
}