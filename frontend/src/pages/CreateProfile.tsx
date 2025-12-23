import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/api/api";


const CreateProfile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estado para el perfil seleccionado
  const [selectedProfile, setSelectedProfile] = useState("");

  // Nuevo: Tipo de archivo
  const [fileType, setFileType] = useState<"xlsx" | "json" | "xml">("xlsx");

  // Paso 1: Nombre y descripción
  const [profileName, setProfileName] = useState("");
  const [description, setDescription] = useState("");

  // Paso 2: Columnas
  const [colEventType, setColEventType] = useState("CATEGORY");
  const [colPlayer, setColPlayer] = useState("PLAYER");
  const [colTime, setColTime] = useState("SECOND");
  const [colX, setColX] = useState("COORDINATE_X");
  const [colY, setColY] = useState("COORDINATE_Y");

  const [timeCategories, setTimeCategories] = useState<Record<string, { category: string; descriptor?: string; descriptor_value?: string }>>({
    kick_off_1: { category: "", descriptor: "", descriptor_value: "" },
    end_1: { category: "", descriptor: "", descriptor_value: "" },
    kick_off_2: { category: "", descriptor: "", descriptor_value: "" },
    end_2: { category: "", descriptor: "", descriptor_value: "" },
  });



  // Paso 5: Configuración de tiempos
  const [timeMethod, setTimeMethod] = useState<"event_based" | "category_based" | "manual">("event_based");
  const [manualTimes, setManualTimes] = useState<Record<string, number>>({
    kick_off_1: 0,
    end_1: 2400,
    kick_off_2: 2700,
    end_2: 4800
  });

  // Fetch de perfiles disponibles
  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const res = await authFetch("/import/profiles");
      if (!res.ok) throw new Error("Error al cargar perfiles");
      return res.json();
    }
  });

  useEffect(() => {
    if (selectedProfile) {
      const profile = profilesQuery.data?.find((p: any) => p.name === selectedProfile);
      setTimeCategories({
        kick_off_1: profile.settings?.time_mapping?.kick_off_1 || { category: "", descriptor: "", descriptor_value: "" },
        end_1: profile.settings?.time_mapping?.end_1 || { category: "", descriptor: "", descriptor_value: "" },
        kick_off_2: profile.settings?.time_mapping?.kick_off_2 || { category: "", descriptor: "", descriptor_value: "" },
        end_2: profile.settings?.time_mapping?.end_2 || { category: "", descriptor: "", descriptor_value: "" },
      });

      if (profile) {
        setProfileName(profile.name);
        setDescription(profile.description || "");
        setColEventType(profile.settings?.col_event_type || "CATEGORY");
        setColPlayer(profile.settings?.col_player || "PLAYER");
        setColTime(profile.settings?.col_time || "SECOND");
        setColX(profile.settings?.col_x || "COORDINATE_X");
        setColY(profile.settings?.col_y || "COORDINATE_Y");
        setTimeMethod(profile.settings?.time_mapping?.method || "event_based");
        setManualTimes(profile.settings?.time_mapping?.manual_times || {
          kick_off_1: 0,
          end_1: 2400,
          kick_off_2: 2700,
          end_2: 4800,
        });
        setFileType(profile.settings?.file_type || "xlsx");
      }
    }
  }, [selectedProfile, profilesQuery.data]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const profile = {
        name: profileName,
        description: description,
        settings: {
          file_type: fileType,
          events_sheet: "MATRIZ",
          meta_sheet: "MATCHES",
          ...(fileType !== "xml" && {
            col_event_type: colEventType,
            col_player: colPlayer,
            col_time: colTime,
            col_x: colX,
            col_y: colY,
            normalize_penalty_cards: true,
            normalize_lineout: true,
            normalize_tackle: true,
          }),
          time_mapping: {
            method: timeMethod,
            kick_off_1: {
              category: timeCategories.kick_off_1.category,
              descriptor: timeCategories.kick_off_1.descriptor || "",
              descriptor_value: timeCategories.kick_off_1.descriptor_value || "",
              period: 1,
            },
            end_1: {
              category: timeCategories.end_1.category,
              descriptor: timeCategories.end_1.descriptor || "",
              descriptor_value: timeCategories.end_1.descriptor_value || "",
              period: 1,
            },
            kick_off_2: {
              category: timeCategories.kick_off_2.category,
              descriptor: timeCategories.kick_off_2.descriptor || "",
              descriptor_value: timeCategories.kick_off_2.descriptor_value || "",
              period: 2,
            },
            end_2: {
              category: timeCategories.end_2.category,
              descriptor: timeCategories.end_2.descriptor || "",
              descriptor_value: timeCategories.end_2.descriptor_value || "",
              period: 2,
            },
            manual_times: manualTimes,
          },
        },
      };

      const res = await authFetch("/import/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) throw new Error("Error al guardar el perfil");

      toast({
        title: selectedProfile ? "Perfil actualizado" : "Perfil creado",
        description: "El perfil se guardó correctamente.",
        variant: "default",
      });

      navigate("/import");
    } catch (err) {
      toast({
        title: "Error",
        description: "Fallo al guardar el perfil. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

    // Validación para habilitar/deshabilitar el botón
    const isSaveDisabled =
    !profileName.trim() ||
    (fileType !== "xml" && !colEventType.trim()) ||
    (timeMethod !== "manual" && selectedProfile && (Object.values(timeCategories) as { category: string }[]).some(tc => !tc.category.trim()));


  if (profilesQuery.isLoading) {
    return <div>Cargando perfiles...</div>;
  }

  if (profilesQuery.isError) {
    return (
      <div>
        <p>Error al cargar perfiles. Por favor, inténtalo nuevamente.</p>
        <Button onClick={() => profilesQuery.refetch()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold mb-2">
        {selectedProfile ? "Editar Perfil de Importación" : "Crear Nuevo Perfil de Importación"}
      </h1>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label>Seleccionar Perfil</Label>
            <select
              value={selectedProfile}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProfile(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">➕ Crear un perfil nuevo</option>
              {profilesQuery.data?.map((p: any) => (
                <option key={p.name} value={p.name}>
                  ✏️ Editar: {p.name}
                </option>
              ))}
            </select>
            {selectedProfile ? (
              <p className="text-sm text-blue-600">
                Editando perfil existente: <strong>{selectedProfile}</strong>
              </p>
            ) : (
              <p className="text-sm text-green-600">
                Creando un perfil completamente nuevo
              </p>
            )}
          </div>

          <div>
            <Label>Tipo de archivo</Label>
            <select
              value={fileType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFileType(e.target.value as "xlsx" | "json" | "xml")}
              className="w-full border p-2 rounded"
            >
              <option value="xlsx">Excel</option>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
            </select>
          </div>

          <div>
            <Label>Nombre del Perfil</Label>
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </div>

          <div>
            <Label>Descripción</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Solo mostrar campos de columnas si el tipo de archivo no es XML */}
          {fileType !== "xml" && (
            <>
              <div>
                <Label>Columna Categoría</Label>
                <Input
                  value={colEventType}
                  onChange={(e) => setColEventType(e.target.value)}
                />
              </div>

              <div>
                <Label>Columna Jugador</Label>
                <Input
                  value={colPlayer}
                  onChange={(e) => setColPlayer(e.target.value)}
                />
              </div>

              <div>
                <Label>Columna Tiempo (segundos)</Label>
                <Input
                  value={colTime}
                  onChange={(e) => setColTime(e.target.value)}
                />
              </div>

              <div>
                <Label>Columna Coordenada X</Label>
                <Input value={colX} onChange={(e) => setColX(e.target.value)} />
              </div>

              <div>
                <Label>Columna Coordenada Y</Label>
                <Input value={colY} onChange={(e) => setColY(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <Label>Método para Calcular Tiempo de Juego</Label>
            <select
              value={timeMethod}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeMethod(e.target.value as "event_based" | "category_based" | "manual")}
              className="w-full border p-2 rounded"
            >
              <option value="event_based">Por Evento + Descriptor</option>
              <option value="category_based">Solo por Categoría</option>
              <option value="manual">Manual (segundos)</option>
            </select>
          </div>

          {/* Campos dinámicos para categorías y descriptores */}
          {timeMethod !== "manual" && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {Object.entries(timeCategories).map(([key, val]) => (
                <div key={key} className="space-y-2">
                  <Label>
                    {key.replaceAll("_", " ").toUpperCase()} - Categoría
                  </Label>
                  <Input
                    placeholder="Categoría (ej: KICK OFF)"
                    value={val.category}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTimeCategories((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], category: e.target.value },
                      }))
                    }
                  />
                  {timeMethod === "event_based" && (
                    <>
                      <Label>Descriptor</Label>
                      <Input
                        placeholder="Nombre del descriptor (ej: INICIO)"
                        value={val.descriptor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setTimeCategories((prev) => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              descriptor: e.target.value,
                              descriptor_value: val.descriptor_value || "",
                            },
                          }))
                        }
                      />
                      <Label>Valor del descriptor</Label>
                      <Input
                        placeholder="Valor esperado (ej: 1ER TIEMPO)"
                        value={val.descriptor_value || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setTimeCategories((prev) => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              descriptor_value: e.target.value,
                            },
                          }))
                        }
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {timeMethod === "manual" && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(manualTimes).map(([key, value]) => (
                <div key={key}>
                  <Label>{key}</Label>
                  <Input
                    type="number"
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setManualTimes((prev) => ({
                        ...prev,
                        [key]: parseInt(e.target.value) || 0, // Asegura que el valor sea un número válido
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaveDisabled || isSaving}>
            {isSaving ? "Guardando..." : "Guardar Perfil"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProfile;
