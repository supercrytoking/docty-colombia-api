const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    getType: async (req, res, next) => {
        let query = `SELECT cts.id, cts.consultation_type_id, cts.name, 
        ct.type_code, cts.description, cts.price, cts.unit, cts.title 
        FROM consultation_types ct, consultation_type_details cts 
        WHERE cts.type_code = ct.type_code AND cts.language = '${req.lang}'`
        db.sequelize.query(query).spread((resp, meta) => {
            res.send(resp)
        }).catch(err => {
            res.status({
                status: 400, errors: `${err}`
            })
        })
    }
}