'use strict';
module.exports = (sequelize, DataTypes) => {
  const favorit_procedure = sequelize.define('favorit_procedure', {
    user_id: DataTypes.INTEGER,
    procedure_id: DataTypes.INTEGER
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  favorit_procedure.associate = function (models) {
    // associations can be defined here
  };
  return favorit_procedure;
};