const axios = require('axios');
const API_URL = "http://www.randomtext.me/api/gibberish/p-1/"
const xml2js = require('xml2js');
const wordListJson = require('word-list-json');

module.exports.getRandomTextWeb = (words) => {
    const url = API_URL + words;
    return axios.get(url).then(result => {
        return xml2js.parseStringPromise(result.data.text_out);
    })
    .then(parsed => parsed.p);   
}

module.exports.getRandomText = (words) => {
    let string = ""
    for (i=0; i<words-1; i++) {
        string = string + getRandomWord() + " ";
    }
    string += getRandomWord();
    return string;
}

getRandomWord = () => {
    const wordIdx = Math.floor(Math.random() * wordListJson.lengths[10]);
    const word = wordListJson[wordIdx];
    return word;
    // wordListJson.words[]
}