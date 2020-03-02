const { getData } = require('./lib/data');

getData()
  .then((data) => {
    console.log(JSON.stringify(data));
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
