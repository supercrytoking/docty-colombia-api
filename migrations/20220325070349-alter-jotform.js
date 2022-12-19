'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn(
        'jotforms',
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