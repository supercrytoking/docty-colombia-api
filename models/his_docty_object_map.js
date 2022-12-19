'use strict';
module.exports = (sequelize, DataTypes) => {
  const his_docty_object_map = sequelize.define('his_docty_object_map', {
    his_info_id: DataTypes.INTEGER,
    function: DataTypes.STRING,
    his_endpoint: DataTypes.STRING,
    object_map: DataTypes.JSON,
    last_invocation: DataTypes.DATE,
    last_synced: DataTypes.DATE,
    error: DataTypes.JSON
  }, {});
  his_docty_object_map.associate = function(models) {
    // associations can be defined here
  };
  return his_docty_object_map;
};