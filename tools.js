//imports
var path = require("path"),
    fs = require("fs");

//exports
exports.write = write;
exports.append = append;
exports.read = read;
exports.readJSON = readJSON;



function write(filename, data) {
    fs.writeFileSync(filename, data, { encoding: null, flags: 'w' });
}

function append(filename, data) {
    fs.appendFileSync(filename, data, { encoding: null, flags: 'a' });
}

function read(filename){
    var ex = fs.existsSync(filename);
    if(!ex){
        console.log('[ERROR] File '+filename+' not found');
        return null;
    }
    return fs.readFileSync(filename, 'utf8');
}

function readJSON(filename){
    return JSON.parse(read(filename));
}