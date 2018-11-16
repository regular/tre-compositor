const {client} = require('tre-client')
const Compositor = require('.')
const h = require('mutant/html-element')
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
  .tre-folders {
    background-color: #777;
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

function renderDefaultTile(kv, ctx) {
  const c = kv.value && kv.value.content
  const {type} = c
  return h('div', {
    style: {
      background: 'red',
    }
  }, type)
}

function RenderStack(where, defaultRender) {
  const renderers = []

  function render(kv, ctx) {
    const newCtx = Object.assign({}, ctx, {where})
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

client( (err, ssb, config) => {
  console.log('tre config', config.tre)
  if (err) return console.error(err)

  const importer = Importer(ssb)
  importer.use(require('tre-fonts'))
  importer.use(require('tre-images'))
  
  const renderTile = RenderStack('tile', renderDefaultTile)
    .use(require('tre-fonts')(ssb))
    .use(require('tre-images')(ssb))
    .render

  const renderEditor = RenderStack('editor', kv => h('div', 'no editor') )
    .use(require('tre-folders')(ssb, {
      renderTile
    }))
    .use(require('tre-fonts')(ssb))
    .use(require('tre-images')(ssb))
    .render

  const renderCompositor = Compositor(ssb, {
    importer,
    renderEditor
  })

  document.body.appendChild(
    renderCompositor(config.tre.branches.root)
  )
})
