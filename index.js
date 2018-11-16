const {client} = require('tre-client')
const Finder = require('tre-finder')
const h = require('mutant/html-element')
const Value = require('mutant/value')
const computed= require('mutant/computed')
const setStyle = require('module-styles')('tre-compositor')
const {makePane, makeDivider, makeSplitPane} = require('split-pane')

setStyle(`
  .tre-finder {
    overflow: auto;
    height: 100%;
  }
  .tre-finder li {
    white-space: nowrap;
  }
`)

module.exports = function(ssb, opts) {
  opts = opts || {}
  const importer = opts.importer
  const renderEditor = opts.renderEditor || (kv => h('div', 'no editor') )
  
  // TODO: selection should be kv
  const sel = Value()

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
          makePane('30%', [
            renderFinder(root, ctx)
          ]),
          makeDivider(),
          makePane('60%', [
            h('h1', 'Details'),
            editor
          ])
        ])
      ])
    ])
  }

}
