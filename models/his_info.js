'use strict';
const status = {
  pending: 0, running: 1, complete: 2, failed: 3,
  "0": "pending", "1": "running", "2": "complete", "3": "failed"
}
module.exports = (sequelize, DataTypes) => {
  const his_info = sequelize.define('his_info', {
    user_id: DataTypes.INTEGER,
    his_name: DataTypes.STRING,
    base_url: DataTypes.STRING,
    headers: DataTypes.JSON,
    query_params: DataTypes.STRING,
    last_synced: DataTypes.DATE,
    finishedAt: DataTypes.DATE,
    status: {
      type: DataTypes.INTEGER,
      get() {
        let v = this.getDataValue('status');
        return (status[v] || null)
      },
      set(value) {
        if (typeof value !== 'number') {
          let v = (value || 'pending').toLowerCase();
          let v1 = status[v] || 0;
          this.setDataValue('status', v1);
        }
      }
    },
    errors: DataTypes.JSON
  }, {});
  his_info.associate = function (models) {
    // associations can be defined here
  };
  return his_info;
};