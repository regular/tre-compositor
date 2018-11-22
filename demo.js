const {client} = require('tre-client')
const Compositor = require('.')
const h = require('mutant/html-element')
const MutantDict = require('mutant/dict')
const setStyle = require('module-styles')('tre-compositor-demo')
const Importer = require('tre-file-importer')

setStyle(`
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
  }
  body {
    background: #999;
    --tre-selection-color: green;
    --tre-secondary-selection-color: yellow;
  }
  .pane {
    background: #888;
  }
  .tre-compositor {
    height: 100%;
  }
  .tre-finder {
    font-family: sans-serif;
    font-size: 12pt;
  }
  .tre-finder .summary select {
    font-size: 9pt;
    background: transparent;
    border: none;
    width: 50px;
  }
  .tre-finder ul {
    margin-top: 0;
    margin-bottom: 0;
  }
  .tre-finder li {
    padding-top: .2em;
    padding-bottom: 0;
  }
  .tre-folders {
    background-color: #777;
  }
  .tre-transforms-pane {
    font-size: 9pt;
    background: #aaa;
    max-width: 200px;
  }
  .tre-folders .tile {
    border: 1px solid #444;
    background: #666;
  }
  .tre-folders .tile > .name {
    font-size: 9pt;
    background: #444;
    color: #aaa;
  }
`)

function Drafts() {
  const dicts = {}
  return {
    get: k => {
      if (dicts[k]) return dicts[k]
      return dicts[k] = MutantDict()
    }
  }
}

function renderDefaultTile(kv, ctx) {
  const c = kv.value && kv.value.content
  const {type} = c
  return h('div', {
    style: {
      color: 'white',
    }
  }, type)
}

function RenderStack(opts, defaultRender) {
  const renderers = []
  const {drafts} = opts

  function render(kv, ctx) {
    const dict = drafts ? drafts.get(kv.key) : null;
    const newCtx = Object.assign({dict}, opts, ctx)
    let el
    renderers.find( r => el = r(kv, newCtx))
    if (!el) el = defaultRender(kv, newCtx)
    console.log('render stack returns', el)
    return el
  }
  const self = {
    render,
    use: renderer => {
      renderers.push(renderer)
      return self
    }
  }
  return self
}

function Factory(opts) {
  const factories = {}
  const self = {
    use: function(module) {
      const f = module.factory(opts)
      factories[f.type] = f
      return self
    },
    menu: function(lang) {
      lang = lang || 'en'
      return Object.keys(factories).map( k=>{
        const {i18n, type} = factories[k]
        const label = i18n[lang] || i18n.en || Object.values(i18n)[0]
        return {label, type}
      })
    },
    make: function(type) {
      return factories[type].content()
    }
  }
  return self
}

client( (err, ssb, config) => {
  console.log('tre config', config.tre)
  if (err) return console.error(err)

  const importer = Importer(ssb)
  importer.use(require('tre-fonts'))
  importer.use(require('tre-images'))

  const factory = Factory()
    .use(require('tre-transforms'))
    .use(require('tre-folders'))
  
  const drafts = Drafts()

  const renderTile = RenderStack({
    where: 'tile',
    drafts
  }, renderDefaultTile)
    .use(require('tre-fonts')(ssb))
    .use(require('tre-images')(ssb))
    .render

  const renderEditor = RenderStack({
    where: 'editor',
    drafts
  }, kv => h('div', 'no editor') )
    .use(require('tre-folders')(ssb, {
      renderTile
    }))
    //.use(require('tre-fonts')(ssb))
    //.use(require('tre-images')(ssb))
    .use(require('tre-transforms')(ssb))
    .render

  const _renderOnStage = RenderStack({
    where: 'stage',
    drafts
  }, kv => h('div', 'RenderStack: no stage renderer found.') )
    .use(require('tre-transforms')(ssb, {renderOnStage}))
    .use(require('tre-images')(ssb))
    .render

  function renderOnStage(kv, ctx) {
    return _renderOnStage(kv, ctx)
  }

  const renderCompositor = Compositor(ssb, {
    importer,
    renderEditor,
    renderOnStage,
    factory,
    drafts
  })

  document.body.appendChild(
    renderCompositor(config.tre.branches.root)
  )
})
