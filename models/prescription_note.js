'use strict';
module.exports = (sequelize, DataTypes) => {
  const prescription_note = sequelize.define('prescription_note', {
    default_note: DataTypes.STRING,
    multipleoptions_note: DataTypes.JSON,
    singleoption_note: DataTypes.JSON,
    dynamicnote: DataTypes.JSON,
    reference_id: DataTypes.STRING
  }, {});
  prescription_note.associate = function(models) {
    // associations can be defined here
  };
  return prescription_note;
};