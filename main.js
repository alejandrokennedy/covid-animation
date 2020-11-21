//---------------------------------------------------------
// SETUP
// //------------------------------------------------------
// // PAGE SETUP

const body = d3.select('body')
  .style('margin', '0 auto')

const container = d3.select('#container')
  // .style('width', '100%')
  // .style('height', '500px')
  .style('max-width', '625px')
  .style('position', 'relative')
  .style('margin', '0 auto')
  .style('border', '2px solid orangered')

const containerBounds = container.node().getBoundingClientRect()
const containerWidth = containerBounds.width

// //------------------------------------------------------
// // MAP SETUP

const mapMargin = {top: 200, right: 0, bottom: 0, left: 0}

const mapContainer = d3.select('#map-container')
  .style('border', '2px solid aqua')

const mapBounds = mapContainer.node().getBoundingClientRect()
const mapWidth = mapBounds.width
const mapHeight = (mapWidth / 1.6) + mapMargin.top

// //------------------------------------------------------
// // CANVAS SETUP

const dpi = window.devicePixelRatio

const mapCanvas = mapContainer.append('canvas').attr('class', 'mapCanvas')
  .style('position', 'absolute')
  .style("width", `${mapWidth}px`)
  .style("height", `${mapHeight}px`)
  .attr("width", `${mapWidth * dpi}`)
  .attr("height", `${mapHeight * dpi}`)

// //------------------------------------------------------
// // SVG SETUP

const mapSvg = mapContainer.append('svg').attr('class', 'mapSvg')
  .attr('viewBox', `0 0 ${mapWidth}, ${mapHeight}`)

// //------------------------------------------------------
// // MISCELLANEOUS VARIABLES SETUP

// ...

//---------------------------------------------------------
// DATA

async function getData() {
  const us = await d3.json('./data/us.json')

  // //------------------------------------------------------
  // // MAP DATA

  const usStates = topojson.feature(us, us.objects.states)

  const projection = d3.geoAlbersUsa()
    // .fitWidth(mapWidth, usStates)
    // .fitSize([mapWidth, mapHeight], usStates);
    .fitExtent([[0, mapMargin.top], [mapWidth, mapHeight]], usStates)

    // .fitExtent([[0, 0], [width, height]], object);
    // .fitSize([width, height], object);
    

    // .translate([mapWidth/2, mapHeight / 2])

  const path = d3.geoPath().projection(projection)

  // mapSvg.append('path')
  // .append('path')
  //   .datum(topojson.feature(us, us.objects.nation))
  //   .attr('d', path)
    // .attr('fill', 'none');

  mapSvg.append('path')
    .datum(topojson.mesh(us, us.objects.states))
    .attr('stroke', '#aaa')
    .attr('fill', 'none')
    .attr('d', path)
    .attr('stroke-linejoin', 'round');
}

getData()