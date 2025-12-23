// Sidebar.tsx
import { useFilterContext } from "@/context/FilterContext";
import { useEffect, useState, useMemo } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { useMatches } from "@/hooks/useMatches";
import { useContext } from "react";
import { usePlayback } from "@/context/PlaybackContext";
import { FiX } from "react-icons/fi";



const Sidebar = React.memo(({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void }) => {
  const {
    events,
    filteredEvents,
    filterDescriptors,
    setFilterDescriptors,
    filterCategory,
    setFilterCategory,
    setFilteredEvents,
    selectedTeam,
    setSelectedTeam,
    matchInfo
  } = useFilterContext();

  const { playFiltered } = usePlayback();
  // Obtén todos los partidos (matches)
  const matchesQuery = useMatches(); // useMatches likely returns a UseQueryResult
  const allMatches = matchesQuery.data ?? [];
  // Si match_info puede ser undefined, inicializa como objeto vacío para evitar errores
  const safeMatchInfo = matchInfo || {};

  type Match = {
    team: string;
    opponent: string;
    // add other properties if needed
  };

  const allTeams = Array.from(
    new Set(
      (allMatches as Match[]).map((m: Match) => m.opponent).filter((opponent: string) => Boolean(opponent))
    )
  ).sort();

  const myTeams = useMemo(
    () =>
      Array.from(
        new Set(
          (matchesQuery.data || [])
            .map((m: Match) => m.team)
            .filter((t: string) => t !== "Opponent")
        )
      ).sort(),
    [matchesQuery.data]
  );

  const camposExtra = ["TRY_ORIGIN", "Time_Group", "player_name", "player_position"];


  const computedFilteredEvents = useMemo(() => {
    let result = [...events];




    if (filterCategory.length > 0) {
      const normalizedFilters = filterCategory.map((c: any) => (c || "").toString().trim().toUpperCase());
      result = result.filter((ev) => {
        const evType = (ev.event_type || ev.CATEGORY || "").toString().trim().toUpperCase();
        return normalizedFilters.includes(evType);
      });
    }
    if (filterDescriptors.length > 0) {
      result = result.filter((ev) =>
        filterDescriptors.every((fd) => {
          const eventValue = ev.extra_data?.[fd.descriptor] || ev[fd.descriptor];

          // Si el valor del evento es un array, verificar si contiene el valor del filtro
          if (Array.isArray(eventValue)) {
            return eventValue.includes(fd.value);
          }

          // Si no es array, comparar directamente
          return eventValue === fd.value;
        })
      );
    }

    if (selectedTeam) {
      if (selectedTeam === "MIS EQUIPOS") {
        result = result.filter((ev) => ev.IS_OPPONENT === false);
      } else if (selectedTeam === "RIVALES") {
        result = result.filter((ev) => ev.IS_OPPONENT === true);
      } else if (myTeams.includes(selectedTeam)) {
        // Si es uno de mis equipos, filtra por TEAM propio
        result = result.filter(
          (ev) =>
            (ev.TEAM === selectedTeam || ev.extra_data?.TEAM === selectedTeam) &&
            ev.IS_OPPONENT === false
        );
      } else {
        // Si es un rival, filtra por OPPONENT y IS_OPPONENT true
        result = result.filter(
          (ev) =>
            (ev.OPPONENT === selectedTeam || ev.extra_data?.OPPONENT === selectedTeam) &&
            ev.IS_OPPONENT === true
        );
      }
    }
    //console log de selectedTeam
    
    return result;
  }, [events, selectedTeam, filterCategory, filterDescriptors]);
  
  const allDescriptors = useMemo(() => {
    const sourceEvents = computedFilteredEvents.length > 0 ? computedFilteredEvents : events;
    return Array.from(
      new Set([
        ...sourceEvents.flatMap(ev => ev.extra_data ? Object.keys(ev.extra_data) : []),
        ...camposExtra.filter(key => sourceEvents.some(ev => ev[key] !== undefined && ev[key] !== null))
      ])
    );
  }, [computedFilteredEvents, camposExtra, events]);

  const [selectedDescriptor, setSelectedDescriptor] = useState<string>("");
  // console.log("Selected Descriptor:", selectedDescriptor);
  const [availableValues, setAvailableValues] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>("");



  useEffect(() => {
    if (selectedDescriptor) {
      const values = Array.from(
        new Set(
          events
            .map((ev) => ev[selectedDescriptor])
            .filter((v) => v !== undefined && v !== null && v !== "")
        )
      ) as string[];
      setAvailableValues(values);
    } else {
      setAvailableValues([]);
    }
  }, [selectedDescriptor, events]);

  const descriptorValues = useMemo(() => {
    if (!selectedDescriptor) return [];
    const sourceEvents = computedFilteredEvents.length > 0 ? computedFilteredEvents : events;
    return Array.from(
      new Set(
        sourceEvents
          .flatMap(ev => {
            const value = ev.extra_data && selectedDescriptor in ev.extra_data
              ? ev.extra_data[selectedDescriptor]
              : ev[selectedDescriptor];

            if (Array.isArray(value)) {
              return value;
            }

            return [value];
          })
          .filter(v => v !== undefined && v !== null && v !== "None")
      )
    );
  }, [computedFilteredEvents, selectedDescriptor, events]);

  useEffect(() => {
    let result = [...events];

    // Filtrar por categoría
    if (filterCategory.length > 0) {
      const normalizedFilters = filterCategory.map((c: any) => (c || "").toString().trim().toUpperCase());
      result = result.filter((ev) => {
        const evType = (ev.event_type || ev.CATEGORY || "").toString().trim().toUpperCase();
        return normalizedFilters.includes(evType);
      });
    }

    // Filtrar por descriptores
    if (filterDescriptors.length > 0) {
      result = result.filter((ev) =>
        filterDescriptors.every((fd) => {
          const eventValue = ev.extra_data?.[fd.descriptor] || ev[fd.descriptor];

          // Si el valor del evento es un array, verificar si contiene el valor del filtro
          if (Array.isArray(eventValue)) {
            return eventValue.includes(fd.value);
          }

          // Si no es array, comparar directamente
          return eventValue === fd.value;
        })
      );
    }

    // Filtrar por equipo seleccionado
    if (selectedTeam) {
      if (selectedTeam === "MIS EQUIPOS") {
        result = result.filter((ev) => ev.IS_OPPONENT === false);
      } else if (selectedTeam === "RIVALES") {
        result = result.filter((ev) => ev.IS_OPPONENT === true);
      } else if (myTeams.includes(selectedTeam)) {
        result = result.filter(
          (ev) =>
            (ev.TEAM === selectedTeam || ev.extra_data?.TEAM === selectedTeam) &&
            ev.IS_OPPONENT === false
        );
      } else {
        result = result.filter(
          (ev) =>
            (ev.OPPONENT === selectedTeam || ev.extra_data?.OPPONENT === selectedTeam) &&
            ev.IS_OPPONENT === true
        );
      }
    }

    // Ordenar por timestamp_sec ascendente
    result.sort((a, b) => (a.timestamp_sec ?? 0) - (b.timestamp_sec ?? 0));

    // Actualizar el estado global de eventos filtrados
    // Comparación ligera antes de setState para evitar re-render innecesario.
    // IMPORTANTE: comparar contra el estado previo (`filteredEvents`) del contexto,
    // no contra `computedFilteredEvents` (que es la misma lógica que `result`),
    // porque esa comparación siempre resulta igual y evita la actualización.
    try {
      if (Array.isArray(filteredEvents) && filteredEvents.length === result.length) {
        const firstPrev = filteredEvents[0];
        const lastPrev = filteredEvents[filteredEvents.length - 1];
        const firstNew = result[0];
        const lastNew = result[result.length - 1];
        const equalFirst = (firstPrev?.id ?? firstPrev?.timestamp_sec) === (firstNew?.id ?? firstNew?.timestamp_sec);
        const equalLast = (lastPrev?.id ?? lastPrev?.timestamp_sec) === (lastNew?.id ?? lastNew?.timestamp_sec);
        if (equalFirst && equalLast) {
          // No cambiar si parecen iguales
        } else {
          setFilteredEvents(result);
        }
      } else {
        setFilteredEvents(result);
      }
    } catch (err) {
      setFilteredEvents(result);
    }
  }, [events, filterCategory, filterDescriptors, selectedTeam, myTeams, setFilteredEvents]);

  const applyFilter = () => {
    if (
      selectedDescriptor &&
      selectedValue &&
      !filterDescriptors.some(
        (fd) =>
          fd.descriptor === selectedDescriptor && fd.value === selectedValue
      )
    ) {
      setFilterDescriptors([
        ...filterDescriptors,
        { descriptor: selectedDescriptor, value: selectedValue },
      ]);
      setSelectedDescriptor("");
      setSelectedValue("");
    }
  };

  const removeDescriptorFilter = (descriptor: string, value: string) => {
    setFilterDescriptors(
      filterDescriptors.filter(
        (fd) => !(fd.descriptor === descriptor && fd.value === value)
      )
    );
  };
  

  const toggleCategory = (category: string) => {
    const normalized = (category || "").toString().trim().toUpperCase();
    const normalizedList = (filterCategory || []).map((c: any) => (c || "").toString().trim().toUpperCase());
    if (normalizedList.includes(normalized)) {
      setFilterCategory((filterCategory || []).filter((c: any) => (c || "").toString().trim().toUpperCase() !== normalized));
    } else {
      setFilterCategory([...(filterCategory || []), category]);
    }
  };

  // Equipos presentes en los eventos actuales (del partido abierto)
  const equiposEnEventos = Array.from(
    new Set([
      ...events.map((ev) => ev.TEAM).filter(Boolean),
      ...events.map((ev) => ev.OPPONENT).filter(Boolean),
    ])
  ).sort();

  // Obtén los equipos del partido abierto
  const equiposDelPartido = [
    safeMatchInfo.TEAM || "",
    safeMatchInfo.OPPONENT || ""
  ].filter((e) => e && typeof e === "string");

  // Elimina duplicados por si acaso
  const equiposUnicos = Array.from(new Set(equiposDelPartido));

  const valoresDescriptor = selectedDescriptor
    ? Array.from(
        new Set(
          events.map(ev => {
            // Si el descriptor está en extra_data
            if (ev.extra_data && selectedDescriptor in ev.extra_data) {
              return ev.extra_data[selectedDescriptor];
            }
            // Si el descriptor es un campo directo del evento
            if (ev[selectedDescriptor] !== undefined) {
              return ev[selectedDescriptor];
            }
            return undefined;
          }).filter(v => v !== undefined && v !== null)
        )
      )
    : [];


  // Define a players map or import it from the appropriate source
  const players: Record<string, string> = {}; // Replace with actual player data or import

  const getPlayerName = (id: string) => players[id] || id;

  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(events.map(ev => ev.event_type).filter(Boolean))
      ),
    [filteredEvents]
  );

  const playerNames = useMemo(
    () =>
      Array.from(
        new Set(
          filteredEvents
            .map(ev => ev.player_name)
            .filter(name => name && name !== "None")
        )
      ),
    [filteredEvents]
  );

  return (
    <div className="fixed md:relative md:translate-x-0 top-0 left-0 h-full w-64 bg-[#1c2235] border-r border-white/10 shadow-2xl z-40 transition-transform duration-300 text-slate-100">
      <div className="p-4 space-y-4">
        {/* Encabezado con botón de cerrar */}
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg text-white">Filtros</h2>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
            <FiX size={22} />
          </Button>
        </div>

        <div className="space-y-2">
          {/* Equipo */}
          <>
            <label className="text-sm font-semibold text-slate-200">Equipo</label>
            <select
              value={selectedTeam || ""}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="app-input mb-4"
            >
              <option value="">Todos</option>
              {equiposUnicos.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
              <option disabled>────────</option>
              <option value="MIS EQUIPOS">MIS EQUIPOS</option>
              <option value="RIVALES">RIVALES</option>
            </select>
          </>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1">Descriptor</label>
            <select
              className="app-input"
              value={selectedDescriptor}
              onChange={(e) => setSelectedDescriptor(e.target.value)}
            >
              <option value="">Seleccionar descriptor</option>
              {allDescriptors.map((desc) => (
                <option key={desc} value={desc}>
                  {desc}
                </option>
              ))}
            </select>
          </div>

          {selectedDescriptor && descriptorValues.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-slate-200 mb-1">
                {selectedDescriptor === "player_name" ? "Jugadores" : "Valores"}
              </label>
              <select
                className="app-input"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
              >
                <option value="">Todos</option>
                {descriptorValues.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            onClick={applyFilter}
            disabled={!selectedDescriptor || !selectedValue}
            className="w-full mt-2"
          >
            Aplicar filtro
          </Button>
        </div>

        {filterDescriptors.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">Filtros activos</h3>
            <div className="flex flex-wrap gap-2">
              {filterDescriptors.map((fd, i) => (
                <span
                  key={`${fd.descriptor}-${fd.value}-${i}`}
                  className="px-2 py-1 rounded-full border border-cyan-300/40 bg-cyan-500/15 text-xs font-semibold text-cyan-100 flex items-center gap-1"
                >
                  {fd.descriptor}: {fd.value}
                  <button
                    onClick={() =>
                      removeDescriptorFilter(fd.descriptor, fd.value)
                    }
                    className="text-cyan-200 hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <h3 className="font-semibold text-sm text-slate-200 mb-2">Categorías</h3>
          <select
            multiple
            className="app-input h-32"
            value={filterCategory}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions).map(
                (o) => o.value
              );
              setFilterCategory(options);
            }}
          >
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* {playerNames.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-200 mb-1">Jugadores</label>
            <select
              className="app-input"
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
            >
              <option value="">Todos</option>
              {playerNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )} */}

        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setFilterDescriptors([]);
              setFilterCategory([]);
              setSelectedDescriptor("");
              setSelectedValue("");
            }}
          >
            Limpiar filtros
          </Button>

          <Button
            variant="default"
            onClick={playFiltered}
            disabled={filteredEvents.length === 0}
          >
            ▶️ Reproducir filtrados
          </Button>
        </div>
        <div className="mb-2 text-sm text-slate-300">
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}{" "}
          filtrado{filteredEvents.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
});

export default Sidebar;
