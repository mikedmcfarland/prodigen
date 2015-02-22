#!/usr/bin/env node
const Promise         = require('promise')
const fsStat          = Promise.denodeify(require('fs').stat)
const generateProject = require('./generateProject')
const nomnom          = require('nomnom')
const updateSettings  = require('./util').updateSettings
const _               = require('lodash')

main()

function main(){
  const options = nomnom.option('templatesDir',{
    abbr : 't',
    help : 'Set the templates directory, this should be an absolute path. '
  }).parse(process.argv.slice(2))

  const templatesDir = options.templatesDir

  if(templatesDir === undefined){
    doProjectGeneration()
  }else{
    setTemplatesDir(templatesDir)
  }
}

function doProjectGeneration(){
  generateProject()
    .done(console.log,handleError)
}

function setTemplatesDir(templatesDir){
  fsStat(templatesDir)
    .then(stat  => {
      if(!stat.isDirectory)
        throw new Error('expected directory path for template dir')

      return updateSettings({templatesDir})
    })
    .done(console.log,handleError)
}

function handleError(e){
  //TODO: this is kinda hacky, we should really throw better errors
  //at the areas that are more aware of what failed.
  if(e.code === 'ENOENT'){
    if(_.endsWith(e.path,'src')){
      console.log('error reading config file, does the template contain one?')
    }else{
      console.log('error settings file, has a template directory been set?')
      console.log('run projgen --help for help')
    }
  }
  console.log('error', e)
}
