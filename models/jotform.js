'use strict';
module.exports = (sequelize, DataTypes) => {
  const jotform = sequelize.define('jotform', {
    user_id: DataTypes.INTEGER,
    added_by: DataTypes.INTEGER,
    family_id: DataTypes.INTEGER,
    data: DataTypes.JSON,
    formID: DataTypes.STRING,
    submissionID: DataTypes.STRING,
    consultationId: DataTypes.STRING,
    pdfPath: DataTypes.STRING,
    type: DataTypes.STRING
  }, {});
  jotform.associate = function (models) {
    // associations can be defined here
  };
  return jotform;
};