'use strict';

const { Promise } = require("bluebird");

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('covid_checkers',
                'symptom_status', {
                    type: Sequelize.JSON,
                }),
            queryInterface.addColumn('covid_checkers',
                'changed_user_id', {
                    type: Sequelize.INTEGER,
                }),
            queryInterface.addColumn('covid_checkers',
                'changed_admin_id', {
                    type: Sequelize.INTEGER,
                }),
            queryInterface.addColumn('covid_checkers',
                'booking_id', {
                    type: Sequelize.INTEGER,
                }),
            queryInterface.addColumn('bookings',
                'covid_id', {
                    type: Sequelize.INTEGER,
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