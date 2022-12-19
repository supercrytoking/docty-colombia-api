'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('health_params', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      gender: {
        type: Sequelize.STRING
      },
      minAge: {
        type: Sequelize.INTEGER
      },
      maxAge: {
        type: Sequelize.INTEGER
      },
      minReading: {
        type: Sequelize.INTEGER
      },
      maxReading: {
        type: Sequelize.INTEGER
      },
      label: {
        type: Sequelize.STRING
      },
      conditions: {
        type: Sequelize.JSON
      },
      class: {
        type: Sequelize.STRING
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
    return queryInterface.dropTable('health_params');
  }
};