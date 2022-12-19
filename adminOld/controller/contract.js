const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    async addContract(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.contract.upsert(data);
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
    async getContracts(req, res, next) {
        let where = {};
        if(req.body.title){
            where.title = {
                [Op.like]: '%' + req.body.title + '%'
            }
        }
        if (req.body.type) {
            where.type = req.body.type
        }
        if (req.body.status) {
            where.status = req.body.status
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
        db.contract.paginate(options).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            })
        })
    },
    async addUserContract(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                let resp = await db.user_contract.upsert(data);
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
    async getUserContracts(req, res, next) {
        if (req.body.user_id) {
            db.user_contract.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
    async getContractUsers(req, res, next) {
        if (req.body.contract_id) {
            db.user_contract.findAll({ where: { contract_id: req.body.contract_id } }).then(resp => {
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
    async getUserContractRow(req, res, next) {
        if (req.body.user_id && req.body.contract_id) {
            db.user_contract.findAll({ where: { user_id: req.body.user_id, contract_id: req.body.contract_id } }).then(resp => {
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
    async contract(req, res, next) {
        if (req.body.id) {
            db.user_contract.findByPk(req.body.id).then(resp => {
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
