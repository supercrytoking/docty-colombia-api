'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('medical_requests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      patient_id: {
        type: Sequelize.INTEGER
      },
      clinic_id: {
        type: Sequelize.INTEGER
      },
      corporate_id: {
        type: Sequelize.INTEGER
      },
      medical_type: {
        type: Sequelize.STRING
      },
      certificate_type: {
        type: Sequelize.STRING
      },
      last_date: {
        type: Sequelize.DATE
      },
      remark: {
        type: Sequelize.TEXT
      },
      priority: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.BOOLEAN
      },
      meta: {
        type: Sequelize.JSON
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('medical_requests');
  }
};