const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const moment = require('moment');
var main = async () => {
  db.invoice.findAll({
    include: [{
      model: db.user,
      as: 'from',
      attributes: ['first_name', 'middle_name', 'last_name', 'fullName'],
      include: [{
        model: db.user_role,
        as: 'user_role'
      }]
    },
    {
      model: db.user,
      as: 'to',
      include: [{
        model: db.user_role,
        as: 'user_role'
      }]
    }],
    // order: [['createdAt', 'asc']]
  },
  )
    .then(r => {
      r = JSON.parse(JSON.stringify(r))
      r.forEach(invoice => {
        if (invoice.from != null && invoice.to != null) {

          if (invoice.to.user_role.role_id != 2) {// not patient
            console.log('from( doctor ) role_id [1:doctor, 3: nurse]', invoice.from.user_role.role_id, 'to ( nurse ) role_id [2:patient]', invoice.to.user_role.role_id, invoice.createdAt, invoice.from_id, invoice.to_id)
            db.invoice.update({ from_id: invoice.to_id, to_id: invoice.from_id }, { where: { id: invoice.id } })//exchange Again
              .then(r => {
                console.log('updated ', invoice.id)
              })
          }
        }
        else {
          // console.log(`from`, invoice.from != null, invoice.to != null, invoice.from != null && invoice.to != null)
        }
      });
      // console.log(r)
    })
}
main()