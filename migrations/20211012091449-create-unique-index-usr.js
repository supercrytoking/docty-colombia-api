'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query(`SELECT national_id, COUNT(id) ct FROM users
     
      GROUP BY national_id
      HAVING ct > 1
      ORDER BY ct DESC`
      ).then(res => {
        let nid = res[0].map(e => `'${e.national_id}'`);
        if (nid.length) {
          let sq = `update users set national_id = CONCAT(national_id,'_',id) where national_id in (${nid})`
          console.log(sq)
          return queryInterface.sequelize.query(sq).catch(e => { })
        }
        return;
      })
    } catch (error) {
      console.log(error)
    }
    return queryInterface.addConstraint('users', ['national_id'], {
      type: 'unique',
      name: 'uq_ntlid'
    });
  },
  down: (queryInterface, Sequelize) => {
    // return queryInterface.dropTable('refunds');
  }
};