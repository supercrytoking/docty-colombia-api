const { sendMail } = require('./mailer');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    freeUp: async () => {
        let d = new Date();
        let min = d.getMinutes() - 10;
        d.setMinutes(min);
        let date = new Date(d);
        return db.schedule.update({ state: 'Free' }, {
            where: {
                calendarId: 4,
                state: 'Busy', //isReadOnly: 0,
                updatedAt: { [Op.lt]: date }
            }
        }).then((res) => console.log(res));
    },
    setBookingExpired: async () => {
        let sq = `UPDATE bookings b, schedules s SET b.status=10,b.extras =
                        CASE
                            WHEN b.extras IS NOT NULL THEN JSON_SET(b.extras,'$.statusBeforeExpire',b.status)
                            ELSE JSON_OBJECT("statusBeforeExpire",b.status)
                        END
                    WHERE b.schedule_id = s.id AND s.end < NOW() AND b.status IN (5,0)`;
        db.sequelize.query(sq).spread((r, s) => console.log(r)).catch(e => console.log(e))
    }
};

module.exports.freeUp()