'use strict';

const db = require('../../models');
module.exports = {
  auth: async (req, res, next) => {
    try {
      const token = req.headers.apikey;;
      let user = await db.apiKey.findOne({ where: { apiKey: token } });
      if (!!user) {
        req.user = { id: user.user_id };
        return next();
      } else {
        return res.sendStatus(406);
      }
    } catch (error) {
      // console.log(error)
      return res.sendStatus(406);
    }
  },
  queryEssentialString(page = 1, limit = 25, offset = 0, orderby = 'createdAt', order = "asc") {
    if (!!!page) page = 1;
    if (!!!limit) limit = 25;
    offset = (page - 1) * limit;
    if (offset < 0) offset = 0;
    return `ORDER BY ${orderby} ${order} 
    LIMIT ${offset}, ${limit}`;
  }
}