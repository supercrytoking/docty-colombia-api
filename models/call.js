'use strict';
module.exports = (sequelize, DataTypes) => {
  const call = sequelize.define('call', {
    call_id:DataTypes.STRING,
    caller_id: DataTypes.INTEGER,
    receiver_id: DataTypes.INTEGER,
    cid: DataTypes.INTEGER,
    type: DataTypes.STRING,
    from: DataTypes.DATE,
    to: DataTypes.DATE
  }, {
    timestamps: false,
    defaultScope: {
      include: ['mood'],
    },
  });
  call.associate = function(models) {
    call.belongsTo(models.user, {
      foreignKey: 'receiver_id',
      as: 'receiver'
    });
    call.belongsTo(models.user, {
      foreignKey: 'caller_id',
      as: 'caller'
    });
    call.belongsTo(models.user_mood, {
      foreignKey: 'call_id',
      targetKey: 'call_id',
      as: 'mood'
    });
  };
  return call;
};