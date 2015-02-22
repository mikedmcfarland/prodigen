const assert   = require('assert')
const requireUncached = require('require-uncached')

const fixturePath = __dirname + '/../fixtures/'
describe('utilities', ()=>{

  const settings = {templatesDir : fixturePath + 'templates/'}
  let util = requireUncached('../lib/util')
  beforeEach(()=> util.saveSettings(settings).then(
    ()=> util = requireUncached('../lib/util')))

  it('getSettings gets and parses config file',
     () => util.getSettings()
     .then(s=> assert.deepEqual(s,settings)))

  it('saveSettings saves to config file', () =>
     util.saveSettings({ templatesDir : 'saveSettings'})
     .then(util.getSettings)
     .then(({templatesDir}) => assert.equal(templatesDir,'saveSettings')))

  it('updateSettings assigns new values to config file',
     () => util.updateSettings({templatesDir:'updateSettings'})
     .then(util.getSettings)
     .then(({templatesDir}) => assert.equal(templatesDir,'updateSettings')))

  it('templateTypes gets directories in template dir (sans hidden)',
     () => util.getTemplateTypes()
     .then(types => assert.deepEqual(types,['typeA','typeB','typeC'])))

})
