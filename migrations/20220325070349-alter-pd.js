'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn(
        'coporateDisignations',
        'risk_factors',
        {
          type: Sequelize.JSON,
        }
      )
    ])
  },
  down: (queryInterface, Sequelize) => {
    // return queryInterface.dropTable('coporateDisignations');
  }
};