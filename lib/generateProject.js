const Metalsmith = require('metalsmith')
const templates  = require('metalsmith-templates')
const Promise    = require('promise')
const _          = require('lodash')
const debug      = require('debug')('projgen')
const swig       = require('swig')
const spawn      = require('child_process').spawn

const {doPrompts,getConfig,getSettings,getMetadata,getTemplateTypes} =
  require('./util')

function generateProject(){
  return Promise.all([doInitPrompts(),getSettings()])
    .then(([p,s]) => _.merge(p,s))
    .then(doMetalsmtih)
    .then(runCommandsInSeq)
}

function doInitPrompts(){
  return getTemplateTypes().then(types => {
    return doPrompts([
      {
        key : 'destination',
        default : process.cwd()
      },
      {
        key : 'type',
        label : `project template type [${types}]`,
        default : _.first(types)
      }
    ])
  })
}

function doMetalsmtih(options){
  debug('running metal smith with options',options)
  return new Promise((fulfill,reject) => {
    const typeDir = options.templatesDir + options.type
    Metalsmith(typeDir)
      .destination(options.destination)
      .clean(false)
      .use(assignMetaData(typeDir))
      .use(templates({
        engine: 'swig',
        inPlace : true
      }))
      .use(renameFiles(typeDir))
      .build(err => {
        if(err) {
          reject(err)
        }
        fulfill(typeDir)
      })
  })
}


function runCommandsInSeq(typeDir){
  const configAndData =
    Promise.all([getConfig(typeDir),getMetadata(typeDir)])

  return configAndData.then(([config,metaData]) =>{
    const cmds = config.cmds
    if(!cmds)
      return "No commands to execute"

    const allRun = cmds.reduce(
      (a,b) => a.then(() => runCommand(b,metaData)),
      Promise.resolve())

    return allRun
  })
}

function runCommand(cmdAndArgs,metaData){

  const rendered = swig.render(cmdAndArgs,{locals:metaData})
  const [cmd, ...args] = rendered.split(' ')
  const env = _.merge({},process.env,metaData)

  return new Promise((fulfill,reject) => {

    console.log('running command',cmd,'with args',args)

    spawn(cmd,args,{
      env,
      stdio : 'inherit'
    }).on('close', code => {
      if(code === 0){
        fulfill(code)
      }else{
        reject(new Error(`'${rendered}' failed with code : ${code}`))
      }
    })
  })
}

function renameFiles(typeDir){
  return (files,metalsmith,done) => {
    const filesRenamed = getMetadata(typeDir).then(metaData => {
      const names = Object.keys(files)
      names.forEach(name=>{
        const file = files[name]
        const newName = swig.render(name,{locals: metaData })
        if(newName !== name){
          files[newName] = file
          delete files[name]
        }
      })
    })
    filesRenamed.done(()=>done(),e=>done(e))
  }
}

function assignMetaData(typeDir){
  return (files,metalsmith,done) => {
    //assign metadata to metalsmith and process.env
    const toAssign = [metalsmith.metadata(),process.env]
    const metaDataAssigned = getMetadata(typeDir).then(
      data => toAssign.forEach(
            a => _.assign(a, data)))

    metaDataAssigned.done(()=>done(),e=>done(e))
  }
}

module.exports = generateProject
