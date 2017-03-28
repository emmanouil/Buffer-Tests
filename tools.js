//imports
var path = require("path"),
    fs = require("fs");

//exports
//file methods
exports.append = append;
exports.appendJSON = appendJSON;
exports.read = read;
exports.readJSON = readJSON;
exports.write = write;
exports.writeJSON = writeJSON;
//other helper
exports.findIndexByProperty = findIndexByProperty;

function append(filename, data) {
    fs.appendFileSync(filename, data, { encoding: null, flags: 'a' });
}

function appendJSON(filename, data) {
    fs.appendFileSync(filename, JSON.stringify(data), { encoding: null, flags: 'a' });
}
/**
 * Returns -1 if index not found
 * @param {Array} array to find the property value in
 * @param {String} obj_attr property name
 * @param {Variable} obj_value property value
 */
function findIndexByProperty(array, obj_attr, obj_value){
    for(var i = 0; i < array.length; i++) {
        if(array[i][obj_attr] === obj_value) {
            return i;
        }
    }
    return -1;
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

function write(filename, data) {
    fs.writeFileSync(filename, data, { encoding: null, flags: 'w' });
}

function writeJSON(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data), { encoding: null, flags: 'w' });
}