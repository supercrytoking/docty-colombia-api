'use strict';
module.exports = (sequelize, DataTypes) => {
  const counselling_type = sequelize.define('counselling_type', {
    title: DataTypes.STRING,
    details: DataTypes.TEXT,
    symbol: DataTypes.TEXT,
    status: DataTypes.STRING,
    slug: DataTypes.STRING,
    deleted_at: {
      type:DataTypes.DATE,
      allowNull:true
    }
  }, {});
  counselling_type.associate = function(models) {
    // associations can be defined here
  };
  return counselling_type;
};