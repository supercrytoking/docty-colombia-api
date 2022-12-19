const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { upload } = require('../../commons/fileupload');


module.exports = {
    async addReview(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.review.upsert(data);
                res.send({
                    status: true,
                    data: resp
                })
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                })
            }
        } else {
            res.sendStatus(406)
        }

    },
    async deleteReview(req, res, next) {
        if (req.body.id) {
            try {
                let resp = await db.review.destroy({ where: { id: req.body.id } });
                res.send({
                    status: true,
                    data: resp
                })
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                })
            }
        }
        else {
            res.sendStatus(406)
        }
    },
    async getReviews(req, res, next) {
        let where = {};
        if (req.body.patient_id) {
            where.patient_id = req.body.patient_id;
        }
        if (req.body.doctor_id) {
            where.doctor_id = req.body.doctor_id;
        }
        if (req.body.ratings) {
            where.ratings = req.body.ratings;
        }

        try {
            let resp = await db.review.findAll({ where, include: ['reviewer', 'review_for'] });
            res.send(resp)
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async review(req, res, next) {
        if (req.body.id) {
            db.review.findByPk(req.body.id).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    }
}