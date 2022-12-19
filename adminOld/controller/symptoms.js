const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    async getUserSymptoms(req, res, next) {
        let where = {};
        if(req.body.user_id){
            where.user_id = req.body.user_id
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
        db.symptom_analysis.paginate(options).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })
    }
}
