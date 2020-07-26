const fsp = require('fs').promises;
const axios = require('axios');

axios.get('https://legislator-database-api.glitch.me')
  .then(({ data }) => {
    return fsp.writeFile('data/latest.json', JSON.stringify(data));
  })
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
