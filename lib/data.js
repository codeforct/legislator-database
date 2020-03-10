const PromiseFtp = require('promise-ftp');
const csv = require('csv-parser');
const scrape = require('./scraper');
const { CACS_BY_TOWN } = require('./constants');

function now() {
  let d = new Date();
  return d.toISOString();
}

function downloadLegislatorsDatabase() {
  const ftp = new PromiseFtp();
  const results = [];

  return ftp
    .connect({
      host: 'ftp.cga.ct.gov',
      connTimeout: 60000,
      pasvTimeout: 60000
    })
    .then(function(serverMessage) {
      return ftp.get('/pub/data/LegislatorDatabase.csv');
    })
    .then(function(stream) {
      return new Promise(function(resolve, reject) {
        stream.once('error', reject);
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .once('end', () => resolve(results));
      });
    })
    .then(() => ftp.end())
    .then(() => results);
}

async function getLegislators() {
  let rows = await downloadLegislatorsDatabase();
  let normalizedRows = [];

  for (let row of rows) {
    let normalizedRow = {};
    for (let key of Object.keys(row)) {
      let normalizedKey = key
        .replace(/ /g, '_')
        .replace('/', '_')
        .toLowerCase();
      normalizedRow[normalizedKey] = row[key];
    }
    normalizedRows.push(normalizedRow);
  }

  return normalizedRows;
}

async function getDistrictsByTown() {
  let results = await scrape();
  let rows = [];

  let getDistrictNumber = (str) => str.match(/[0-9]+/)[0].padStart(3, '0');

  let getRepresentative = (rep) => {
    let name = rep.replace('Rep. ', '').replace(' of the', '');
    let parts = name.split(' ');
    let district = parts[parts.length - 1];
    let lastName = name.replace(district, '').trim();

    return {
      type: 'representative',
      lastName: lastName,
      district: getDistrictNumber(district)
    };
  };

  let getSenator = (sen) => {
    let name = sen.replace('Senator ', '').replace(' of the', '');
    let parts = name.split(' ');
    let district = parts[parts.length - 1];
    let lastName = name.replace(district, '').trim();

    return {
      type: 'senator',
      lastName: lastName,
      district: getDistrictNumber(district)
    };
  };

  for (let result of results) {
    let townCac = CACS_BY_TOWN[result.town.toLowerCase()] || null;
    for (let rep of result.house) {
      rows.push({
        town: result.town,
        cac: townCac,
        ...getRepresentative(rep)
      });
    }

    for (let sen of result.senate) {
      rows.push({
        town: result.town,
        cac: townCac,
        ...getSenator(sen)
      });
    }
  }

  return rows;
}

async function getData() {
  let legislators = await getLegislators();
  let townReps = await getDistrictsByTown();
  let townRepsWithCacs = townReps.filter((townRep) => townRep.cac);

  let data = [];

  for (let townRep of townRepsWithCacs) {
    let designatorCode = townRep.type === 'senator' ? 'S' : 'R';
    let townRepLegislator = legislators.find((legislator) => {
      return (
        legislator.dist === townRep.district &&
        legislator.designator_code === designatorCode &&
        townRep.lastName === legislator.last_name
      );
    });

    if (townRepLegislator) {
      data.push(
        Object.assign({}, townRepLegislator, {
          _town: townRep.town,
          _cac: townRep.cac,
          _type: townRep.type,
          _lastName: townRep.lastName,
          _district: townRep.district
        })
      );
    }
  }

  return { date: now(), data };
}

module.exports = {
  getData,
  getDistrictsByTown,
  getLegislators
};
