const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse, responseObject } = require('../../commons/response');

module.exports = {
    getLogs: async (req, res, next) => {

        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "id";
            let order = "asc";

            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "id";
                order = data.order || "asc";
                page = data.page || 1;

            }
            var where = {
                trigger_name: { [Op.like]: `%${search}%` }
            };

            db.monitor_notifications_log.findAndCountAll({
                where: where,
                order: [[orderKey, order]],
                limit: getLimitOffset(page)
            }).then(resp => {
                return response(res, resp);
            }).catch(err => {
                console.log(err);
                return errorResponse(res, err);
            });
        } else {
            res.sendStatus(406);
        }
    },
    updateSeen: async (req, res, next) => {
        if (req.user && req.user.id) {
            db.monitor_notifications_log.update({ seen: true }, { where: { id: req.body.id } })
                .then(resp => res.send({ status: true }));
        } else {
            res.sendStatus(406);
        }
    }
};