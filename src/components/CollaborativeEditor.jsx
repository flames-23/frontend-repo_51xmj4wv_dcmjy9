import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { nanoid } from 'nanoid'
import randomColor from 'randomcolor'

import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/gutter'
import { indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'

// Lightweight syntax theme customization on top of oneDark
const customTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: '14px' },
})

const languageExtensions = {
  javascript: javascript(),
  python: python(),
  json: json(),
}

function CollabStatus({ peers, selfColor }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: selfColor }} />
      <span>You</span>
      <span className="text-gray-300">•</span>
      <span>{peers} online</span>
    </div>
  )
}

export default function CollaborativeEditor({ roomId, language = 'javascript', readOnly = false }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const [peers, setPeers] = useState(1)
  const [selfColor] = useState(() => randomColor({ luminosity: 'dark', format: 'hex' }))
  const languageCompartment = useMemo(() => new Compartment(), [])
  const readOnlyCompartment = useMemo(() => new Compartment(), [])

  useEffect(() => {
    const ydoc = new Y.Doc()
    const provider = new WebrtcProvider(`rtce-${roomId}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev'],
      // password: can be set if needed
      awareness: new Y.awarenessProtocol.Awareness(ydoc)
    })

    const yText = ydoc.getText('codemirror')

    // Setup Codemirror with Yjs binding
    import('y-codemirror.next').then(({ yCollab }) => {
      const startState = EditorState.create({
        doc: yText.toString(),
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          indentOnInput(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          oneDark,
          customTheme,
          syntaxHighlighting(EditorState.highlighter || []),
          languageCompartment.of(languageExtensions[language] || javascript()),
          readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        ],
      })

      const view = new EditorView({ state: startState, parent: containerRef.current })
      viewRef.current = view

      const awareness = provider.awareness
      awareness.setLocalStateField('user', {
        name: `guest-${nanoid(4)}`,
        color: selfColor,
      })

      // y-codemirror helper
      const ycollab = yCollab(yText, awareness)
      view.dispatch({ effects: EditorState.reconfigure.of([ycollab]) })

      const updatePeers = () => setPeers(awareness.getStates().size)
      awareness.on('change', updatePeers)
      updatePeers()

      return () => {
        awareness.off('change', updatePeers)
        provider.destroy()
        ydoc.destroy()
        view.destroy()
      }
    })
  }, [roomId])

  useEffect(() => {
    if (viewRef.current) {
      const lang = languageExtensions[language] || javascript()
      viewRef.current.dispatch({ effects: languageCompartment.reconfigure(lang) })
    }
  }, [language])

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)) })
    }
  }, [readOnly])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-white/60 backdrop-blur border-b">
        <CollabStatus peers={peers} selfColor={selfColor} />
        <div className="text-xs text-gray-500">Room: {roomId}</div>
      </div>
      <div className="flex-1" ref={containerRef} />
    </div>
  )
}
