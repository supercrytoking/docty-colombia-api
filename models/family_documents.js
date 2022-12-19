'use strict';
module.exports = (sequelize, DataTypes) => {
  const family_documents = sequelize.define('family_document', {
    title: DataTypes.STRING,
    user_id: DataTypes.INTEGER,
    family_id: DataTypes.INTEGER,
    document_serial: DataTypes.STRING,
    document_path: DataTypes.STRING,
    issued_at: DataTypes.DATE,
    expire_at: DataTypes.DATE,
  }, {});
  family_documents.associate = function(models) {
    // associations can be defined here
  };
  return family_documents;
};