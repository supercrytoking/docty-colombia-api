const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { errorResponse, response } = require('../../commons/response');


module.exports = {
    dashboard: async (req, res, next) => {
        if (req.user && req.user.id) {

            var dateStart = req.body.dateStart || req.body.start;
            let query = `SELECT t.totalAvalibility,t.todayBooking,t.todayUpcomingBooking,t.weeklyEarning, t.id, r.reviews,r.rating
                        FROM (SELECT 
                        (SELECT SUM(TIMESTAMPDIFF(MINUTE,start,end)) FROM schedules WHERE start >= '${dateStart}' AND end <= '${req.body.end || req.body.start}' AND user_id = ${req.user.id} AND calendarId = 4) AS totalAvalibility,
                        (SELECT COUNT(id) FROM bookings WHERE DATE(createdAt) =DATE('${req.body.start}') AND provider_id = ${req.user.id} AND STATUS IN (1,3,5) ) AS todayBooking,
                        (SELECT COUNT(bookings.id) FROM bookings LEFT OUTER JOIN schedules ON bookings.schedule_id = schedules.id WHERE provider_id = ${req.user.id} AND STATUS IN (1,5) AND schedules.end >= '${req.body.start}' AND schedules.start < '${req.body.end}') AS todayUpcomingBooking,
                        (SELECT SUM(amount) FROM bookings WHERE WEEK(createdAt) = WEEK('${req.body.start}') AND provider_id = ${req.user.id} AND STATUS = 3) AS weeklyEarning, ${req.user.id} AS id ) AS t
                        LEFT JOIN rating_summaries r ON r.user_id = t.id`
            db.sequelize.query(query).spread(resp => {
                return response(res, resp[0])
            }).catch(err => { errorResponse(res, err); console.log(err) })
        } else {
            res.sendStatus(406)
        }

    }
}