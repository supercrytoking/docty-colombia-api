'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return Promise.all([
			queryInterface.sequelize.query(`CREATE or REPLACE view clinic_user_family_view as 
			SELECT uk.member_id patient,uk.user_id parent,c.user_id clinic, c.family_access FROM user_kindreds uk
			JOIN customers c ON c.customer = uk.user_id
			WHERE family_access = 1
			UNION
			SELECT customers.customer patient, customers.customer parent, customers.user_id clinic, family_access FROM customers
			ORDER BY parent;`)
		])
	},
	down: (queryInterface, Sequelize) => {
		return Promise.resolve()
	}
};