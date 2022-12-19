'use strict';
module.exports = (sequelize, DataTypes) => {
  const counselling_document = sequelize.define('counselling_document', {
    cid:DataTypes.INTEGER,
    title: DataTypes.STRING,
    type: DataTypes.STRING,
    file: DataTypes.STRING
  }, {});
  counselling_document.associate = function(models) {
    counselling_document.belongsTo(models.councelling, {
      foreignKey: 'cid',
      as: 'counselling_id'
    });
  };
  return counselling_document;
};