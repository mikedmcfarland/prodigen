#!/usr/bin/env node

const shell = require('shelljs')
const Promise = require('promise')
const fsStat = Promise.denodeify(require('fs').stat)
const options = require('nomnom')
  .option('templatesDir',{
    abbr: 't',
    help: 'Set the templates directory, this should be an absolute path. ' +
      'this will create symlink for projgen '
  }).parse(process.argv.slice(2))

const templatesDir = options.templatesDir

if(templatesDir === undefined){
  require('./index.js')
}else{
  fsStat(templatesDir).then(function(stat) {
    if(!stat.isDirectory)
      throw new Error('expected directory path for template dir')

    const to = __dirname + "/../templates"
    shell.ln('-sf',templatesDir,to)

  })
}
