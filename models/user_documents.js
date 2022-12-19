'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_documents = sequelize.define('user_document', {
    title: DataTypes.STRING,
    user_id: DataTypes.INTEGER,
    document_serial: DataTypes.STRING,
    document_path: DataTypes.STRING,
    type: DataTypes.STRING,
    remark: DataTypes.TEXT,
    issued_at: DataTypes.DATE,
    expire_at: DataTypes.DATE,
    visible: DataTypes.BOOLEAN,
    family_id: { type: DataTypes.INTEGER, defaultValue: 0 },
    addedBy: DataTypes.INTEGER,
    added_by_admin: DataTypes.INTEGER
  }, {
    defaultSope: {
      where: { family_id: 0 },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    }
  });
  user_documents.associate = function (models) {
    user_documents.belongsTo(models.user, {
      foreignKey: 'addedBy',
      as: 'addedByUser'
    });
    user_documents.belongsTo(models.admin, {
      foreignKey: 'added_by_admin',
      as: 'added_by_admin_user'
    });
  };
  return user_documents;
};