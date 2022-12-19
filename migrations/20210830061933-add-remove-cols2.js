'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('associates', 'inNetworks', {
        type: Sequelize.BOOLEAN, defaultValue: false
      }),
      queryInterface.removeColumn('users', 'associate_type'),
      queryInterface.removeColumn('users', 'yearly_income'),
      queryInterface.removeColumn('users', 'profession_id'),
      queryInterface.removeColumn('users', 'education_id'),
    ])
  },
  down: (queryInterface, Sequelize) => {
  }
};