'use strict';
module.exports = (sequelize, DataTypes) => {
  const company_staic_page = sequelize.define('company_staic_page', {
    user_id: DataTypes.INTEGER,
    type: DataTypes.STRING,
    content: DataTypes.TEXT
  }, {});
  company_staic_page.associate = function(models) {
    // associations can be defined here
  };
  return company_staic_page;
};