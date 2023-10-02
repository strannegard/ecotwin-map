import React, { useEffect, useRef, useState } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import { Editor, DrawRectangleMode } from 'react-map-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAtomValue } from 'jotai'
import { tilesAtom, useTile } from '../../state'
import styled from '@emotion/styled'
import { Card, Select, Slider } from '@mantine/core'

const Container = styled.div`
  position: relative;
  width: 100%;
  height: calc(100vh - 60px);
`

const MapControlsContainer = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1;
`

const CREATE_MODE = new DrawRectangleMode()

const MapWrapper = ({ children, onClick, mapRef }) => {
  const [viewport, setViewport] = useState({
    longitude: 12.1172326,
    latitude: 57.301663,
    zoom: 13,
  })

  return (
    <Map
      {...viewport}
      ref={(ref) => (mapRef.current = ref)}
      mapLib={import('mapbox-gl')}
      mapboxApiAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
      onViewportChange={setViewport}
      width={'100%'}
      height={'100%'}
      mapStyle="mapbox://styles/mapbox/satellite-v9"
      onClick={onClick}
    >
      {children}
    </Map>
  )
}

const MapContainer = () => {
  const navigate = useNavigate()
  const map = useRef(null)
  const [mode, setMode] = useState(null)
  const tiles = useAtomValue(tilesAtom)
  const tile = useTile()
  const [tileOpacity, setTileOpacity] = useState(0.65)

  const tilesLayerData = tiles.map((tile) => ({
    id: tile.id,
    type: 'image',
    url: `http://localhost:5173${tile.landcover}`,
    coordinates: [
      [tile.bbox[0], tile.bbox[3]],
      [tile.bbox[2], tile.bbox[3]],
      [tile.bbox[2], tile.bbox[1]],
      [tile.bbox[0], tile.bbox[1]],
    ],
  }))

  const handleMapClick = (event) => {
    const coords = event.lngLat
    const tile = tiles.find(
      (tile) =>
        coords[0] > tile.bbox[0] &&
        coords[0] < tile.bbox[2] &&
        coords[1] > tile.bbox[1] &&
        coords[1] < tile.bbox[3]
    )

    if (tile) {
      navigate(`/tile/${tile.id}`)
    }
  }

  const onDraw = async (e) => {
    if (!mode) return
    if (e.editType === 'addFeature') {
      const mapInstance = map.current.getMap()
      // get currentZoom
      const currentZoom = Math.round(mapInstance.getZoom())
      const coords = e.data[0].geometry.coordinates[0]

      const data = await axios.post('http://localhost:3000/tile', {
        coords,
        zoom: currentZoom,
      })
    }
  }

  useEffect(() => {
    if (!map.current || !tile) return
    const mapInstance = map.current.getMap()
    const offsetCenter = [tile.center[0] + 0.05, tile.center[1]]
    mapInstance.flyTo({
      center: offsetCenter,
      zoom: 13,
    })
  }, [tile, map.current])

  useEffect(() => {
    if (!map.current) return
    const mapInstance = map.current.getMap()
    mapInstance.showTileBoundaries = mode == CREATE_MODE
  }, [map.current, mode])

  return (
    <Container>
      <MapWrapper mapRef={map} onClick={handleMapClick}>
        {tilesLayerData.map((data) => (
          <Source {...data} key={`Tile_${data.id}`}>
            <Layer
              id={`${data.id}_layer`}
              type="raster"
              source={data.id}
              paint={{
                'raster-opacity': tileOpacity,
              }}
            />
          </Source>
        ))}
        <Editor
          // to make the lines/vertices easier to interact with
          clickRadius={12}
          mode={mode}
          onUpdate={onDraw}
          features={[]}
        />
      </MapWrapper>
      <MapControlsContainer>
        <Card h={300}>
          Tile opacity
          <Slider
            w={200}
            min={0}
            max={1}
            step={0.05}
            onChange={setTileOpacity}
            value={tileOpacity}
          />
          <Select
            label="Mode"
            data={[
              { value: null, label: 'View' },
              { value: CREATE_MODE, label: 'Create' },
            ]}
            onChange={(value) => setMode(value)}
            value={mode}
            dropdownPosition="bottom"
          />
        </Card>
      </MapControlsContainer>
    </Container>
  )
}

export default MapContainer
