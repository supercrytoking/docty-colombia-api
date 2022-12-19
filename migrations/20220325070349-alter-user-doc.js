'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn(
        'user_documents',
        'type',
        {
          type: Sequelize.STRING,
        }
      )
    ])
  },
  down: (queryInterface, Sequelize) => {
    // return queryInterface.dropTable('coporateDisignations');
  }
};