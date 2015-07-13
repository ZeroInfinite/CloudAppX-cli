#! /usr/bin/env node

var program = require('commander');
var archiver = require('archiver');
var fs = require('fs');
var request = require('request');
var path = require('path');
var Q = require('q');

var domain = 'https://90f18825.ngrok.io';
//var domain = 'http://localhost:8080';

function isValidFile (dir) {
  if (!fs.existsSync(dir) || !fs.lstatSync(dir).isFile() || path.extname(dir) !== '.zip') {
    return false;
  }
  return true;
}
function isValidDir(dir) {
  if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
    return false;
  }
  return true;
}

function main() {
  program
    .version('0.0.1')
    .usage('<input app directory>')
    .option('-z, --zipped', 'Run on zipped file')
    .option('-v, --verbose', 'Print debug info')
    .parse(process.argv);

  if (!program.args.length) {
    program.help();
  } else {
    var dir = program.args[0];
    cloudappx(dir);
  }
}

function cloudappx(dir) {
  zip(dir).then(uploadFile).then(getResult);
}

function zip(dir) {
  var deferred = Q.defer();
  if (isValidDir(dir)) {
    var outfile = dir + '.zip';
    var output = fs.createWriteStream(outfile);
    var archive = archiver('zip');
    output.on('close', function() {
      console.log(archive.pointer() + ' total byes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
      deferred.resolve(outfile);
    });
    archive.on('error', function(err) {
      deferred.reject(err);
      throw err;
    });
    archive.pipe(output);
    archive.directory(dir);
    archive.finalize();

  } else if (isValidFile(dir)) {
    console.log(dir);
    deferred.resolve(dir);
  } else {
    console.log('invalid input');
    deferred.reject();
  }
  return deferred.promise;
}

function uploadFile(file) {
  var deferred = Q.defer();
  console.log('uploading file');
  var req = request.post(domain + '/v1/upload', function (err, resp, body) {
    if (err) {
      console.log('Error!');
    } else {
      console.log('URL: ' + body);
      deferred.resolve(body);
    }
  });
  var form = req.form();
  form.append('xml', fs.createReadStream(file));
  return deferred.promise;
}

function getResult(url) {
  var deferred = Q.defer();
  var req = request.get(domain + '/' + url)
    .on('response', function(res) {
      var filename = 'package.appx';
      res.pipe(fs.createWriteStream('./' + filename));
      deferred.resolve();
    });
  return deferred.promise;
}

if (!module.parent) {
  main();
} else {
  module.exports = {
    uploadFile: uploadFile,
    getResult: getResult,
    cloudappx: cloudappx
  };
}
