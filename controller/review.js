const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

async function calculateAvarageRating(id) {
    try {
        return db.sequelize.query(`SELECT AVG(ratings) AS rating, COUNT(review) AS reviews, doctor_id AS user_id 
    FROM reviews WHERE patient_id != doctor_id AND doctor_id = ${id}`).spread(res => {
            if (!!res && !!res.length) {
                let element = res[0]
                if (element.user_id) {
                    return db.rating_summary.findOrCreate({ where: { user_id: element.user_id } }).then(resp => {
                        return resp[0].update(element);
                    }).catch(r => { });
                }
                return {}
            }
        });
    } catch (error) {
        return {}
    }
}


module.exports = {
    async addReview(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['patient_id'] = req.user.id;
            let book = {}
            if (!!data.booking_id) {
                book = await db.booking.findByPk(data.booking_id);
            }
            if (!!book && !data.doctor_id) {
                data.doctor_id = book.provider_id || null
            }
            try {
                let resp;
                if (data.id == null) resp = await db.review.create(data);
                else resp = await db.review.upsert(data);
                await calculateAvarageRating(data.doctor_id)
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
    async getPatientReviews(req, res, next) {
        db.review.findAll({ where: { patient_id: req.body.patient_id } }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })
    },
    async getDoctorReviews(req, res, next) {
        let where = { doctor_id: req.body.doctor_id, patient_id: { [Op.ne]: req.body.doctor_id } }
        let page = 1;
        let limit = 10
        if (!!req.query) {
            if (!!req.query.page) {
                page = req.query.page;
            }
            if (!!req.query.limit) {
                limit = req.query.limit;
            }
        }

        if (req.body && !!req.body.limit) {
            limit = req.body.limit;
        }
        if (req.body && !!req.body.nolimit) {
            limit = null;
        }

        let options = {
            page: page,
            paginate: limit,
            where: where,
            include: ['reviewer', 'reviewer_family_member'],
            order: [['id', 'desc']]
        }
        db.review.paginate(options).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })
    },
    async myReviewToProvider(req, res, next) {
        let where = {
            booking_id: req.body.booking_id
        }
        if (req.body.patient_id) {
            where.patient_id = req.body.patient_id
        }
        if (req.body.doctor_id) {
            where.doctor_id = req.body.doctor_id
        }
        db.review.findOne({
            where: where
        }).then(resp => {
            console.log(JSON.parse(JSON.stringify(resp)))
            res.send(resp)
        }).catch(err => {
            console.log(err)
            res.status(400).send({
                status: false,
                errors: err
            })
        })
    },
    async review(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
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