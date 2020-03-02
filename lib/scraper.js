const https = require("https");
const axios = require("axios");
const cheerio = require("cheerio");

const siteUrl = "https://www.cga.ct.gov/asp/content/townlist.asp";

const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

async function scrape() {
  const result = await instance.get(siteUrl);
  const $ = cheerio.load(result.data);
  const stringifyValue = function() {
    return $(this)
      .eq(0)
      .text()
      .trim();
  };
  let results = [];
  const columnHeadings = $("thead th")
    .map(stringifyValue)
    .toArray();

  const HEADERS = {
    keys: [["HOUSE", /house/i], ["TOWN", /town/i], ["SENATE", /senate/i]]
  };
  HEADERS.keys.forEach(([header, regex]) => {
    HEADERS[header] = columnHeadings.findIndex(txt => regex.exec(txt));
  });
  const { HOUSE, TOWN, SENATE } = HEADERS;

  $("tbody tr").each(function() {
    const town = $(this)
      .find("td")
      .eq(TOWN)
      .text()
      .trim();

    const house = $(this)
      .find("td")
      .eq(HOUSE)
      .find("a")
      .map(stringifyValue)
      .toArray();

    const senate = $(this)
      .find("td")
      .eq(SENATE)
      .find("a")
      .map(stringifyValue)
      .toArray();

    results.push({ town, house, senate });
  });
  return results;
}

module.exports = scrape;


