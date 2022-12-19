const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    verifyFamilyMember: async (req, user_id, operator) => {
        if (+user_id !== +operator && req.user.role == 1) {
            let book = await db.booking.findOne({
                where: {
                    provider_id: operator,
                    patient_id: user_id,
                    status: { [Op.in]: [1, 5] }
                }
            })
            return !!book
        }
        if (+user_id !== +operator && req.user.role == 5) {
            let sql = `SELECT * FROM customers c
                           left JOIN user_kindreds uk ON uk.user_id = c.customer
                            WHERE (c.user_id = ${operator} OR uk.user_id = ${operator})
                            AND uk.deletedAt IS NULL
                            AND (uk.member_id = ${user_id} OR c.customer = ${user_id})`;
            console.log(sql)
            let c = await db.sequelize.query(sql).spread((r, m) => r[0]);
            return !!c
        }
        if (+user_id !== +operator && req.user.role == 2) {
            let sql = `SELECT * FROM user_kindreds WHERE member_id = ${user_id} AND user_id = ${operator}`;
            let c = await db.sequelize.query(sql).spread((r, m) => r[0]);
            return !!c
        }
        return true
    }
};