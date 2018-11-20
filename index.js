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
  
  // TODO: selection should be kv
  const sel = Value()

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
    }
  }, [
    computed(sel, k => {
      if (!k) return h('div', 'no selection')
      const ret = Value(h('div', 'loading ...'))
      ssb.revisions.get(k, (err, kv) => {
        if (err) return ret.set(h('div', err.message))
        console.log('rendering on stage:', kv)
        ret.set(renderOnStage(kv, {stageScale}))
      })
      return ret
    })
  ])

  const editor = computed(sel, k => {
    if (!k) return h('div', 'no selection')
    const ret = Value(h('div', 'loading ...'))
    ssb.revisions.get(k, (err, kv) => {
      if (err) return ret.set(h('div', err.message))
      console.log('rendering editor for', kv)
      ret.set(renderEditor(kv, {}))
    })
    return ret
  })

  const renderFinder = Finder(ssb, {
    factory,
    importer,
    primarySelection: sel,
    skipFirstLevel: true
  })

  return function renderCompositor(root, ctx) {
    return h('div.tre-compositor', {
    }, [
      makeSplitPane({horiz: false}, [
        makePane('48px', [
          h('span', 'selection'),
          h('span', sel)
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
        ])
      ])
    ])
  }

}
