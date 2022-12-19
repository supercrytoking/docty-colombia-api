
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse, responseObject } = require('../../commons/response');

module.exports = {
  getApprovalReviews: async (req, res) => {
    let data = req.params;
    db.approval_review.findAll({
      where: {
        user_id: data.user_id,
      },
      include: [
        {
          model: db.admin,
          as: 'review_manager',
          attributes: ['first_name', 'last_name', 'fullName']
        }
      ]
    }).then(resp => response(res, resp)).catch(err => errorResponse(res, err))
  }
}