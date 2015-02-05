const Metalsmith = require('metalsmith')
const prompt = require('cli-prompt')
const templates = require('metalsmith-templates')
const Promise = require('promise')
const _ = require('lodash')
const yaml = require('js-yaml')
const debug = require('debug')('project-scaffolder')

//Some useful promise oriented functions
const readFile = Promise.denodeify(require('fs').readFile)
const exec = Promise.denodeify(require('child_process').exec)
const getConfig = _.memoize( typeDir =>{
  return readFile(typeDir + '/config.yml')
    .then(yaml.safeLoad)
})

doInitPrompts()
  .then(doMetalsmtih)
  .then(runCommandsInSeq)
  .done(console.log,console.err)

function doInitPrompts(){
  return doPrompts([
    {
      key : 'destination',
      default : process.cwd()
    },
    {
      key : 'type',
      label : 'project type [node]',
      default : 'node'
    }
  ])
}

function doMetalsmtih(options){
  debug('running metal smith with options',options)
  return new Promise((fulfill,reject) => {
    const typeDir = __dirname + '/type/' + options.type
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
        console.log('build',err)
          reject(err)
        }
        fulfill(typeDir)
      })
  })
}

function runCommandsInSeq(typeDir){
  return getConfig(typeDir).then(config =>{
    const cmds = config.cmds
    if(!cmds)
      return "No commands to execute"

    const allRun = cmds.reduce(
      (a,b) => a.then(vA => exec(b).then(vB => vA + '\n' + vB)),
      Promise.resolve("Executing commands"))

    return allRun
  })
}

function doPrompts(prompts){
  return new Promise((fulfill,reject)=>{
    prompts.map(p => _.isString(p) ? {key:p} : p)
    prompt.multi(prompts,fulfill)
  })
}

function runCommandsInSeq2(cmds,acc,done) {
  var next = cmds.shift()
  if(next === undefined){
    done(undefined,acc)
  }
  else{
    process.exec(next,(err,stdout,stderr) => {
      if(err){
        done(err,stderr)
      }else{
        acc += stdout
        runCommandsInSeq2(cmds,acc,done)
      }
    })
  }
}

function prepareMetadata(typeDir){
  return (files,metalsmith,done) => {
    const assignTypeMeta = getConfig(typeDir)
      .then(config => {
        const configured = config.metadata | {}
        const prompted = config.prompts ?
          doPrompts(config.prompts) : Promise.resolve({})

        return prompted.then(p => _.assign(
          metalsmith.metadata(),
          p,
          configured))
      })

    assignTypeMeta.done(()=>done(),()=>done())
  }
}
