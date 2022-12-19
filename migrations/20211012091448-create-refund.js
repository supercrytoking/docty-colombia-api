'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('refunds', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      booking_id: {
        type: Sequelize.INTEGER
      },
      proofDoc: {
        type: Sequelize.STRING
      },
      notes: {
        type: Sequelize.STRING
      },
      refundBY: {
        type: Sequelize.INTEGER
      },
      refundByAdmin: {
        type: Sequelize.INTEGER
      },
      extras: {
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
    return queryInterface.dropTable('refunds');
  }
};