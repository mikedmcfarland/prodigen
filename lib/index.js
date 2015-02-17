const Metalsmith = require('metalsmith')
const prompt     = require('cli-prompt')
const templates  = require('metalsmith-templates')
const Promise    = require('promise')
const _          = require('lodash')
const yaml       = require('js-yaml')
const debug      = require('debug')('projgen')
const swig       = require('swig')
const spawn      = require('child_process').spawn
const fs         = require('fs')

//Some useful promise oriented functions
const readFile = Promise.denodeify(fs.readFile)
const readDir  = Promise.denodeify(fs.readdir)
const exec     = Promise.denodeify(require('child_process').exec)
const getConfig = _.memoize( typeDir =>{
  return readFile(typeDir + '/config.yml')
    .then(yaml.safeLoad)
})

const templateDir = __dirname + '/../templates/'

doInitPrompts()
  .then(doMetalsmtih)
  .then(runCommandsInSeq)
  .done(console.log,console.err)

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
    const typeDir = templateDir + options.type
    Metalsmith(typeDir)
      .destination(options.destination)
      .clean(false)
      .use(prepareMetadata(typeDir))
      .use(templates({
        engine: 'swig',
        inPlace : true
      }))
      .build(err => {
        if(err) {
          reject(err)
        }
        fulfill(typeDir)
      })
  })
}

function getTemplateTypes(){
  return readDir(templateDir).then(files => {
    const withoutHidden = files.filter(n=> ! /^\./.test(n))
    if(withoutHidden.length === 0)
      throw new Error('Must be at least one template in the templates directory')

    return withoutHidden
  })
}

function runCommandsInSeq(typeDir){
  return getConfig(typeDir).then(config =>{
    const cmds = config.cmds
    if(!cmds)
      return "No commands to execute"

    const allRun = cmds.reduce(
      (a,b) => a.then(() => runCommand(b)),
      Promise.resolve())

    return allRun
  })
}

function runCommand(cmdAndArgs){

  const rendered = swig.render(cmdAndArgs,{locals:process.env})
  const [cmd, ...args] = rendered.split(' ')

  console.log('running command',cmd,'with args',args)

  return new Promise((fulfill,reject) => {
    spawn(cmd,args,{
      stdio : 'inherit',
      env : process.env
    }).on('close', code => {
      if(code ===0){
        fulfill(code)
      }else{
        reject(new Error(`'${rendered}' failed with code : ${code}`))
      }
    })
  })
}

function doPrompts(prompts){
  return new Promise((fulfill,reject)=>{
    prompts.map(p => _.isString(p) ? {key:p} : p)
    prompt.multi(prompts,fulfill)
  })
}

function prepareMetadata(typeDir){
  return (files,metalsmith,done) => {
    const assignTypeMeta = getConfig(typeDir)
      .then(config => {
        //get metadata from config and prompts
        const configured = config.metadata || {}
        const prompted = config.prompts ?
          doPrompts(config.prompts) : Promise.resolve({})

        //assign metadata to metalsmith and process.env
       const toAssign = [metalsmith.metadata(),process.env]
        return prompted.then(
          p => toAssign.forEach(
            a => _.assign(a, p, configured)))
      })

    assignTypeMeta.done(()=>done(),()=>done())
  }
}
