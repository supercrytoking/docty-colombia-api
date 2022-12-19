'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn(
        'customers',
        'tags',
        {
          type: Sequelize.JSON,
        }
      )
    ])
  },
  down: (queryInterface, Sequelize) => {

  }
};