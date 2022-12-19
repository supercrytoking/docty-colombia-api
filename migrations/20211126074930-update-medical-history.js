'use strict';

const { Promise } = require("bluebird");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('user_medical_histories',
        'device_id',
        {
          type: Sequelize.STRING,
          after: "reference_id"
        }),
      queryInterface.addColumn('user_medical_histories',
        'device_type',
        {
          type: Sequelize.STRING,
          defaultValue: 'Manual',
          after: "device_id"
        }),
      queryInterface.addColumn('user_medical_histories',
        'device_macAddress',
        {
          type: Sequelize.STRING,
          after: "device_type"
        }),
    ]);
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('user_medical_histories', 'device_id'),
      queryInterface.removeColumn('user_medical_histories', 'device_type'),
      queryInterface.removeColumn('user_medical_histories', 'device_macAddress'),

    ]);
  }
};