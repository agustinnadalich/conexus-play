import React, { ChangeEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner"; // Asumiendo que sonner está instalado
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/api/api";

// Tipos para team inference system
interface InferenceRule {
  event_type: string;
  assign_to: string;
  count: number;
  reason: string;
}

interface EventTypeInfo {
  count: number;
  suggested_team: string;
  has_players: boolean;
}

interface EventsWithoutTeam {
  total_count: number;
  by_type: Record<string, EventTypeInfo>;
  inference_rules: InferenceRule[];
}

interface DetectedTeam {
  name: string;  // Backend usa 'name', no 'detected_name'
  count: number;  // Backend usa 'count', no 'event_count'
  is_likely_opponent: boolean;
  sample_events: string[];
}

interface TeamDetection {
  detected_teams: DetectedTeam[];
  suggested_our_team?: string;
  suggested_opponent?: string;
  total_events_with_team: number;
  events_without_team?: EventsWithoutTeam;
}

const PreviewImport = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { previewData, profile, teamId } = state || {};

  const [matchInfo, setMatchInfo] = useState(previewData?.match_info || {});
  const [events, setEvents] = useState(previewData?.events || []);
  const [discardedCategories, setDiscardedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [labelsWithoutGroup, setLabelsWithoutGroup] = useState(previewData?.labels_without_group || []);
  const [editedLabels, setEditedLabels] = useState<string[]>([]);
  const [detectedFields, setDetectedFields] = useState<any[]>([]);
  const [mapping, setMapping] = useState<any[]>([]);
  const [mappedPreview, setMappedPreview] = useState<any[] | null>(null);
  
  // Estados para team inference
  const [teamDetection, setTeamDetection] = useState<TeamDetection | null>(previewData?.team_detection || null);
  const [selectedInferenceRules, setSelectedInferenceRules] = useState<Record<string, boolean>>(() => {
    // Por defecto, habilitar todas las reglas sugeridas
    const initial: Record<string, boolean> = {};
    previewData?.team_detection?.events_without_team?.inference_rules?.forEach((rule: InferenceRule) => {
      initial[rule.event_type] = true;
    });
    return initial;
  });
  
  // Estados para configuración de tiempos manuales
  const [manualTimes, setManualTimes] = useState<Record<string, number>>(() => {
    // Intentar cargar valores desde el perfil si está disponible
    if (profile?.settings?.manual_period_times) {
      return profile.settings.manual_period_times;
    }
    if (profile?.settings?.time_mapping?.manual_times && profile?.settings?.time_mapping?.method === "manual") {
      return profile.settings.time_mapping.manual_times;
    }
    // Valores por defecto
    return {
      kick_off_1: 0,
      end_1: 2400,
      kick_off_2: 2700,
      end_2: 4800
    };
  });

  // Detectar si el perfil requiere configuración manual
  const isManualProfile = profile && (
    profile.settings?.manual_period_times || 
    (profile.settings?.time_mapping?.manual_times && profile.settings?.time_mapping?.method === "manual")
  );

  // Definir los campos del modelo Match con etiquetas amigables
  const matchFields = [
    { key: "opponent_name", label: "Rival", required: true },
    { key: "date", label: "Fecha", required: true, type: "date" },
    { key: "location", label: "Ubicación", required: false },
    { key: "competition", label: "Competición", required: false },
    { key: "round", label: "Fecha/Ronda", required: false },
    { key: "referee", label: "Árbitro", required: false },
    { key: "video_url", label: "URL del Video", required: false },
    { key: "result", label: "Resultado", required: false },
    { key: "field", label: "Cancha", required: false },
    { key: "rain", label: "Lluvia", required: false },
    { key: "muddy", label: "Barro", required: false },
    { key: "wind_1p", label: "Viento 1er Tiempo", required: false },
    { key: "wind_2p", label: "Viento 2do Tiempo", required: false },
  ];

  // Extraer categorías únicas de los eventos
  const availableCategories = Array.from(new Set(previewData?.event_types || [])) as string[];

  const handleFieldChange = (field: string, value: string) => {
    setMatchInfo((prev: any) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (category: string) => {
    setDiscardedCategories((prev: string[]) =>
      prev.includes(category)
        ? prev.filter((c: string) => c !== category)
        : [...prev, category]
    );
  };

  const selectAllCategories = () => {
    setDiscardedCategories([]);
  };

  const discardAllCategories = () => {
    setDiscardedCategories([...availableCategories]);
  };

  const discardCommonCategories = () => {
    const commonDiscard = ["WARMUP", "HALFTIME", "END", "TIMEOUT"];
    const toDiscard = availableCategories.filter((cat: string) =>
      commonDiscard.some((common) => cat.toUpperCase().includes(common))
    );
    setDiscardedCategories((prev: string[]) => [...new Set([...prev, ...toDiscard])]);
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    const eventsToImport = events.filter(
      (ev: any) => !discardedCategories.includes(ev.event_type)
    );
    if (eventsToImport.length === 0) {
      setError("No hay eventos para importar.");
      toast.error("No hay eventos para importar.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
        // Construir team_inference solo con las reglas seleccionadas
        const teamInference = teamDetection?.events_without_team?.inference_rules
          ?.filter(rule => selectedInferenceRules[rule.event_type])
          .map(rule => ({
            event_type: rule.event_type,
            assign_to: rule.assign_to
          }));

        const res = await authFetch("/save_match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            match: {
            ...matchInfo,
            ...(matchInfo.team ? { team: undefined } : {}), // ignorar campo texto de equipo
            // Incluir tiempos manuales si el perfil los requiere
            ...(isManualProfile && { manual_period_times: manualTimes })
            }, 
            events: eventsToImport,
            profile: profile?.name || profile,  // Enviar solo el nombre del perfil
            team_id: teamId ? Number(teamId) : undefined,
            ...(teamInference && teamInference.length > 0 && { team_inference: teamInference })
          })
        });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Error al guardar los datos");
      }
      toast.success("Importación exitosa");
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Fallo al guardar en base de datos");
      toast.error(err.message || "Fallo al guardar en base de datos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // La funcionalidad de archivo debería ser manejada en la página de importación
      console.log("File selected:", e.target.files[0]);
    }
  };

  const handleLabelChange = (index: number, value: string) => {
    setEditedLabels((prev: string[]) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const renderLabelsWithoutGroup = () => (
    <Card className="mb-4">
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold">Labels sin Grupo</h2>
        {labelsWithoutGroup.length > 0 ? (
          labelsWithoutGroup.map((label: string, index: number) => (
            <div key={index} className="flex flex-col mb-2">
              <Label>Label {index + 1}</Label>
              <Input
                type="text"
                value={editedLabels[index] || label}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleLabelChange(index, e.target.value)
                }
              />
            </div>
          ))
        ) : (
          <p>No hay labels sin grupo.</p>
        )}
      </CardContent>
    </Card>
  );

  const detectFields = async () => {
    // lazy-load util to avoid cycles
    const { detectFieldsFromEvents } = await import("@/utils/importUtils");
    const fields = detectFieldsFromEvents(events || []);
    setDetectedFields(fields);
    // initialize mapping defaults
    const defaults = fields.map((f: any) => ({ source: f.path, target: f.path, transformer: 'none' }));
    setMapping(defaults);
  };

  const updateMappingEntry = (index: number, key: string, value: any) => {
    setMapping((prev: any[]) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const applyMappingPreview = async () => {
    const { applyMappingToEvents } = await import("@/utils/importUtils");
    const result = applyMappingToEvents(events || [], mapping || []);
    setMappedPreview(result.slice(0, 30));
  };

  const saveProfile = async () => {
    if (!mapping || mapping.length === 0) return;
    const profilePayload = {
      name: profile?.name || `Profile-${Date.now()}`,
      description: profile?.description || 'Generated from preview',
      settings: { mapping }
    };

    try {
      const res = await authFetch('/import/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload)
      });
      if (!res.ok) throw new Error('Error saving profile');
      alert('Perfil guardado');
    } catch (err: any) {
      alert('Fallo al guardar perfil: ' + (err.message || err));
    }
  };

  if (!previewData) return <p>No hay datos para mostrar</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Paso 2: Revisar y Confirmar</h1>
      
      {/* Información del perfil */}
      {profile && (
        <Card className="mb-4">
          <CardContent className="space-y-2 pt-6">
            <h2 className="text-lg font-semibold">Perfil de Importación</h2>
            <p><strong>Nombre:</strong> {profile.name}</p>
            <p><strong>Descripción:</strong> {profile.description}</p>
            <div className={`inline-flex items-center px-2 py-1 rounded text-sm ${
              isManualProfile ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
            }`}>
              {isManualProfile ? '🔧 Configuración Manual' : '⚡ Detección Automática'}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-lg font-semibold">Metadata del Partido</h2>
          {matchFields.map(({ key, label, required, type }) => (
            <div key={key} className="flex flex-col">
              <Label>
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Input
                type={type || "text"}
                value={matchInfo[key] || ""}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                placeholder={`Ingresa ${label.toLowerCase()}`}
                className={required && !matchInfo[key] ? "border-red-300" : ""}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {renderLabelsWithoutGroup()}

      {/* Configuración de tiempos manuales */}
      {isManualProfile && (
        <Card className="mb-4">
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-lg font-semibold">Configuración de Tiempos</h2>
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-700">
                Este perfil requiere configuración manual de tiempos. Ingresa los segundos exactos para cada período del partido.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kick Off 1er Tiempo (segundos)</Label>
                <Input
                  type="number"
                  value={manualTimes.kick_off_1}
                  onChange={(e) => setManualTimes(prev => ({ ...prev, kick_off_1: parseInt(e.target.value) || 0 }))}
                  placeholder="Ej: 0"
                />
              </div>
              <div>
                <Label>Fin 1er Tiempo (segundos)</Label>
                <Input
                  type="number"
                  value={manualTimes.end_1}
                  onChange={(e) => setManualTimes(prev => ({ ...prev, end_1: parseInt(e.target.value) || 0 }))}
                  placeholder="Ej: 2400"
                />
              </div>
              <div>
                <Label>Kick Off 2do Tiempo (segundos)</Label>
                <Input
                  type="number"
                  value={manualTimes.kick_off_2}
                  onChange={(e) => setManualTimes(prev => ({ ...prev, kick_off_2: parseInt(e.target.value) || 0 }))}
                  placeholder="Ej: 2700"
                />
              </div>
              <div>
                <Label>Fin 2do Tiempo (segundos)</Label>
                <Input
                  type="number"
                  value={manualTimes.end_2}
                  onChange={(e) => setManualTimes(prev => ({ ...prev, end_2: parseInt(e.target.value) || 0 }))}
                  placeholder="Ej: 4800"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inferencia de equipos para eventos sin equipo explícito */}
      {teamDetection?.events_without_team && teamDetection.events_without_team.total_count > 0 && (
        <Card className="mb-4">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">🧠 Asignación Inteligente de Equipos</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {teamDetection.events_without_team.total_count} eventos no tienen equipo explícito. 
                  Selecciona las categorías que quieres asignar automáticamente.
                </p>
              </div>
              <div className="text-sm bg-blue-50 px-3 py-1 rounded">
                <span className="font-medium">{teamDetection.total_events_with_team}</span> eventos con equipo
              </div>
            </div>

            {/* Mostrar equipos detectados */}
            {teamDetection.detected_teams && teamDetection.detected_teams.length > 0 && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium mb-2">Equipos detectados:</p>
                <div className="flex gap-4">
                  {teamDetection.detected_teams.map((team) => (
                    <div key={team.name} className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                        {team.name}
                      </span>
                      <span className="text-xs text-gray-600">
                        {team.count} eventos
                        {team.is_likely_opponent && ' (rival)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla de reglas de inferencia */}
            {teamDetection.events_without_team.inference_rules.length > 0 && (
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">Activar</th>
                      <th className="text-left p-3 font-medium">Categoría</th>
                      <th className="text-left p-3 font-medium">Eventos</th>
                      <th className="text-left p-3 font-medium">Asignar a</th>
                      <th className="text-left p-3 font-medium">Razón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamDetection.events_without_team.inference_rules.map((rule) => {
                      const isSelected = selectedInferenceRules[rule.event_type];
                      return (
                        <tr 
                          key={rule.event_type} 
                          className={`border-t ${isSelected ? 'bg-green-50' : 'bg-white'}`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => setSelectedInferenceRules(prev => ({
                                ...prev,
                                [rule.event_type]: !prev[rule.event_type]
                              }))}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-medium">{rule.event_type}</span>
                          </td>
                          <td className="p-3 text-gray-600">{rule.count}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rule.assign_to === 'our_team' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {rule.assign_to === 'our_team' ? '🏠 Nuestro equipo' : '🏃 Rival'}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-gray-600">{rule.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const allSelected: Record<string, boolean> = {};
                  teamDetection.events_without_team?.inference_rules.forEach(rule => {
                    allSelected[rule.event_type] = true;
                  });
                  setSelectedInferenceRules(allSelected);
                }}
              >
                Seleccionar Todas
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedInferenceRules({})}
              >
                Desactivar Todas
              </Button>
              <div className="ml-auto text-sm text-gray-600">
                {Object.values(selectedInferenceRules).filter(Boolean).length} de {teamDetection.events_without_team.inference_rules.length} reglas activas
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-lg font-semibold">Categorías Detectadas</h2>
          <p className="text-sm text-muted-foreground">
            Eventos detectados: {events.length} | Categorías descartadas: {discardedCategories.length} | Eventos que se importarán: {events.filter((ev: any) => !discardedCategories.includes(ev.event_type)).length}
          </p>
          
          {/* Botones de acción rápida */}
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={selectAllCategories}>
              Seleccionar Todas
            </Button>
            <Button variant="outline" size="sm" onClick={discardAllCategories}>
              Descartar Todas
            </Button>
            <Button variant="outline" size="sm" onClick={discardCommonCategories}>
              Descartar Comunes (WARMUP, HALFTIME, etc.)
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {availableCategories.map((cat) => {
              const eventCount = events.filter((ev: any) => ev.event_type === cat).length;
              const isDiscarded = discardedCategories.includes(cat);
              
              return (
                <label 
                  key={cat} 
                  className={`inline-flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                    isDiscarded ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!isDiscarded}
                    onChange={() => toggleCategory(cat)}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{cat}</span>
                    <span className="text-xs text-gray-500">{eventCount} eventos</span>
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Campos detectados y mapeo */}
      <Card className="mb-4">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-lg font-semibold">Campos detectados y mapeo</h2>
          <p className="text-sm text-gray-500">Detecta automáticamente campos en los eventos y permite mapearlos a campos estándar.</p>
          <div className="flex gap-2 mt-2">
            <Button onClick={detectFields}>Detectar campos</Button>
            <Button onClick={applyMappingPreview} disabled={mapping.length === 0}>Aplicar mapping (preview)</Button>
            <Button onClick={saveProfile} variant="outline">Guardar perfil</Button>
          </div>

          {detectedFields.length === 0 ? (
            <p className="text-sm text-gray-500 mt-3">No se detectaron campos aún.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {detectedFields.map((f: any, idx: number) => (
                <div key={f.path} className="p-2 border rounded grid grid-cols-6 gap-2 items-center">
                  <div className="col-span-2 font-mono text-sm">{f.path}</div>
                  <div className="col-span-2 text-xs text-gray-600">Ej: {f.examples.join(' | ') || '—'}</div>
                  <div className="col-span-1">
                    <select value={mapping[idx]?.target || f.path} onChange={(e) => updateMappingEntry(idx, 'target', e.target.value)} className="w-full border p-1 rounded">
                      <option value={f.path}>Mantener</option>
                      <option value="event_type">event_type</option>
                      <option value="PLAYER">PLAYER</option>
                      <option value="TEAM">TEAM</option>
                      <option value="extra_data.AVANCE">ADVANCE</option>
                      <option value="extra_data.descriptors.AVANCE">ADVANCE (descriptor)</option>
                      <option value="extra_data.JUGADOR">PLAYER (extra_data)</option>
                      <option value="extra_data.EQUIPO">TEAM (extra_data)</option>
                      <option value="timestamp_sec">timestamp_sec</option>
                      <option value="extra_data.COORDINATE_X">COORDINATE_X</option>
                      <option value="extra_data.COORDINATE_Y">COORDINATE_Y</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <select value={mapping[idx]?.transformer || 'none'} onChange={(e) => updateMappingEntry(idx, 'transformer', e.target.value)} className="w-full border p-1 rounded">
                      <option value="none">Ninguno</option>
                      <option value="to_upper">To Upper</option>
                      <option value="split_and_dedupe">Split & Dedupe</option>
                      <option value="mmss_to_seconds">MM:SS → sec</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mappedPreview && (
            <div className="mt-4">
              <h3 className="font-medium">Preview normalizado (primeros {mappedPreview.length})</h3>
              <pre className="text-xs max-h-80 overflow-auto bg-gray-50 p-2 mt-2">{JSON.stringify(mappedPreview.slice(0, 20), null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 items-center">
        <Button 
          onClick={handleConfirm} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isLoading || events.filter((ev: any) => !discardedCategories.includes(ev.event_type)).length === 0}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Importando...
            </span>
          ) : (
            <>Confirmar e Importar ({events.filter((ev: any) => !discardedCategories.includes(ev.event_type)).length} eventos)</>
          )}
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)} disabled={isLoading}>
          Volver
        </Button>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default PreviewImport;
