const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    async associate(req, res, next) {
        let data = req.body || {};
        db.clinic_corporate_association.findOrCreate({
            where: { clinic_id: data.clinic_id, corporate_id: data.corporate_id }
        }).then(async(r) => {
            await r[0].update({ associated: true, synced: false });
            return res.send({ status: true, message: "data will be synced in 30 min" })
        }).catch(e => {
            res.status(500).send({ status: false, error: e })
        })
    }
};