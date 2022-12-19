const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    async InsuranceProviders(req, res, next) {
        try {
            let where = {}
            if (req.query && req.query.country_id) {
                where['country_id'] = req.query.country_id;
            }
            let providers = await db.insurence_provider.paginate({ where });
            res.send(providers)
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            })
        }
    },
    async addProvider(req, res, next) {
        try {
            db.insurence_provider.upsert(req.body).then(resp => {
                res.send({
                    status: true,
                    message: 'success'
                })
            }).catch(err => {
                res.status(500).send({
                    status: false,
                    errors: `${err}`
                })
            })
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            })
        }
    },
    async deleteProvider(req, res, next) {
        try {
            db.insurence_provider.destroy({ where: { id: req.body.id } }).then(resp => {
                res.send({
                    status: true,
                    message: 'success'
                })
            }).catch(err => {
                res.status(500).send({
                    status: false,
                    errors: `${err}`
                })
            })
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },
    async InsuranceBenifits(req, res, next) {
        try {
            let benifits = await db.insurence_benifit.paginate();
            res.send(benifits)
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: error
            })
        }
    },
}