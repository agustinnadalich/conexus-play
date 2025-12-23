import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, RotateCw, ArrowLeft, Download, TestTube } from 'lucide-react';
import { authFetch } from '@/api/api';

interface CategoryMapping {
  id: number;
  source_term: string;
  target_category: string;
  mapping_type: string;
  language?: string;
  priority: number;
  notes?: string;
}

const MappingsAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    mapping_type: 'event_type',
    language: '',
    target_category: ''
  });

  const [newMapping, setNewMapping] = useState({
    source_term: '',
    target_category: '',
    mapping_type: 'event_type',
    language: '',
    priority: 0,
    notes: ''
  });

  const [testTerm, setTestTerm] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    loadMappings();
  }, [filter]);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.mapping_type) params.append('mapping_type', filter.mapping_type);
      if (filter.language) params.append('language', filter.language);
      if (filter.target_category) params.append('target_category', filter.target_category);

      const response = await authFetch(`/mappings?${params}`);
      const data = await response.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error('Error cargando mapeos:', error);
      alert('Error al cargar los mapeos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapping.source_term || !newMapping.target_category) {
      alert('Source term y target category son requeridos');
      return;
    }

    try {
      const response = await authFetch('/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapping)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear mapeo');
      }

      alert('✅ Mapeo creado correctamente');
      setNewMapping({
        source_term: '',
        target_category: '',
        mapping_type: 'event_type',
        language: '',
        priority: 0,
        notes: ''
      });
      loadMappings();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm('¿Eliminar este mapeo?')) return;

    try {
      const response = await authFetch(`/mappings/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Error al eliminar');

      alert('✅ Mapeo eliminado');
      loadMappings();
    } catch (error) {
      alert('Error al eliminar el mapeo');
    }
  };

  const handleInitDefaults = async () => {
    if (!confirm('¿Cargar mapeos por defecto (rugby)? Esto agregará ~60 mapeos.')) return;

    try {
      const response = await authFetch('/mappings/init-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: false })
      });

      const data = await response.json();
      alert(`✅ ${data.count} mapeos cargados`);
      loadMappings();
    } catch (error) {
      alert('Error al inicializar mapeos por defecto');
    }
  };

  const handleTestTranslation = async () => {
    if (!testTerm) return;

    try {
      const response = await authFetch('/mappings/test-translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms: [testTerm],
          mapping_type: filter.mapping_type
        })
      });

      const data = await response.json();
      setTestResult(data.translations[testTerm] || testTerm);
    } catch (error) {
      alert('Error al probar traducción');
    }
  };

  const groupedMappings = mappings.reduce((acc, m) => {
    if (!acc[m.target_category]) {
      acc[m.target_category] = [];
    }
    acc[m.target_category].push(m);
    return acc;
  }, {} as Record<string, CategoryMapping[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Mapeos de Categorías</h1>
              <p className="text-slate-300 mt-1">
                Unifica terminología de diferentes analistas, entrenadores, idiomas y software
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Ejemplos: "Derribo" → TACKLE, "Placcaggio" → TACKLE, "Tackle Efectivo" → TACKLE
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleInitDefaults}>
              <Download className="w-4 h-4 mr-2" />
              Cargar Defaults
            </Button>
            <Button variant="outline" onClick={loadMappings}>
              <RotateCw className="w-4 h-4 mr-2" />
              Recargar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="view" className="space-y-6">
          <TabsList>
            <TabsTrigger value="view">Ver Mapeos</TabsTrigger>
            <TabsTrigger value="create">Crear Mapeo</TabsTrigger>
            <TabsTrigger value="test">Probar Traducción</TabsTrigger>
          </TabsList>

          <TabsContent value="view">
            <Card>
              <CardHeader>
                <CardTitle>Mapeos Existentes ({mappings.length})</CardTitle>
                <CardDescription>Filtra y gestiona los mapeos de categorías</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label>Tipo de Mapeo</Label>
                    <Select value={filter.mapping_type} onValueChange={(v) => setFilter({...filter, mapping_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event_type">Tipo de Evento</SelectItem>
                        <SelectItem value="descriptor">Descriptor</SelectItem>
                        <SelectItem value="zone">Zona</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Idioma</Label>
                    <Select value={filter.language} onValueChange={(v) => setFilter({...filter, language: v})}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="it">Italiano</SelectItem>
                        <SelectItem value="en">Inglés</SelectItem>
                        <SelectItem value="fr">Francés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Categoría Destino</Label>
                    <Input value={filter.target_category} onChange={(e) => setFilter({...filter, target_category: e.target.value})} placeholder="Ej: TACKLE" />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">Cargando...</div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedMappings).map(([targetCategory, items]) => (
                      <Card key={targetCategory}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">
                            {targetCategory} <span className="ml-2 text-sm font-normal text-gray-500">({items.length} términos)</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {items.map((mapping) => (
                              <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                <div className="flex-1">
                                  <span className="font-medium">{mapping.source_term}</span>
                                  {mapping.language && <span className="ml-2 text-xs text-gray-500 uppercase">[{mapping.language}]</span>}
                                  {mapping.notes && <span className="ml-2 text-xs text-gray-500">- {mapping.notes}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Prioridad: {mapping.priority}</span>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteMapping(mapping.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {Object.keys(groupedMappings).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No hay mapeos. Haz click en "Cargar Defaults" para agregar 60+ mapeos de rugby.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Crear Nuevo Mapeo</CardTitle>
                <CardDescription>Unifica terminología personalizada: cualquier término → categoría estándar</CardDescription>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-2">💡 Casos de uso comunes:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li><strong>Multiidioma:</strong> "Placcaggio" (IT) → TACKLE, "Placaje" (ES) → TACKLE</li>
                    <li><strong>Jerga local:</strong> "Derribo" (Entrenador A) → TACKLE, "Tackle Efectivo" (Entrenador B) → TACKLE</li>
                    <li><strong>Software:</strong> "TACKLE MADE" (LongoMatch) → TACKLE, "Tackle_Success" (Sportscode) → TACKLE</li>
                    <li><strong>Descriptores:</strong> "Fuori" (IT) → OUTSIDE, "Afuera" (ES) → OUTSIDE, "Outside" (EN) → OUTSIDE</li>
                  </ul>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateMapping} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Término Original *</Label>
                      <Input value={newMapping.source_term} onChange={(e) => setNewMapping({...newMapping, source_term: e.target.value})} placeholder="Ej: Derribo, Placcaggio, TACKLE MADE" required />
                      <p className="text-xs text-gray-500 mt-1">Cualquier término: idioma, jerga, software, etc.</p>
                    </div>

                    <div>
                      <Label>Categoría Destino *</Label>
                      <Input value={newMapping.target_category} onChange={(e) => setNewMapping({...newMapping, target_category: e.target.value})} placeholder="Ej: TACKLE" required />
                      <p className="text-xs text-gray-500 mt-1">Categoría estándar unificada (mayúsculas recomendado)</p>
                    </div>

                    <div>
                      <Label>Tipo de Mapeo</Label>
                      <Select value={newMapping.mapping_type} onValueChange={(v) => setNewMapping({...newMapping, mapping_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="event_type">Tipo de Evento</SelectItem>
                          <SelectItem value="descriptor">Descriptor</SelectItem>
                          <SelectItem value="zone">Zona</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Idioma (opcional)</Label>
                      <Select value={newMapping.language} onValueChange={(v) => setNewMapping({...newMapping, language: v})}>
                        <SelectTrigger><SelectValue placeholder="Si aplica" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin especificar</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="it">Italiano</SelectItem>
                          <SelectItem value="en">Inglés</SelectItem>
                          <SelectItem value="fr">Francés</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Opcional: útil para filtrar pero no requerido para jerga local</p>
                    </div>

                    <div>
                      <Label>Prioridad</Label>
                      <Input type="number" value={newMapping.priority} onChange={(e) => setNewMapping({...newMapping, priority: parseInt(e.target.value)})} />
                      <p className="text-xs text-gray-500 mt-1">Mayor prioridad = preferencia en conflictos</p>
                    </div>

                    <div>
                      <Label>Notas (opcional)</Label>
                      <Input value={newMapping.notes} onChange={(e) => setNewMapping({...newMapping, notes: e.target.value})} placeholder="Ej: Terminología entrenador Juan, LongoMatch export, etc." />
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Mapeo
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Probar Traducción</CardTitle>
                <CardDescription>Prueba cómo se traduce un término con los mapeos actuales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Término a Traducir</Label>
                    <Input value={testTerm} onChange={(e) => setTestTerm(e.target.value)} placeholder="Ej: Placcaggio, Derribo, TACKLE MADE" />
                  </div>

                  <div>
                    <Label>Tipo de Mapeo</Label>
                    <Select value={filter.mapping_type} onValueChange={(v) => setFilter({...filter, mapping_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event_type">Tipo de Evento</SelectItem>
                        <SelectItem value="descriptor">Descriptor</SelectItem>
                        <SelectItem value="zone">Zona</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleTestTranslation} className="w-full">
                  <TestTube className="w-4 h-4 mr-2" />
                  Probar Traducción
                </Button>

                {testResult && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Término Original:</p>
                          <p className="text-lg font-medium">{testTerm}</p>
                        </div>
                        <div className="text-2xl text-gray-400">→</div>
                        <div>
                          <p className="text-sm text-gray-600">Traducción:</p>
                          <p className="text-lg font-bold text-blue-600">{testResult}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MappingsAdmin;
