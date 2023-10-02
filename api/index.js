require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')
const mapbox = require('./mapbox')
const segmenter = require('./segmenter')
const heightmap = require('./heightmap')
const cors = require('cors')
const { combineLandcoverAndRecolor } = require('./landcover')

const app = express()

app.use(cors())
app.use(bodyParser({ limit: '10mb' }))
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const getTile = (path, id) => {
  let tileInfo = {}
  if (fs.existsSync(`${path}/${id}/tile.json`)) {
    tileInfo = JSON.parse(fs.readFileSync(`${path}/${id}/tile.json`))
    tileInfo = {
      ...tileInfo,
      bbox: mapbox.tileToBBOX(tileInfo.tile),
    }
    const zoom = tileInfo.tile[2]
    tileInfo.getMetersPerPixel = mapbox.getMetersPerPixel(
      zoom,
      tileInfo.bbox[1]
    )
  }

  return {
    id,
    ...tileInfo,
  }
}

app.get('/tiles', (req, res) => {
  // get all folders in path
  const tileIds = fs
    .readdirSync('./public/tiles', { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name)

  const tiles = tileIds.map((id) => {
    const tileFolders = fs
      .readdirSync(`./public/tiles/${id}`, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())
    const tiles = tileFolders.map((dir) =>
      getTile(`./public/tiles/${id}`, dir.name)
    )
    const arrayOfBboxes = tiles.map((tile) => tile.bbox)

    // Initialize an empty bbox with high and low values
    let overallBbox = [Infinity, Infinity, -Infinity, -Infinity]

    // Iterate through the array of bboxes and expand the overall bbox
    arrayOfBboxes.forEach((bbox) => {
      const [minX, minY, maxX, maxY] = bbox
      overallBbox = [
        Math.min(minX, overallBbox[0]),
        Math.min(minY, overallBbox[1]),
        Math.max(maxX, overallBbox[2]),
        Math.max(maxY, overallBbox[3]),
      ]
    })
    const minHeight = Math.min(...tiles.map((tile) => tile.minHeight))
    const maxHeight = Math.max(...tiles.map((tile) => tile.maxHeight))

    // check if edited versions exist
    const editedLandcoverFile = `./public/tiles/${id}/landcover_colors_edited.png`
    let landcoverFile = `./public/tiles/${id}/landcover_colors.png`

    if (fs.existsSync(editedLandcoverFile)) {
      landcoverFile = editedLandcoverFile
    }

    const heightmapFile = `./public/tiles/${id}/heightmap_final.png`
    const satelliteFile = `./public/tiles/${id}/sattelite.png`

    return {
      id,
      landcover: fs.existsSync(landcoverFile)
        ? landcoverFile.replace('./public', '')
        : null,
      heightmap: fs.existsSync(heightmapFile)
        ? heightmapFile.replace('./public', '')
        : null,
      satellite: fs.existsSync(satelliteFile)
        ? satelliteFile.replace('./public', '')
        : null,
      bbox: overallBbox,
      center: [
        (overallBbox[0] + overallBbox[2]) / 2,
        (overallBbox[1] + overallBbox[3]) / 2,
      ],
      metersPerPixel: tiles[0].getMetersPerPixel,
      minHeight,
      maxHeight,
      tiles,
    }
  })

  res.send(tiles)
})

app.post('/tile', async (req, res) => {
  const { coords, zoom, islandMask } = req.body
  console.log('POST /tile', coords)

  const tileId = await mapbox.createTile(coords, zoom)
  res.send({
    id: tileId,
  })

  await mapbox.getTileData(tileId)
  if (islandMask) {
    await segmenter.getLandcoversForTile(tileId)
  }
  await combineLandcoverAndRecolor(tileId)
  await heightmap.modifyHeightmap(tileId)

  //   const file = await writeFile(tile)
})

// route to accept posted image
app.post('/tile/:id/landcover', async (req, res) => {
  const { id } = req.params
  console.log('POST /tile/:id/landcover', id)
  const image = req.body.image
  const base64Data = image.replace(/^data:image\/png;base64,/, '')

  // Convert the base64 string back to binary data
  const binaryData = Buffer.from(base64Data, 'base64')

  const outputPath = `./public/tiles/${id}/landcover_colors_edited.png`
  fs.writeFileSync(outputPath, binaryData, 'binary')

  await heightmap.modifyHeightmap(id)
  res.send('Image saved successfully')
})

app.listen(7777, () => {
  console.log('Example app listening on port 7777!')
})
