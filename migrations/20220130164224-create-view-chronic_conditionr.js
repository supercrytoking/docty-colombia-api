'use strict';
module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.sequelize.query(`CREATE OR REPLACE VIEW recent_cronic_condition_view AS
            SELECT
              user_medical_histories.user_id AS user_id,
              CAST(CONCAT('[',GROUP_CONCAT(DISTINCT JSON_EXTRACT(user_medical_histories.response,'$.cronic_condition') SEPARATOR ','),']') AS JSON) AS response,
              user_medical_histories.dated   AS dated
            FROM user_medical_histories
            WHERE ((user_medical_histories.class = 'cronic_condition')
                   AND (user_medical_histories.status = TRUE))
            GROUP BY user_medical_histories.user_id`)
        ])
    },
    down: (queryInterface, Sequelize) => {
        return Promise.resolve()
    }
};