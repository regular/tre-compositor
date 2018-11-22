const {client} = require('tre-client')
const Finder = require('tre-finder')
const h = require('mutant/html-element')
const Value = require('mutant/value')
const computed= require('mutant/computed')
const setStyle = require('module-styles')('tre-compositor')
const {makePane, makeDivider, makeSplitPane} = require('tre-split-pane')

setStyle(`
  .tre-finder {
    overflow: auto;
    height: 100%;
  }
  .tre-finder li {
    white-space: nowrap;
  }
  .tre-stage {
    position: relative;
    width: 800px;
    height: 600px;
    background: green;
    border: 4em solid yellow;
  }
`)

module.exports = function(ssb, opts) {
  opts = opts || {}
  const importer = opts.importer
  const renderEditor = opts.renderEditor || (kv => h('div', 'no editor') )
  const renderOnStage = opts.renderOnStage || (kv => h('div', 'no stage renderer') )
  const factory = opts.factory
  
  const primaryTreeSelection = Value()
  
  const primaryStageSelection = opts.primarySelection || Value()
  
  const stageScale = Value(1.0)
  const stageScaleSlider = h('.tre-stage-scale', [
    h('span', 'Zoom:'),
    h('input', {
      type: 'range',
      value: stageScale,
      min: '0.25',
      max: '1.0',
      step: '0.05',
      'ev-input': e => {
        console.log('stage scale:', e.target.value)
        stageScale.set(Number(e.target.value))
      }
    }),
    h('span', stageScale)
  ])

  const stage = h('.tre-stage', {
    style: {
      width: computed(stageScale, s => `${s * 1080}px`),
      height: computed(stageScale, s => `${s * 1920}px`),
    },
    'ev-click': e => {
      console.log('stage deselect')
      e.stopPropagation()
      primaryStageSelection.set(null)
      return false
    }
  }, [
    computed(primaryTreeSelection, kv => {
      if (!kv) return h('div', 'no selection')
      console.log('rendering on stage:', kv)
      return renderOnStage(kv, {stageScale, primarySelection: primaryStageSelection})
    })
  ])

  const editor = computed([primaryTreeSelection, primaryStageSelection], (kv_tree, kv_stage) => {
    // stage selection beats tree selection
    const kv = kv_stage || kv_tree
    if (!kv) return h('div', 'no selection')
    console.log('selection changed to', kv)
    return renderEditor(kv, {})
  })

  const renderFinder = Finder(ssb, {
    factory,
    importer,
    primarySelection: primaryTreeSelection,
    skipFirstLevel: true
  })

  const renderSceneGraph = Finder(ssb, {
    factory,
    importer,
    primarySelection: primaryStageSelection,
    skipFirstLevel: false
  })

  return function renderCompositor(root, ctx) {
    ctx = ctx || {}

    const sceneGraph = computed(primaryTreeSelection, kv_root => {
      if (!kv_root) return h('span', 'no selection')
      const newCtx = Object.assign({}, ctx, {
        path: [],
        shouldOpen: kv => true
      })
      console.log('scene graph', newCtx)
      return renderSceneGraph(kv_root, newCtx)
    })

    return h('div.tre-compositor', {
    }, [
      makeSplitPane({horiz: false}, [
        makePane('48px', [
          h('span', 'selection'),
          h('span', computed(primaryTreeSelection, kv => kv && kv.key))
        ]),
        makeDivider(),
        makeSplitPane({horiz: true}, [
          makePane('25%', [
            renderFinder(root, ctx)
          ]),
          makeDivider(),
          makePane('20%', [
            h('h1', 'Details'),
            editor
          ]),
          makeDivider(),
          makePane('', [
            h('h1', 'Stage'),
            stageScaleSlider,
            stage
          ]),
        ]),
        makeDivider(),
        makePane('500px', [
          h('span', 'Scene'),
          sceneGraph,
        ]),
      ])
    ])
  }

}

function revisionRoot(kv) {
  return kv.value.content && kv.value.content.revisionRoot || kv.key
}
