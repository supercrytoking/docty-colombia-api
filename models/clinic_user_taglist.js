'use strict';
module.exports = (sequelize, DataTypes) => {
  const clinic_user_taglist = sequelize.define('clinic_user_taglist', {
    clinic_id: DataTypes.INTEGER,
    tags: DataTypes.JSON
  }, {});
  clinic_user_taglist.associate = function(models) {
    // associations can be defined here
  };
  return clinic_user_taglist;
};