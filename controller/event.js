const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { Slots, resolveConflict } = require("../commons/slots");
const { includes } = require('underscore');

module.exports = {
    getEvents: async (req, res, next) => {
        if (req.user && req.user.id) {

            let user_id = req.user.id;
            if (req.body.user_id) {
                user_id = req.body.user_id;
            }
            let start = req.body.start;
            let end = req.body.end;
            if (!start || !end) {
                return res.status(403).send({
                    status: false,
                    errors: `Invalid date range provided`
                });
            }
            let query = `SELECT * FROM user_events WHERE start >= "${start}" AND start <= "${end}" AND user_id = ${user_id}`;
            if (req.body.calendarId) {
                query += ` AND calendarId IN (${req.body.calendarId})`;
            } else {
                query += ` And calendarId <> 4`;
            }
            db.sequelize.query(query).spread((resp, meta) => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    updateEvent: async (req, res) => {
        let state = (req.body.state || '').toLowerCase();
        if (!!!state || !!!['pending', 'complete', 'remind'].includes(state)) {
            return res.status(400).send({ status: false, message: 'invalid state' })
        }
        db.user_event.update({ state: state }, {
            where: {
                id: req.body.id,
                user_id: req.user.id
            }
        })
            .then(r => res.send({ status: true, message: 'updated' }))
            .catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    setEvent: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            var user_id = req.user.id;
            if (req.body.user_id) {
                user_id = req.body.user_id;
            }
            data['user_id'] = user_id;
            let start = data.start._date || data.start;
            let end = data.end._date || data.end;
            let duration = data.duration;
            data['start'] = new Date(start);
            data['end'] = new Date(end);

            let query = `
            SELECT start, end, calendarId FROM user_events
            WHERE user_id= ${data.user_id} AND (
              (start < '${end}' AND end > '${start}')
              OR (start >= '${end}' AND start <= '${start}' AND end <= '${start}')
              OR (end <= '${start}' AND end >= '${end}' AND start <= '${end}')
              OR (start > '${end}' AND start < '${start}')
            )`;

            let event = await db.sequelize.query(query);
            let ev = event[0];
            if (!!!data.id && !!ev.length) {
                return res.status(400).send({
                    status: false,
                    message: 'CONFLICTING_EVENT_TIMING',
                    data: { event, data }
                });
            }
            if (data.id) {
                let user_event = await db.user_event.findByPk(data.id);
                await db.user_event.destroy({
                    where: {
                        user_id: user_id,
                        calendarId: { [Op.in]: [2, 4] },
                        start: { [Op.gte]: user_event.start },
                        end: { [Op.lte]: user_event.end },
                    }
                });
            }
            let slots = Slots(start, end, duration);
            slots.map(e => e.user_id = user_id);
            slots = resolveConflict(slots, ev);
            db.user_event.bulkCreate(slots).then(resp => {
                res.send({
                    status: true,
                    data: resp,
                    message: 'event created successfully.'
                });
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    deleteEvent: async (req, res, next) => {

        var user_id = req.user.id;
        if (req.body.user_id) user_id = req.body.user_id;
        let user_event = await db.user_event.findOne({ where: { user_id: user_id, id: req.body.id } });
        if (!!user_event) {
            await db.user_event.destroy({
                where: {
                    user_id: user_id,
                    calendarId: { [Op.in]: [4, 5] },
                    id: { [Op.ne]: req.body.id },
                    start: { [Op.gte]: user_event.start },
                    end: { [Op.lte]: user_event.end },
                    // isReadOnly: { [Op.ne]: 1 }
                }
            });
        }
        let inst;
        if (!!user_event && +user_event.calendarId === 4) {
            inst = user_event.update({ calendarId: 5, isReadOnly: 1, title: 'DELETED' });
        } else {
            inst = user_event.destroy();
        }
        inst.then(resp => {
            res.send({
                status: true,
                data: resp,
                message: 'event deleted successfully'
            });
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: `${err}`
            });
        });
    }

};