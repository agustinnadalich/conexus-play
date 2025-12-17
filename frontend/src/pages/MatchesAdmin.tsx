import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Match {
  id: number;
  team: string;
  opponent: string;
  date: string;
  location: string;
  competition?: string;
  round?: string;
  result?: string;
  video_url?: string;
  import_profile_name?: string;
  global_delay_seconds?: number;
  event_delays?: Record<string, number>;
  manual_period_times?: Record<string, number>;
}

interface ImportProfile {
  name: string;
  description: string;
  settings: any;
}

const MatchesAdmin = () => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [profiles, setProfiles] = useState<ImportProfile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<string>("");
    const [manualTimes, setManualTimes] = useState<Record<string, number>>({
        kick_off_1: 0,
        end_1: 2400,
        kick_off_2: 2700,
        end_2: 4800
    });
    const [timeMethod, setTimeMethod] = useState<"manual" | "profile">("profile");
    const [globalDelay, setGlobalDelay] = useState<number>(0);
    const [eventDelays, setEventDelays] = useState<Record<string, number>>({});
    const [newEventType, setNewEventType] = useState<string>("");
    const [newEventDelay, setNewEventDelay] = useState<number>(0);
    const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);

    useEffect(() => {
    fetchMatches();
    fetchProfiles();
    }, []);

    // Detectar automáticamente si el perfil seleccionado es manual
    useEffect(() => {
        if (selectedProfile && profiles.length > 0) {
            const profile = profiles.find(p => p.name === selectedProfile);
            if (profile && (profile.settings?.manual_period_times || profile.settings?.time_mapping?.manual_times)) {
                setTimeMethod("manual");
                // Para perfiles manuales, cargar los tiempos desde el partido si están disponibles,
                // sino usar valores por defecto
                if (editingMatch?.manual_period_times) {
                    setManualTimes(editingMatch.manual_period_times);
                } else {
                    // Valores por defecto para configuración manual
                    setManualTimes({
                        kick_off_1: 0,
                        end_1: 2400,
                        kick_off_2: 2700,
                        end_2: 4800
                    });
                }
            } else {
                setTimeMethod("profile");
            }
        }
    }, [selectedProfile, profiles, editingMatch]);

    const fetchMatches = async () => {
    const res = await fetch("http://localhost:5001/api/matches");
    const data = await res.json();
    setMatches(data);
    };

    const fetchProfiles = async () => {
    const res = await fetch("http://localhost:5001/api/import/profiles");
    const data = await res.json();
    setProfiles(data);
    };

    const fetchEventTypes = async (matchId: number) => {
        try {
            const res = await fetch(`http://localhost:5001/api/matches/${matchId}/event-types`);
            const data = await res.json();
            if (res.ok) {
                console.log('Event types loaded:', data.event_types);
                setAvailableEventTypes(data.event_types);
            } else {
                console.error('Error loading event types:', data);
            }
        } catch (error) {
            console.error('Error fetching event types:', error);
        }
    };

    const handleDelete = async (id: number) => {
        // Encontrar el partido para mostrar información en la confirmación
        const match = matches.find(m => m.id === id);
        const matchName = match ? `${match.team} vs ${match.opponent}` : `Partido #${id}`;
        
        // Confirmar eliminación
        if (!confirm(`¿Estás seguro de que quieres eliminar "${matchName}"?\n\nEsta acción eliminará el partido y todos sus eventos asociados. No se puede deshacer.`)) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:5001/api/matches/${id}`, { 
                method: "DELETE" 
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(`Partido eliminado exitosamente.\nEventos eliminados: ${result.deleted_events_count || 0}`);
                fetchMatches(); // Recargar la lista
            } else {
                const error = await response.json();
                alert(`Error eliminando partido: ${error.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error eliminando partido:', error);
            alert('Error de conexión al eliminar el partido');
        }
    };

    const handleEdit = (match: Match) => {
      navigate(`/admin/matches/${match.id}/edit`);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (!editingMatch) return;
    const value = e.target.value;
    setEditingMatch({ ...editingMatch, [key]: value });
    };

    const handleSave = async () => {
        if (!editingMatch) return;
        // No envíes el id en el body, solo en la URL
        const { id, ...matchData } = editingMatch;

        // Incluir el perfil seleccionado y los delays
        const updatedMatchData = {
            ...matchData,
            import_profile_name: selectedProfile || null,
            global_delay_seconds: globalDelay,
            event_delays: eventDelays
        };

        const res = await fetch(`http://localhost:5001/api/matches/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedMatchData),
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || "Error al guardar");
            return;
        }
        handleCancel();
        fetchMatches();
    };

    const handleAddEventDelay = () => {
        if (!newEventType.trim()) return;
        setEventDelays(prev => ({
            ...prev,
            [newEventType.toUpperCase()]: newEventDelay
        }));
        setNewEventType("");
        setNewEventDelay(0);
    };

    const handleCancel = () => {
        setEditingMatch(null);
        setSelectedProfile("");
        setTimeMethod("profile");
        setGlobalDelay(0);
        setEventDelays({});
        setNewEventType("");
        setNewEventDelay(0);
        setAvailableEventTypes([]);
    };

    const handleRemoveEventDelay = (eventType: string) => {
        setEventDelays(prev => {
            const updated = { ...prev };
            delete updated[eventType];
            return updated;
        });
    };

    const handleSaveProfileSettings = async () => {
        if (!editingMatch) return;

        try {
            // Enviar los tiempos con el sufijo correcto para el backend
            const matchData = {
                kick_off_1_seconds: manualTimes.kick_off_1,
                end_1_seconds: manualTimes.end_1,
                kick_off_2_seconds: manualTimes.kick_off_2,
                end_2_seconds: manualTimes.end_2
            };

            console.log("💾 Guardando tiempos del partido:", matchData);

            const res = await fetch(`http://localhost:5001/api/matches/${editingMatch.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(matchData),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al guardar");
            }

            console.log("✅ Tiempos guardados, recalculando Game_Time...");

            // Recalcular los Game_Time de todos los eventos
            const recalcRes = await fetch(`http://localhost:5001/api/matches/${editingMatch.id}/recalculate-times`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            if (!recalcRes.ok) {
                const error = await recalcRes.json();
                throw new Error(error.error || "Error al recalcular tiempos");
            }

            const recalcData = await recalcRes.json();
            console.log("✅ Game_Time recalculado:", recalcData);

            alert(`✅ Configuración guardada y ${recalcData.events_updated} eventos actualizados correctamente`);
            
            // Actualizar el estado local
            setEditingMatch({
                ...editingMatch,
                kick_off_1_seconds: manualTimes.kick_off_1,
                end_1_seconds: manualTimes.end_1,
                kick_off_2_seconds: manualTimes.kick_off_2,
                end_2_seconds: manualTimes.end_2
            });
            
            fetchMatches(); // Recargar partidos
        } catch (error) {
            console.error("❌ Error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    return (
    <div className="max-w-6xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <Button 
                    onClick={() => navigate('/')} 
                    variant="outline"
                    size="sm"
                >
                    ← Inicio
                </Button>
                <h1 className="text-3xl font-bold">Administrar Partidos</h1>
            </div>
            <div className="text-sm text-gray-600">
                Total: {matches.length} partido{matches.length !== 1 ? 's' : ''}
            </div>
        </div>

        {matches.length === 0 ? (
            <Card className="p-8 text-center">
                <div className="text-gray-500">
                    <p className="text-lg mb-2">No hay partidos registrados</p>
                    <p className="text-sm">Importa tu primer partido para comenzar</p>
                </div>
            </Card>
        ) : (
            <div className="space-y-4">
                {matches.map((match) => (
                    <Card key={match.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-lg font-semibold">
                                            <span className="text-blue-600">{match.team}</span> 
                                            <span className="text-gray-400 mx-2">vs</span> 
                                            <span className="text-red-600">{match.opponent}</span>
                                        </div>
                                        {match.result && (
                                            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                                {match.result}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                        <div>
                                            <span className="font-medium">Fecha:</span><br />
                                            {new Date(match.date).toLocaleDateString()}
                                        </div>
                                        <div>
                                            <span className="font-medium">Lugar:</span><br />
                                            {match.location || 'No especificado'}
                                        </div>
                                        <div>
                                            <span className="font-medium">Competición:</span><br />
                                            {match.competition || 'No especificada'}
                                        </div>
                                        <div>
                                            <span className="font-medium">Perfil:</span><br />
                                            {match.import_profile_name || 'No especificado'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2 ml-4">
                                    <Button 
                                        onClick={() => handleEdit(match)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Editar
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        onClick={() => handleDelete(match.id)}
                                        size="sm"
                                    >
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}

    {editingMatch && (
        <Card className="mt-6">
        <CardContent className="p-4 space-y-4">
            <h2 className="font-semibold">Editar Partido</h2>

            {/* Campos básicos del partido */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Equipo</Label>
                    <Input
                        value={editingMatch.team || ""}
                        onChange={(e) => handleInputChange(e, "team")}
                    />
                </div>
                <div>
                    <Label>Rival</Label>
                    <Input
                        value={editingMatch.opponent || ""}
                        onChange={(e) => handleInputChange(e, "opponent")}
                    />
                </div>
                <div>
                    <Label>Fecha</Label>
                    <Input
                        type="date"
                        value={editingMatch.date || ""}
                        onChange={(e) => handleInputChange(e, "date")}
                    />
                </div>
                <div>
                    <Label>Ubicación</Label>
                    <Input
                        value={editingMatch.location || ""}
                        onChange={(e) => handleInputChange(e, "location")}
                    />
                </div>
                <div>
                    <Label>Competición</Label>
                    <Input
                        value={editingMatch.competition || ""}
                        onChange={(e) => handleInputChange(e, "competition")}
                    />
                </div>
                <div>
                    <Label>Ronda</Label>
                    <Input
                        value={editingMatch.round || ""}
                        onChange={(e) => handleInputChange(e, "round")}
                    />
                </div>
                <div>
                    <Label>Resultado</Label>
                    <Input
                        value={editingMatch.result || ""}
                        onChange={(e) => handleInputChange(e, "result")}
                    />
                </div>
                <div>
                    <Label>URL del Video</Label>
                    <Input
                        value={editingMatch.video_url || ""}
                        onChange={(e) => handleInputChange(e, "video_url")}
                    />
                </div>
            </div>

            {/* Configuración de perfil y tiempos */}
            <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Configuración de Tiempos</h3>

                <div className="mb-4">
                    <Label>Perfil de Importación</Label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar perfil..." />
                        </SelectTrigger>
                        <SelectContent>
                            {profiles.map((profile) => (
                                <SelectItem key={profile.name} value={profile.name}>
                                    {profile.name} - {profile.description}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Solo mostrar método de configuración si el perfil NO es manual */}
                {(() => {
                    const selectedProfileObj = profiles.find(p => p.name === selectedProfile);
                    const isManualProfile = selectedProfileObj && (selectedProfileObj.settings?.manual_period_times || selectedProfileObj.settings?.time_mapping?.manual_times);
                    
                    return !isManualProfile && (
                        <div className="mb-4">
                            <Label>Método de Configuración</Label>
                            <Select value={timeMethod} onValueChange={(value: "manual" | "profile") => setTimeMethod(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="profile">Usar configuración del perfil</SelectItem>
                                    <SelectItem value="manual">Configurar manualmente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    );
                })()}

                {/* Mostrar configuración manual solo si no es un perfil manual o si está en modo manual */}
                {(() => {
                    const selectedProfileObj = profiles.find(p => p.name === selectedProfile);
                    const isManualProfile = selectedProfileObj && (selectedProfileObj.settings?.manual_period_times || selectedProfileObj.settings?.time_mapping?.manual_times);
                    
                    return (timeMethod === "manual" || isManualProfile) && (
                        <div>
                            <div className="mb-3 p-3 bg-blue-50 rounded">
                                <p className="text-sm text-blue-700">
                                    {isManualProfile 
                                        ? "Este perfil requiere configuración manual de tiempos. Los valores se guardarán específicamente para este partido."
                                        : "Configuración manual de tiempos para este partido."
                                    }
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Kick Off 1er Tiempo (segundos)</Label>
                                    <Input
                                        type="number"
                                        value={manualTimes.kick_off_1}
                                        onChange={(e) => setManualTimes(prev => ({ ...prev, kick_off_1: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <Label>Fin 1er Tiempo (segundos)</Label>
                                    <Input
                                        type="number"
                                        value={manualTimes.end_1}
                                        onChange={(e) => setManualTimes(prev => ({ ...prev, end_1: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <Label>Kick Off 2do Tiempo (segundos)</Label>
                                    <Input
                                        type="number"
                                        value={manualTimes.kick_off_2}
                                        onChange={(e) => setManualTimes(prev => ({ ...prev, kick_off_2: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <Label>Fin 2do Tiempo (segundos)</Label>
                                    <Input
                                        type="number"
                                        value={manualTimes.end_2}
                                        onChange={(e) => setManualTimes(prev => ({ ...prev, end_2: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {selectedProfile && timeMethod === "profile" && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">
                            Los tiempos se detectarán automáticamente usando el perfil "{selectedProfile}" 
                            basándose en eventos específicos durante la importación.
                        </p>
                    </div>
                )}
            </div>

            {/* Configuración de Delays */}
            <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Configuración de Delays</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Los delays permiten ajustar los tiempos de los eventos para corregir discrepancias entre el momento de etiquetado y la acción real en el video.
                </p>

                <div className="mb-4">
                    <Label>Delay Global (segundos)</Label>
                    <Input
                        type="number"
                        step="0.1"
                        value={globalDelay}
                        onChange={(e) => setGlobalDelay(parseFloat(e.target.value) || 0)}
                        placeholder="Ej: -1.5 (para atrasar 1.5 segundos)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Delay aplicado a todos los eventos del partido. Valores negativos atrasan los tiempos.
                    </p>
                </div>

                <div className="mb-4">
                    <Label>Delays Específicos por Tipo de Evento</Label>
                    <div className="space-y-2">
                        {Object.entries(eventDelays).map(([eventType, delay]) => (
                            <div key={eventType} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                <span className="font-medium">{eventType}</span>
                                <span className="text-sm text-gray-600">{delay}s</span>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveEventDelay(eventType)}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 mt-2">
                        <Select value={newEventType} onValueChange={setNewEventType}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Seleccionar tipo de evento..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableEventTypes.map((eventType) => (
                                    <SelectItem key={eventType} value={eventType}>
                                        {eventType}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="Delay (segundos)"
                            value={newEventDelay}
                            onChange={(e) => setNewEventDelay(parseFloat(e.target.value) || 0)}
                            className="w-32"
                        />
                        <Button onClick={handleAddEventDelay} disabled={!newEventType.trim()}>
                            Agregar
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Agrega delays específicos para tipos de eventos particulares. Se suman al delay global.
                    </p>
                </div>
            </div>

            <div className="flex gap-2 mt-6 flex-wrap">
                <Button onClick={handleSave}>Guardar Partido</Button>
                {timeMethod === "manual" && (
                    <Button onClick={handleSaveProfileSettings} variant="outline">
                        💾 Guardar Tiempos y Recalcular Game_Time
                    </Button>
                )}
                <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
                {editingMatch && (
                    <Button variant="secondary" onClick={() => navigate(`/analysis/${editingMatch.id}/edit-events`)}>
                        Editar eventos
                    </Button>
                )}
            </div>
        </CardContent>
        </Card>
    )}
    </div>
    );
};

export default MatchesAdmin;
