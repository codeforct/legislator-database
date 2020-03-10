const fsp = require('fs').promises;
const { getData } = require('./lib/data');

getData()
  .then((data) => {
    return fsp.writeFile('data/latest.json', JSON.stringify(data));
  })
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
