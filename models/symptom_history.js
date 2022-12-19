'use strict';
module.exports = (sequelize, DataTypes) => {
  const symptom_history = sequelize.define('symptom_history', {
    user_id: DataTypes.INTEGER,
    symptoms: DataTypes.TEXT,
    diagnosis: DataTypes.TEXT,
    result: DataTypes.TEXT
  }, {});
  symptom_history.associate = function(models) {
    // associations can be defined here
  };
  return symptom_history;
};
