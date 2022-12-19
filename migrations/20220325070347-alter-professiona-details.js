'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn(
        'professional_details',
        'skills',
        {
          type: Sequelize.JSON,
        }
      ),
      queryInterface.addColumn(
        'professional_details',
        'manager',
        {
          type: Sequelize.INTEGER,
        }
      ),
      queryInterface.changeColumn(
        'professional_details',
        'designation',
        {
          type: Sequelize.INTEGER,
        }
      ),
      queryInterface.removeColumn(
        'professional_details',
        'company'
      ),
    ])
  },
  down: (queryInterface, Sequelize) => {
    // return queryInterface.dropTable('coporateDisignations');
  }
};