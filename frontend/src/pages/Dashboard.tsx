// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

type Match = {
  id: number
  team: string
  opponent: string
  date: string
  competition?: string
  location?: string
  video_url?: string
}

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetch('http://localhost:5001/api/matches')
      .then(res => res.json())
      .then(data => setMatches(data || []))
  }, [])

  const toggleMatch = (id: number) => {
    setSelectedIds((prev: number[]) =>
      prev.includes(id) ? prev.filter((i: number) => i !== id) : [...prev, id]
    )
  }

  const goToMultiMatch = () => {
    const query = selectedIds.map((id: number) => `match_id=${id}`).join('&')
    navigate(`/multi-match-report?${query}`)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">VideoAnalysis Dashboard</h1>
          <h2 className="text-lg text-gray-700">Selecciona partidos para el reporte MultiMatch</h2>
        </div>
        <Button
          onClick={() => navigate('/admin/matches')}
          variant="outline"
          className="flex items-center gap-2"
        >
          ⚙️ Administrar Partidos
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {matches.map((match: Match) => (
            <Card key={match.id}>
                <CardHeader>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                    {match.team} <span className="text-gray-500">vs</span> {match.opponent}
                </h2>
                </CardHeader>
                <CardContent>
                <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Fecha:</span> {new Date(match.date).toLocaleDateString()}</p>
                    {match.competition && (
                      <p><span className="font-medium">Competición:</span> {match.competition}</p>
                    )}
                    {match.location && (
                      <p><span className="font-medium">Ubicación:</span> {match.location}</p>
                    )}
                </div>

                <label className="mt-4 flex items-center gap-2 text-sm">
                    <input
                    type="checkbox"
                    checked={selectedIds.includes(match.id)}
                    onChange={() => toggleMatch(match.id)}
                    className="accent-blue-600 w-4 h-4"
                    />
                    Seleccionar para MultiMatch
                </label>
                </CardContent>
                <CardFooter className="flex gap-2">
                <button
                    className="flex-1 bg-blue-600 text-white font-medium rounded-xl px-4 py-2 hover:bg-blue-700 transition"
                    onClick={() => navigate(`/analysis/${match.id}`, { state: { match } })}
                >
                    Ver análisis
                </button>
                <button
                    className="px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                    onClick={() => navigate('/admin/matches')}
                    title="Editar partido"
                >
                    ⚙️
                </button>
                </CardFooter>
            </Card>
        ))}

      </div>

      <div className="mt-6 text-center">
        <Button
          onClick={goToMultiMatch}
          disabled={selectedIds.length === 0}
        >
          Ver Reporte MultiMatch
        </Button>
      </div>
    </div>
  )
}
