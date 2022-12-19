'use strict';

const { Promise } = require("bluebird");

module.exports = {
	up: (queryInterface, Sequelize) => {
		return Promise.all([
			queryInterface.addColumn('email_conversations',
				'reference',
				{
					type: Sequelize.STRING,
					after: "attachment"
				}),
			queryInterface.addColumn('email_conversations',
				'identifier',
				{
					type: Sequelize.STRING,
					after: "reference"
				})
		]);
	},
	down: (queryInterface, Sequelize) => {
		return Promise.all([
			queryInterface.removeColumn('email_conversations', 'reference'),
			queryInterface.removeColumn('email_conversations', 'identifier')
		]);
	}
};