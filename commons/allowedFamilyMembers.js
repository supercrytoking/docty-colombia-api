const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    allowedFamilyMembers: async (userId, permission) => {
        let sql = `SELECT uk.user_id,uk.allow_access,fa.user_id uid,fa.permitted_to,
                    JSON_EXTRACT(permissions,'$.${permission}') permitted,
                    IF(uk.member_id = ${userId}, uk.user_id,uk.member_id) member_id
                    FROM user_kindreds uk
                    LEFT JOIN family_accesses fa ON IF(uk.user_id = ${userId}, uk.member_id = fa.user_id, uk.user_id = fa.user_id ) AND permitted_to = ${userId}
                    WHERE (uk.user_id = ${userId} OR uk.member_id = ${userId})
                    AND (allow_access IS NULL OR allow_access = 0 OR JSON_EXTRACT(permissions,'$.${permission}') = TRUE)`;
        return db.sequelize.query(sql)
            .spread((res, m) => res.map(e => e.member_id)).catch(e => []);
    }
};