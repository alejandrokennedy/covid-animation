//---------------------------------------------------------
// SETUP
// //------------------------------------------------------
// // MISCELLANEOUS VARIABLES SETUP

const opacity = 0.7
const avgNum = 14
const excludedStates = ["66", "69", "72", "78"]
const duration = 225

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

//---------------------------------------------------------
// DATA

async function getData() {
  const us = await d3.json('./data/us.json')
  const rawCountiesUnfiltered = await d3.csv('https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv')
  const rawStatesUnfiltered = await d3.csv('https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv')
  const statePop = await d3.csv('./data/statePop.csv')
  const countyPopUglyFips = await d3.csv('./data/countyPopUglyFips.csv')

  // //------------------------------------------------------
  // // MAP DATA

  us.objects.counties.geometries.forEach(d => {
    let str = d.id.toString()
    d.id = str.length === 4 ? '0'.concat(str) : str
  })

  const usStates = topojson.feature(us, us.objects.states)
  const projection = d3.geoAlbersUsa().fitExtent([[0, mapMargin.top], [mapWidth, mapHeight]], usStates)
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

  // //------------------------------------------------------
  // // COVID DATA

  // // // COVID DATA FUNCTIONS & HELPER VARIABLES

  const features = new Map(topojson.feature(us, us.objects.counties).features.map(d => [d.id, d]))

  const id = d => d.fips || `${d.county}, ${d.state}`

  function position({ fips, state, county }) {
    if (!fips)
      switch (`${county}, ${state}`) {
        case 'New York City, New York':
          return projection([-74.0060, 40.7128]);
        case 'Kansas City, Missouri':
          return projection([-94.5786, 39.0997]);
        case 'Joplin, Missouri':
          return projection([-94.5133, 37.0842]);
      }
    const feature = features.get(fips);
    return feature && path.centroid(feature);
  }

  const processData = data => {
    const tempArr = Array.from(new Array(avgNum), d => 0);
    const returnMap = new Map();
  
    data.forEach((d, i) => {
      const newCases = Math.max(
        d.cases - (data[i - 1] ? data[i - 1].cases : 0),
        0
      );
  
      tempArr.push(newCases);
      if (tempArr.length > avgNum) tempArr.shift();
      const sma = d3.mean(tempArr);
      const smaRound = Math.round(sma);
  
      const popPerHundThou = data[0].county
        ? countiesPop.get(id(d)) / 100000
        : statesPop.get(d.fips) / 100000;
  
      const perHundThou = smaRound / popPerHundThou;
  
      returnMap.set(d.date, {
        newCases: newCases,
        sma: sma,
        smaRound: smaRound,
        perHundThou: perHundThou
      });
    });
  
    return returnMap;
  }

  // // // COVID DATA TRANSFORMATIONS

  const rawStates = rawStatesUnfiltered.filter(d => !excludedStates.includes(d.fips))
  const rawCounties = rawCountiesUnfiltered.filter(d => !excludedStates.includes(d.fips.slice(0, 2)))
  
  const states = Array.from(d3.group(rawStates, d => d.state).keys())
  const countyPositions = new Map(
    d3.groups(rawCounties, id)
    .map(([id, [d]]) => [id, position(d)])
    .filter(([, position]) => position)
  )

  const dates = Array.from(d3.group(rawStates, d => d.date).keys())

  // //------------------------------------------------------
  // // POPULATION DATA

  const statesPop = new Map(
    statePop.map(d => [d3.format('02')(d.STATE), +d.POPESTIMATE2019])
  )

  const cityCounties = [
    {
      STATE: "36",
      COUNTY: null,
      STNAME: "New York",
      CTYNAME: "New York City",
      POPESTIMATE2019: "8336817",
      FIPS: null
    },
    {
      STATE: "29",
      COUNTY: null,
      STNAME: "Missouri",
      CTYNAME: "Kansas City",
      POPESTIMATE2019: "459787",
      FIPS: null
    },
    {
      STATE: "29",
      COUNTY: null,
      STNAME: "Missouri",
      CTYNAME: "Joplin",
      POPESTIMATE2019: "50150",
      FIPS: null
    }
  ]

  const nycAreaCodes = ["36061", "36047", "36081", "36005", "36085"]

  const countyPop = countyPopUglyFips.map(d => {
    d.STATE = d3.format("02")(d.STATE);
    d.COUNTY = d3.format("03")(d.COUNTY);
    d.FIPS = d.STATE.concat(d.COUNTY);
    return d;
  })
  .filter(d => d.COUNTY != '000' && !nycAreaCodes.includes(d.FIPS))
  .concat(cityCounties)

  const popId = d => d.FIPS || `${d.CTYNAME}, ${d.STNAME}`

  const countiesPop = new Map(countyPop.map(d => [popId(d), +d.POPESTIMATE2019]))

  // //------------------------------------------------------
  // // FRAMES DATA

  const statesByPlace = d3.rollup(rawStates, v => processData(v), d => d.state)
  const countiesByPlace = d3.rollup(rawCounties, v => processData(v), d => id(d))
  
  const frames = dates.map(date => ({
    date: date,
  
    states: new Map(
      states.map(state => [
        state,
        statesByPlace.get(state).get(date) || {
          newCases: 0,
          sma: 0,
          smaRound: 0,
          perHundThou: 0
        }
      ])
    ),
  
    counties: Array.from(countyPositions, ([key, value]) => key).map(county => [
      county,
      countiesByPlace.get(county).get(date)
        ? countiesByPlace.get(county).get(date)['smaRound']
        : 0,
      countiesByPlace.get(county).get(date)
        ? countiesByPlace.get(county).get(date)['perHundThou']
        : 0
    ])
  }))
  
  const maxDailyCasesCounties = getMaxDailyCasesCounties()
  function getMaxDailyCasesCounties() {
    let max = 0;
    for (let date of frames) {
      const maxOfDay = d3.max(date.counties.map(d => d[1]));
      if (maxOfDay > max) max = maxOfDay;
    }
    return max;
  }

  // //------------------------------------------------------
  // // DATA: RANKING
  
  function rank(value) {
    const data = Array.from(states, state => ({ state, value: value(state) }));
    data.sort((a, b) => {
      const aVal = a.value ? a.value.smaRound : 0;
      const bVal = b.value ? b.value.smaRound : 0;
      return d3.descending(aVal, bVal);
    });
    for (let i = 0; i < data.length; ++i) data[i].rank = i;
    return data;
  }

  const keyFrames = frames.map(frame => {
    frame.statesRanked = rank(state => frame.states.get(state));
    return frame;
  })

  const nameFrames = d3.groups(keyFrames.flatMap(data => data.statesRanked), d => d.state)
  prev = new Map(nameFrames.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a])))
  next = new Map(nameFrames.flatMap(([, data]) => d3.pairs(data)))

  // ------------------------------------------------------
  // DRAWING
  // //------------------------------------------------------
  // // DRAWING: SCRUBBER
    
  function Scrubber({
    format = value => value,
    initial = 0,
    delay = null,
    autoplay = true,
    loop = true,
    alternate = false
  } = {}) {
    const form = d3.select('#scrubberForm').node()

    let timer = null;
    let direction = 1;
    function start() {
      form.b.textContent = "Pause";
      timer = delay === null
        ? requestAnimationFrame(tick)
        : setInterval(tick, delay);
    }
    function stop() {
      form.b.textContent = "Play";
      if (delay === null) cancelAnimationFrame(timer);
      else clearInterval(timer);
      timer = null;
    }
    function tick() {
      if (delay === null) timer = requestAnimationFrame(tick);
      if (form.i.valueAsNumber === (direction > 0 ? keyFrames.length - 1 : direction < 0 ? 0 : NaN)) {
        if (!loop) return stop();
        if (alternate) direction = -direction;
      }
      form.i.valueAsNumber = (form.i.valueAsNumber + direction + keyFrames.length) % keyFrames.length;
      form.i.dispatchEvent(new CustomEvent("input", {bubbles: true}));
    }
    form.i.oninput = event => {
      if (event && event.isTrusted && timer) form.b.onclick();
      form.value = keyFrames[form.i.valueAsNumber];
    };
    form.b.onclick = () => {
      if (timer) return stop();
      direction = alternate && form.i.valueAsNumber === keyFrames.length - 1 ? -1 : 1;
      form.i.valueAsNumber = (form.i.valueAsNumber + direction) % keyFrames.length;
      form.i.dispatchEvent(new CustomEvent("input", {bubbles: true}));
      start();
    };
    form.i.oninput();
    if (autoplay) start();
    else stop();
    return form;
  }

    const scrubber = Scrubber({
      format: ([date]) => formatDate(date),
      delay: duration,
      loop: false
    })

  d3.select('#scrubInput').attr('max', keyFrames.length - 1)

  console.log('scrubber', scrubber)


}

getData()