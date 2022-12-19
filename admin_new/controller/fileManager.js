const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
    async getFiles(req, res, next) {
        let page = 1;
        let orderKey = 'name';
        let order = 'ASC';
        let search = '';
        if (req.query && req.query.page) {
            page = req.query.page;
        }
        if (req.body && req.body.page) {
            page = req.body.page;
        }
        if (req.body && req.body.search) {
            search = req.body.search;
        }
        if (req.body && req.body.orderKey) {
            orderKey = req.body.orderKey;
        }
        if (req.body && req.body.order) {
            order = req.body.order;
        }
        try {
            db.file_manager.findAndCountAll({
                where: {
                    // status:{[Op.ne]:0},
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                        { path: { [Op.like]: `%${search}%` } }
                    ]
                },
                order: [[orderKey, order]],
                limit: getLimitOffset(page)
            }).then(providers => response(res, providers))
                .catch(err => errorResponse(res, err));
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            });
        }
    },

    async addFiles(req, res, next) {
        try {
            db.file_manager.upsert(req.body).then(resp => {
                res.send({
                    status: true,
                    message: 'success'
                });
            }).catch(err => {
                res.status(500).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            });
        }
    },
    async deleteFiles(req, res, next) {
        try {
            db.file_manager.destroy({ where: { id: req.body.id } }).then(resp => {
                res.send({
                    status: true,
                    message: 'success'
                });
            }).catch(err => {
                res.status(500).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            });
        }
    }
};