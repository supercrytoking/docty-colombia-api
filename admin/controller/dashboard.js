const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse, responseObject } = require('../../commons/response');

var getBookingCount = (statusList, start, end) => {
    return db.booking.findAll({
        attributes: [
            [Sequelize.fn(`DATE`, Sequelize.col("booking.createdAt")), 'date'],
            [Sequelize.fn(`COUNT`, Sequelize.col("booking.id")), 'count'],
        ],
        group: ['date'],
        where: {
            status: { [Op.in]: statusList }
        },
        include: [
            {
                model: db.schedule,
                as: 'schedule',
                attributes: ['start', 'end', 'id'],
                where: {
                    start: { [Op.gte]: start },
                    end: { [Op.lte]: end },
                },
                required: true
            },
        ]
    })
}

module.exports = {
    dashboard: async (req, res, next) => {
        if (req.user && req.user.id) {
            var duration = 15;
            try {
                var cr = await db.credential.findOne({ where: { key: 'MONITOR_DASHBOARD_DATE_RANGE' } });
                if (cr) duration = parseInt(cr.value);
            }
            catch (e) {

            }

            var start_ago30 = new Date(req.body.start);
            start_ago30.setDate(start_ago30.getDate() - duration);

            //"1": "running", "3": "complete", "5": "accepted", "2": rejected
            let query = `SELECT t.todayBooking, t.medicineCount,t.insuranceProviderNumber
                                FROM (SELECT 
                                (SELECT COUNT(id) FROM bookings WHERE DATE(createdAt) =DATE('${req.body.start}')  AND STATUS IN (1,3,5) ) AS todayBooking,
                                (SELECT COUNT(id) FROM medicines WHERE status=1 ) AS medicineCount,
                                (SELECT COUNT(id) FROM insurence_providers WHERE status=1 ) AS insuranceProviderNumber
                                ) AS t`;
            db.sequelize.query(query).spread(async resp => {
                // console.log(resp[0]);
                resp[0].totalBooking = await getBookingCount([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], start_ago30, new Date(req.body.end));
                resp[0].acceptBooking = await getBookingCount([1, 5], start_ago30, new Date(req.body.end));
                resp[0].rejectedBooking = await getBookingCount([2], start_ago30, new Date(req.body.end));
                resp[0].completedBooking = await getBookingCount([3], start_ago30, new Date(req.body.end));
                // console.log(JSON.parse(JSON.stringify(resp[0])));
                res.send(resp[0])
            }).catch(err => { errorResponse(res, err); console.log(err); });
        } else {
            res.sendStatus(406)
        }

    },
    booking_stastic: async (req, res) => {
        try {
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
                attr = [['title_es', 'title'], 'id', 'role_id'];
            }

            db.user.findAll({
                where: {},
                include: [
                    {
                        model: db.schedule,
                        as: 'schedule',
                        attributes: ['start', 'end', 'id', 'user_id'],
                        where: {
                            start: { [Op.gte]: start },
                            end: { [Op.lte]: end },
                            calendarId: { [Op.in]: [3, 4] },
                        },
                        required: true
                    },
                    {
                        model: db.user_service,
                        as: 'services',
                        required: true,
                        include: [
                            {
                                model: db.speciality,
                                as: 'speciality',
                                attributes: attr,
                                where: {
                                    status: true,
                                },
                                required: true
                            },
                        ]
                    },
                    {
                        model: db.booking,
                        as: 'provider_bookings',
                        required: false,
                        include: [
                            {
                                model: db.schedule,
                                as: 'schedule',
                                attributes: ['start', 'end', 'id'],
                                where: {
                                    start: { [Op.gte]: start },
                                    end: { [Op.lte]: end },
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
            }).then(async resp => {
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
};