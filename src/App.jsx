import React, { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { nanoid } from 'nanoid'
import CollaborativeEditor from './components/CollaborativeEditor'

const languages = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'json', label: 'JSON' },
]

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function App() {
  const query = useQuery()
  const navigate = useNavigate()
  const defaultRoom = useMemo(() => query.get('room') || nanoid(8), [])
  const [roomId, setRoomId] = useState(defaultRoom)
  const [language, setLanguage] = useState(query.get('lang') || 'javascript')

  const updateUrl = (room, lang) => {
    const params = new URLSearchParams()
    params.set('room', room)
    params.set('lang', lang)
    navigate({ search: params.toString() }, { replace: true })
  }

  const handleCreateRoom = () => {
    const newRoom = nanoid(8)
    setRoomId(newRoom)
    updateUrl(newRoom, language)
  }

  const handleJoin = () => {
    if (!roomId) return
    updateUrl(roomId, language)
  }

  const handleLanguageChange = (e) => {
    const lang = e.target.value
    setLanguage(lang)
    updateUrl(roomId, lang)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white/75 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white grid place-items-center font-bold">RT</div>
          <h1 className="text-lg font-semibold text-slate-800">Realtime Code</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
            className="px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <select
            value={language}
            onChange={handleLanguageChange}
            className="px-3 py-2 rounded-md border text-sm bg-white"
          >
            {languages.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <button onClick={handleJoin} className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Join</button>
          <button onClick={handleCreateRoom} className="px-3 py-2 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm">New</button>
        </div>
      </header>

      <main className="flex-1 h-[calc(100vh-64px)]">
        <CollaborativeEditor roomId={roomId} language={language} />
      </main>
    </div>
  )
}
