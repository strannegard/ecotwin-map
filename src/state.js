import { atom, useSetAtom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import _ from 'lodash'
import * as pocketbase from './pocketbase'
import { useEffect, useMemo } from 'react'
import {
  landcoverSpawnSettings,
  landcoverFilters as initialLandcoverFilters,
} from '@constants/landcover'

import { parse, addDays, addMonths } from 'date-fns'

export const oceancovers = [
  {
    color: '#FCFDAF',
    name: 'Sand',
  },
  {
    color: '#07243E',
    name: 'Deep ocean',
  },
  {
    color: '#419BDF',
    name: 'Ocean',
  },
]
// export const landcoverMap = _.keyBy(landcovers, 'name')
const hexToRgb = (hex) => {
  const r = parseInt(hex.substring(1, 3), 16)
  const g = parseInt(hex.substring(3, 5), 16)
  const b = parseInt(hex.substring(5, 7), 16)
  return [r, g, b]
}
export const rgbForLandcoverType = (landcover) => {
  const hexColor = landcoverMap[landcover].color

  return hexToRgb(hexColor)
}
export const rgbForOceanType = (oceancover) => {
  const hexColor = oceancovers.find((cover) => cover.name === oceancover).color

  return hexToRgb(hexColor)
}

const nameToKey = (name) => name.toLowerCase().replace(' ', '_')

export const mapViewportAtom = atom({
  longitude: 18.530891,
  latitude: 56.450686,
  // longitude: 12.1172326,
  // latitude: 57.301663,
  // longitude: 12.327145,
  // latitude: 45.438759,
  zoom: 5,
})

export const mapBoundsAtom = atom(null)

const _boundsToQuery = (bounds) => {
  const lat1 = bounds._sw.lat
  const lon1 = bounds._sw.lng
  const lat2 = bounds._ne.lat
  const lon2 = bounds._ne.lng

  return `bounds=${[lat1, lon1, lat2, lon2].join(',')}`
}

export const tilesAtom = atom([])

export const getTileByIdAtom = atomFamily((id) =>
  atom((get) => {
    return get(tilesAtom).find((tile) => tile.id === id)
  })
)
const managementPlans_init_TESTING = [
  {
    id: 0,
    name: 'Farmer Johns Plan 2025',
    created: new Date(),
    tasks: [
      {
        id: 0,
        name: 'Chop down trees',
        type: 'landcoverEdit',
        start: parse('2025-04-01', 'yyyy-MM-dd', new Date()),
        end: parse('2025-05-01', 'yyyy-MM-dd', new Date()),
        landcover: {
          id: 0,
          url: 'https://example.com/trees.png',
        },
      },
      {
        id: 1,
        name: 'Build barn',
        type: 'landcoverEdit',
        start: parse('2025-05-01', 'yyyy-MM-dd', new Date()),
        end: parse('2025-06-01', 'yyyy-MM-dd', new Date()),
        landcover: {
          id: 1,
          url: 'https://example.com/barn.png',
        },
      },
    ],
  },
  {
    id: 1,
    name: 'Gothenburg Fishing Policy 2025',
    created: addMonths(new Date(), 1),
    tasks: [
      {
        id: 0,
        name: 'Start of fishing season',
        type: 'fishingPolicyEdit',
        start: parse('2025-04-01', 'yyyy-MM-dd', new Date()),
        end: parse('2025-05-01', 'yyyy-MM-dd', new Date()),
        fishingPolicy: {
          herring: 0.26,
          spat: 0.26,
          cod: 0.5,
        },
      },
      {
        id: 1,
        name: 'Mid-season fishing',
        type: 'fishingPolicyEdit',
        start: parse('2025-05-01', 'yyyy-MM-dd', new Date()),
        end: parse('2025-06-01', 'yyyy-MM-dd', new Date()),
        fishingPolicy: {
          herring: 0.26,
          spat: 0.26,
          cod: 0.5,
        },
      },
      {
        id: 2,
        name: 'End of fishing season',
        type: 'fishingPolicyEdit',
        start: parse('2025-06-01', 'yyyy-MM-dd', new Date()),
        end: parse('2025-07-01', 'yyyy-MM-dd', new Date()),
        fishingPolicy: {
          herring: 0.26,
          spat: 0.26,
          cod: 0.5,
        },
      },
      {
        id: 3,
        name: 'Build Oil Rig',
        type: 'landcoverEdit',
        start: parse('2025-07-01', 'yyyy-MM-dd', new Date()),
        end: parse('2025-08-01', 'yyyy-MM-dd', new Date()),
        landcover: {
          id: 0,
          url: 'https://example.com/oil_rig.png',
        },
      },
      {
        id: 4,
        name: 'Build Second Oil Rig',
        type: 'landcoverEdit',
        start: parse('2025-08-01', 'yyyy-MM-dd', new Date()),
        end: parse('2025-09-01', 'yyyy-MM-dd', new Date()),
        landcover: {
          id: 1,
          url: 'https://example.com/oil_rig.png',
        },
      },
    ],
  },
]
export const managementPlansAtom = atom(managementPlans_init_TESTING)

export const getManagementPlanByIdAtom = atomFamily((id) =>
  atom((get) => {
    return get(managementPlansAtom).find((plan) => plan.id === id)
  })
)

export const updateManagementPlanTaskAtom = atom(
  null,
  (get, set, { managementPlan, taskToUpdateId, taskToUpdateData }) => {
    const updatedTasks = managementPlan.tasks.map((task) => {
      if (task.id === taskToUpdateId) {
        return { ...task, ...taskToUpdateData }
      }
      return task
    })
    managementPlan.tasks = updatedTasks
    set(managementPlansAtom, [...get(managementPlansAtom)])
  }
)

export const updateManagementPlanNameAtom = atom(
  null,
  (get, set, { managementPlan, newName }) => {
    managementPlan.name = newName
    set(managementPlansAtom, [...get(managementPlansAtom)])
  }
)

export const addManagementPlanTaskAtom = atom(
  null,
  (get, set, { managementPlan, taskToAdd, previousTask }) => {
    const tasks = managementPlan.tasks
    const newTaskId = Date.now()

    const type = previousTask?.type || 'landcoverEdit'
    const startDate = previousTask ? previousTask.end : new Date()
    const endDate = addMonths(startDate, 1)

    const newTask = {
      id: newTaskId,
      name: 'New Task',
      type: type,
      start: startDate,
      end: endDate,
      ...taskToAdd, // Allow overriding defaults
      id: newTaskId, // Ensure ID is not overridden
    }

    let newTasksArray
    if (previousTask) {
      const insertAtIndex = tasks.findIndex((t) => t.id === previousTask.id) + 1
      if (insertAtIndex > 0 && insertAtIndex <= tasks.length) {
        newTasksArray = [
          ...tasks.slice(0, insertAtIndex),
          newTask,
          ...tasks.slice(insertAtIndex),
        ]
      } else {
        newTasksArray = [...tasks, newTask]
      }
    } else {
      newTasksArray = [newTask, ...tasks]
    }

    set(managementPlansAtom, (prevPlans) => {
      return prevPlans.map((plan) =>
        plan.id === managementPlan.id ? { ...plan, tasks: newTasksArray } : plan
      )
    })
    return newTask
  }
)

export const deleteManagementPlanTaskAtom = atom(
  null,
  (get, set, { managementPlan, taskToDeleteId }) => {
    const updatedTasks = managementPlan.tasks.filter(
      (task) => task.id !== taskToDeleteId
    )
    managementPlan.tasks = updatedTasks
    set(managementPlansAtom, [...get(managementPlansAtom)])
  }
)

export const spawnSettingsAtom = atom(landcoverSpawnSettings)

export const landcoverFiltersAtom = atom(initialLandcoverFilters)

export const filteredTilesAtom = atom((get) => {
  const tiles = get(tilesAtom)

  const landcoverFilters = get(landcoverFiltersAtom)

  const filteredTiles = tiles.filter((tile) => {
    const landcover = tile.landcover
    if (!landcover || !landcover.coverage) return false

    let allow = true
    for (const [name, [min, max]] of Object.entries(landcoverFilters)) {
      const value = landcover.coverage[nameToKey(name)] ?? 0
      if (value < min || value > max) {
        allow = false
      }
    }

    return allow
  })

  return filteredTiles
})

export const initializeTilesAtom = atom(
  (get) => get(tilesAtom),
  (get, set, action) => {
    // Fetch initial tiles data
    pocketbase.getTiles().then((tiles) => {
      set(tilesAtom, tiles)
    })

    pocketbase.subscribe(
      'tiles',
      '*',
      (e) => {
        set(tilesAtom, (prevTiles) => {
          switch (e.action) {
            case 'create':
              return [e.record, ...prevTiles]
            case 'update':
              return prevTiles.map((tile) =>
                tile.id === e.record.id ? e.record : tile
              )
            case 'delete':
              return prevTiles.filter((tile) => tile.id !== e.record.id)
            default:
              return prevTiles
          }
        })
      },
      true,
      'landcover,heightmap,oceanData,simulations'
    )

    pocketbase.subscribe(
      'landcovers',
      '*',
      (e) => {
        set(tilesAtom, (prevTiles) => {
          const tile = prevTiles.find(
            (tile) => tile.landcover.id === e.record.id
          )
          if (!tile) return prevTiles

          return prevTiles.map((t) =>
            t.id === tile.id ? { ...tile, landcover: e.record } : t
          )
        })
      },
      true
    )

    // pocketbase.subscribe(
    //   'simulations',
    //   '*',
    //   (e) => {
    //     set(tilesAtom, (prevTiles) => {
    //       const tile = prevTiles.find((tile) =>
    //         tile.simulations?.find((s) => s.id === e.record.id)
    //       )
    //       if (!tile) return prevTiles

    //       return prevTiles.map((t) => {
    //         console.log('UPDATE TILE', t)
    //         if (t.id === tile.id) {
    //           let simulations = []
    //           switch (e.action) {
    //             case 'create':
    //               simulations = [e.record, ...t.simulations]
    //               break
    //             case 'update':
    //               simulations = t.simulations.map((s) =>
    //                 s.id === e.record.id ? e.record : s
    //               )
    //               break
    //             case 'delete':
    //               simulations = t.simulations.filter(
    //                 (s) => s.id !== e.record.id
    //               )
    //             default:
    //           }
    //           return { ...t, simulations }
    //         }
    //         return t
    //       })
    //     })
    //   },
    //   true,
    //   'timesteps'
    // )
  }
)

export const useInitTiles = () => {
  const initializeTiles = useSetAtom(initializeTilesAtom)
  const memo = useMemo(() => ({ inited: false }), [])

  useEffect(() => {
    if (memo.inited) return
    memo.inited = true
    initializeTiles()
  }, [memo])
}

export const simulationAtom = atomFamily((id) =>
  atom(async (get) => {
    const tiles = get(tilesAtom)
    const tile = tiles.find((tile) =>
      tile.simulations?.find((sim) => sim.id === id)
    )

    if (!tile) return
    console.log('simAtom, ', tile)

    const sim = tile.simulations.find((sim) => sim.id === id)
    return sim
  })
)

export const timestepsAtom = atomFamily((id) =>
  atom(async (_) => {
    const timesteps = await pocketbase.timestepsForSimulation(id)
    return timesteps
  })
)

export const locationFilterAtom = atom({})

export const locationFilterDistanceAtom = atom(100)

export const mapDrawModeAtom = atom('simple_select')
export const VIEW_MODE = 'VIEW_MODE'
export const CREATE_MODE = 'CREATE_MODE'
export const mapModeAtom = atom((get) => {
  const features = get(featuresAtom)
  const mapDrawMode = get(mapDrawModeAtom)

  return mapDrawMode != 'simple_select' || Object.keys(features).length > 0
    ? CREATE_MODE
    : VIEW_MODE
})

export const showTileGridAtom = atom((get) => {
  const drawMode = get(mapDrawModeAtom)

  return drawMode == 'draw_point'
})

export const featuresAtom = atom({})

export const colorSchemeAtom = atom('light')
