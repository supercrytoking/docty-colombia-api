'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn(
        'customers',
        'family_access',
        {
          type: Sequelize.BOOLEAN,
        }
      )
    ])
  },
  down: (queryInterface, Sequelize) => {

  }
};