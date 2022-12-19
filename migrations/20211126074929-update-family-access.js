'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('family_accesses',
      'permissions',
      {
        type: Sequelize.JSON,
        after: "permitted_to"
      });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('family_accesses', 'permissions');
  }
};