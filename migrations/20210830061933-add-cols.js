'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('symptom_analysis', 'added_by', {
        type: Sequelize.INTEGER,
        after: "family_id"
      }),
      queryInterface.addColumn('covid_checkers', 'added_by', {
        type: Sequelize.INTEGER,
        after: "family_member_id"
      }),
    ])
  },
  down: (queryInterface, Sequelize) => {
  }
};