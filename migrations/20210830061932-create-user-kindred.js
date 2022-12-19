'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.createTable('user_kindreds', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        user_id: {
          type: Sequelize.INTEGER
        },
        member_id: {
          type: Sequelize.INTEGER
        },
        relation: {
          type: Sequelize.STRING
        },
        allow_access: {
          type: Sequelize.BOOLEAN
        },
        deletedAt: {
          type: Sequelize.DATE
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }),
      queryInterface.addColumn('bookings', 'booked_by', {
        type: Sequelize.INTEGER,
        after: "provider_id"
      })
    ])
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('user_kindreds');
  }
};