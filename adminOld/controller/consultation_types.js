const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    setType: async (req, res, next) => {
        // await db.consultation_type.update({name:req.body.name},{where:{id:req.body.consultation_type_id}});
        db.consultation_type_detail.upsert(req.body).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send(err);
        })
    },
    getConsultationtype: async (req, res, next) => {
        var lang = req.lang || 'en'
        let query = `SELECT cts.id, cts.consultation_type_id, cts.name, cts.language,
        ct.type_code, cts.description, cts.price, cts.unit, cts.title 
        FROM consultation_types ct, consultation_type_details cts 
        WHERE cts.type_code = ct.type_code AND cts.language = '${lang}'`
        db.sequelize.query(query).spread((resp, meta) => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send(err);
        })
    },
    getConsultationtypeDetails: async (req, res, next) => {
        db.consultation_type.fildOne({ type_code: req.body.type_code, language: req.body.language }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send(err);
        })
    }
}