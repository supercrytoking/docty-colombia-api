const { migrate } = require('./prescriptionMigrate');

migrate().then(r => process.exit()).catch(e => console.log(e))