'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn(
        'prescription_invoices',
        'status_remark',
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