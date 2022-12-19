'use strict';
module.exports = (sequelize, DataTypes) => {
  const contract_track = sequelize.define('contract_track', {
    user_id: DataTypes.INTEGER,
    template_id: DataTypes.INTEGER,
    status: { type: DataTypes.INTEGER, defaultValue: 0 },
    sign: DataTypes.STRING,
    pdf_url: DataTypes.STRING,
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    subject: DataTypes.STRING,
  }, {});
  contract_track.associate = function (models) {
    contract_track.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user',
    });
    contract_track.belongsTo(models.contract_template, {
      foreignKey: 'template_id',
      as: 'template',
    });

  };
  return contract_track;
};