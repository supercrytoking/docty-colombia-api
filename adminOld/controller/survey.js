const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    async addSurvey(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.survey.upsert(data);
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
    },
    async getSurveys(req, res, next) {
        let where = {};
        if(req.body.title){
            where.title = {
                [Op.like]: '%' + req.body.title + '%'
            }
        }

        let page = 1;
        let order = [];
        if(req.query && req.query.page){
            page = req.query.page
        }else if(req.body.page){
            page = req.body.page
        }
        if(req.query && req.query.order){
            order.push(req.query.order);
        }else if(req.body.order){
            order.push(req.body.order);
        }
        if(req.query && req.query.order_by){
            order.push(req.query.order_by);
        }else if(req.body.order_by){
            order.push(req.body.order_by);
        }

        let options = {
                page: page,
                paginate: 25,
                order: order,
                where: where
            }
        db.survey.paginate(options).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })
    },
    async addResponse(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                let resp = await db.survey_response.upsert(data);
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
    async getUserResponses(req, res, next) {
        if (req.body.user_id) {
            db.survey_response.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
    },
    async getSurveyResponses(req, res, next) {
        if (req.body.survey_id) {
            db.survey_response.findAll({ where: { survey_id: req.body.survey_id } }).then(resp => {
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
    },
    async getUserSurveyResponse(req, res, next) {
        if (req.body.user_id && req.body.survey_id) {
            db.survey_response.findAll({ where: { user_id: req.body.user_id, survey_id: req.body.survey_id } }).then(resp => {
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
    },
    async response(req, res, next) {
        if (req.body.id) {
            db.survey_response.findByPk(req.body.id).then(resp => {
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
