'use strict';

const { Promise } = require("bluebird");

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('customers',
                'type', {
                    type: Sequelize.STRING
                }),
            queryInterface.addColumn('health_advisors',
                'type', {
                    type: Sequelize.STRING
                })
        ]);
    },
    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('health_advisors', 'type'),
            queryInterface.removeColumn('customers', 'type')
        ]);
    }
};