//---------------------------------------------------------
// SETUP

//---------------------------------------------------------
// // PAGE SETUP

const body = d3.select('body')
  .style('margin', '0 auto')

const container = d3.select('#container')
  .style('width', '600px')
  .style('height', '500px')
  .style('margin', '0 auto')
  .style('border', '2px solid aqua')

const bounds = container.node().getBoundingClientRect()

//---------------------------------------------------------
// // GRAPHICAL ELEMENTS SETUP

const mapWidth = bounds.width
const mapHeight = mapWidth / 1.6

const mapSvg = container.append('svg').attr('class', 'mapSvg')
  .attr('viewBox', `0 0 ${mapWidth}, ${mapHeight}`)

//---------------------------------------------------------
// // MISCELLANEOUS VARIABLES SETUP

// ...

//---------------------------------------------------------
// DATA

//---------------------------------------------------------
// // SETUP DATA

async function getData() {
  const us = await d3.json('./data/us.json')

  //---------------------------------------------------------
  // // MAP DATA

  const usStates = topojson.feature(us, us.objects.states)

  const projection = d3.geoAlbersUsa()
    .fitWidth(mapWidth, usStates)

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