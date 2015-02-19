const Promise    = require('promise')
const prompt     = require('cli-prompt')
const _          = require('lodash')
const yaml       = require('js-yaml')
const fs         = require('fs')
const readFile = Promise.denodeify(fs.readFile)
const readDir  = Promise.denodeify(fs.readdir)

const settingsPath = __dirname + '/../settings.yml'

const getConfig = _.memoize(
  typeDir => readFile(typeDir + '/config.yml')
    .then(yaml.safeLoad))

const getMetadata = _.memoize(
  typeDir => getConfig(typeDir)
    .then(config => {
      //get metadata from config and prompts
      const configured = config.metadata || {}
      const prompted = config.prompts ?
        doPrompts(config.prompts) : Promise.resolve({})

      return prompted.then(
        p => _.assign({},configured,p))
    }))

const getSettings = _.memoize(
  () => readFile(settingsPath)
    .then(yaml.safeLoad))

const getTemplateTypes = _.memoize(
  () => getSettings()
    .then(({templateDir})=>readDir(templateDir))
    .then(files => {
      const withoutHidden = files.filter(n=> ! /^\./.test(n))
      if(withoutHidden.length === 0)
        throw new Error('Must be at least one template in the templates directory')

      return withoutHidden
    }))

function doPrompts(prompts){
  return new Promise((fulfill,reject)=>{
    prompts.map(p => _.isString(p) ? {key:p} : p)
    prompt.multi(prompts,fulfill)
  })
}

function saveSettings(value){
  return new Promise((fulfill,reject) => {
    const content = yaml.safeDump(value)
    fs.writeFile(settingsPath,content,error => {
      if(error){
        reject(error)
      }
      fulfill(content)
    })
  })
}

function updateSettings(assignment){
  return getSettings()
    .then(s => _.assign(s,assignment))
    .then(saveSettings)
}

module.exports = {
  getConfig,
  getSettings,
  getMetadata,
  getTemplateTypes,
  saveSettings,
  updateSettings,
  doPrompts}
