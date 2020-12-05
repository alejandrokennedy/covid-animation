//---------------------------------------------------------
// SETUP
// //------------------------------------------------------
// // MISCELLANEOUS VARIABLES SETUP

const opacity = 0.7
const avgNum = 14
const duration = 225
const excludedStates = ["66", "69", "72", "78"]

// //------------------------------------------------------
// // PAGE SETUP

const body = d3.select('body')
  .style('margin', '0 auto')
  .style('font-family', 'helvetica')
  .style('font-size', '12px')

const container = d3.select('#container')
  // .style('width', '100%')
  // .style('height', '500px')
  .style('max-width', '625px')
  .style('position', 'relative')
  .style('margin', '0 auto')
  // .style('border', '2px solid orangered')

const containerBounds = container.node().getBoundingClientRect()
const containerWidth = containerBounds.width

const legendContainer = d3.select('#legendContainer')
  .style('display', 'flex')
  .style('flex-direction', 'row')

// //------------------------------------------------------
// // MAP SETUP

const mapMargin = {top: 200, right: 0, bottom: 0, left: 0}

const mapContainer = d3.select('#map-container')
  // .style('border', '2px solid aqua')

const mapBounds = mapContainer.node().getBoundingClientRect()
const mapWidth = mapBounds.width
const mapHeight = (mapWidth / 1.6) + mapMargin.top

const spikeMax = mapMargin.top + 140
const spikeWidth = mapWidth / 90

// for chart
const width = mapWidth
const height = 900

// //------------------------------------------------------
// // CANVAS SETUP

const dpi = window.devicePixelRatio

const mapCanvas = mapContainer.append('canvas').attr('class', 'mapCanvas')
  .style('position', 'absolute')
  .style("width", `${mapWidth}px`)
  .style("height", `${mapHeight}px`)
  .attr("width", `${mapWidth * dpi}`)
  .attr("height", `${mapHeight * dpi}`)

const ctx = mapCanvas.node().getContext('2d')
ctx.scale(dpi, dpi)

// //------------------------------------------------------
// // MAP SVG SETUP

const mapSvg = mapContainer.append('svg').attr('class', 'mapSvg')
  .attr('viewBox', `0 0 ${mapWidth}, ${mapHeight}`)

// //------------------------------------------------------
// // CHART SVG SETUP

const chartSvg = d3.select('#chart-container').append('svg')
  .attr('id', 'chartSvg')
  .attr('viewBox', `0 0 ${width} ${height}`)
  // .style('border', '2px solid gold')

// //------------------------------------------------------
// // COLOR LEGEND SETUP

const colorContainer = d3.select('#colorContainer')

function legend({
  color,
  title,
  tickSize = 6,
  width = 320,
  height = 44 + tickSize,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = width / 64,
  tickFormat,
  tickValues
} = {}) {

  const svg = colorContainer.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block");

  let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

    svg.append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
  }

  // Sequential
  else if (color.interpolator) {

    x = Object.assign(color.copy()
        .interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
        {range() { return [marginLeft, width - marginRight]; }});

    svg.append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.interpolator()).toDataURL())
      .attr('opacity', opacity);

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds
        = color.thresholds ? color.thresholds() // scaleQuantize
        : color.quantiles ? color.quantiles() // scaleQuantile
        : color.domain(); // scaleThreshold

    const thresholdFormat
        = tickFormat === undefined ? d => d
        : typeof tickFormat === "string" ? d3.format(tickFormat)
        : tickFormat;

    x = d3.scaleLinear()
        .domain([-1, color.range().length - 1])
        .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.range())
      .join("rect")
        .attr("x", (d, i) => x(i - 1))
        .attr("y", marginTop)
        .attr("width", (d, i) => x(i) - x(i - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", d => d);

    tickValues = d3.range(thresholds.length);
    tickFormat = i => thresholdFormat(thresholds[i], i);
  }

  // Ordinal
  else {
    x = d3.scaleBand()
        .domain(color.domain())
        .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.domain())
      .join("rect")
        .attr("x", x)
        .attr("y", marginTop)
        .attr("width", Math.max(0, x.bandwidth() - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", color);

    tickAdjust = () => {};
  }

  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x)
      .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
      .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
      .tickSize(tickSize)
      .tickValues(tickValues))
    .call(tickAdjust)
    .call(g => g.select(".domain").remove())
    .call(g => g.append("text")
      .attr("x", marginLeft)
      .attr("y", marginTop + marginBottom - height - 6)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .text(title));

  return svg.node();
}

function ramp(color, n = 256) {
  const canvas = d3.create('canvas')
    .attr('width', n)
    .attr('height', 1)
    .attr('id', 'legCanvEl')

  const context = canvas.node().getContext("2d");
  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1));
    context.fillRect(i, 0, 1, 1);
  }
  return canvas.node();
}

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

  console.log('maxDailyCasesCounties', maxDailyCasesCounties)

  const maxPerHundThouCounties = getMaxPerHundThouCounties()
  function getMaxPerHundThouCounties() {
    let max = 0;
    for (let date of frames) {
      const maxOfDay = d3.max(date.counties.map(d => d[2]));
      if (maxOfDay > max) max = maxOfDay;
      // if (maxOfDay > 250)
        // console.log(
        //   // date.date,
        //   // 'county: ' +
        //   //   date.counties[d3.maxIndex(date.counties.map(d => d[2]))][0],
        //   // 'state: ' +
        //   // fipsToStateLookup.get(
        //   //   date.counties[d3.maxIndex(date.counties.map(d => d[2]))][0].slice(
        //   //     0,
        //   //     2
        //   //   )
        //   // ),
        //   // 'cases: ' + date.counties[d3.maxIndex(date.counties.map(d => d[2]))][1],
        //   // 'pop: ' +
        //   countiesPop.get(
        //     date.counties[d3.maxIndex(date.counties.map(d => d[2]))][0]
        //   )
        //   // maxOfDay
        // );
    }
    return max;
  }

  console.log('maxPerHundThouCounties', maxPerHundThouCounties)
  console.log('maxDailyCasesCounties', maxDailyCasesCounties)

  const length = d3.scaleLinear()
    .domain([0, maxDailyCasesCounties])
    .range([0, spikeMax])

  // const interpolator = d3.interpolateRgb('#F53844', '#42378F')
  // const interpolator = d3.piecewise(d3.interpolateHsl, ['#0000ff', '#ff3b3b', '#ff0000'])
  // const interpolator = d3.piecewise(d3.interpolateHsl, ['#0400ff', '#ff0000', '#ff0000', '#ff0000', '#ff0000'])
  const interpolator = d3.piecewise(d3.interpolateHsl, ['#0400ff', '#ff0000', '#ff5900', '#ffb300', '#ffff00'])
  // const interpolator = d3.piecewise(d3.interpolateHsl, ['#0000ff', '#c9ff87', '#700000'])
  const color = d3.scaleSequential(interpolator)
    .domain([0, maxPerHundThouCounties])
    // .domain([0, 150])
    // .domain([150, 0])
    .clamp(true)

  legend({
    color: color,
    title: "New Cases Per 100,000 People",
    width: mapWidth / 1.8,
    marginLeft: 15,
    marginRight: 15
  })

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

  const protoKeyFrames = frames.map(frame => {
    frame.statesRanked = rank(state => frame.states.get(state));
    return frame;
  })
  const keyFrames = protoKeyFrames.slice(26)
  const prevKF = new Map(d3.pairs(keyFrames, (a, b) => [b, a]))
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
    // format: ([date]) => formatDate(date),
    delay: duration,
    loop: false
  })

  const scrubSelect = d3.select(scrubber)
    .on('input', function() { scrub(this) })
  
  d3.select('#scrubInput').attr('max', keyFrames.length - 1)

  // //------------------------------------------------------
  // // DRAWING: SPIKES

  const draw = frame => {
    ctx.clearRect(0, 0, mapWidth, mapHeight);
    frame.counties.forEach((d, i) => {
      const xPos = countyPositions.get(d[0])[0];
      const yPos = countyPositions.get(d[0])[1];
      ctx.beginPath();
      ctx.moveTo(xPos - spikeWidth / 2, yPos);
      ctx.lineTo(xPos + spikeWidth / 2, yPos);
      ctx.lineTo(xPos, yPos - length(d[3]));
      ctx.closePath();
      ctx.fillStyle = color(d[2]).split(')')[0] + `, ${opacity})`;
      ctx.fill();
    });
  }

  const update = frame => {
    try {
      const prevCounties = prevKF.get(frame).counties;
      const timer = d3.timer(elapsed => {
        const t = Math.min(1, d3.easeLinear(elapsed / duration));
        frame.counties.forEach((d, i) => {
          const tweenCount = prevCounties[i][1] * (1 - t) + d[1] * t;
          d.splice(3, 1, tweenCount);
        });
        draw(frame);
        if (t === 1) timer.stop();
      });
    } catch {
      frame.counties.forEach(d => d.splice(3, 1, d[1]));
    }
  }

  // //------------------------------------------------------
  // // DRAWING: SPIKE LEGEND
  
  const makeSpike = length => `M${-spikeWidth / 2},0L0,${-length}L${spikeWidth / 2},0`

  const spikeLegend = mapSvg.append('g')
    .attr('class', 'spikeLegend')
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)

  const spikeLegendGs = spikeLegend.selectAll('g')
    .data(length.ticks(4).slice(1).reverse())
   .join('g')
    .attr('transform', (d, i) => `translate(${mapWidth + 10 - (i + 1) * 15},${mapHeight - 13})`)

  spikeLegendGs.append('path')
    .style('opacity', opacity)
    .attr('d', d => makeSpike(length(d)))

  spikeLegendGs.append('text')
    .attr('dy', '1.1em')
    .text(length.tickFormat(4, "s"))

  spikeLegend.append('text')
    .attr('dy', '1.1em')
    .attr('text-anchor', 'end')
    .attr("font-weight", "bold")
    .attr('transform', `translate(${mapWidth - 75},${mapHeight - 13})`)
    .text('New Cases')

  //------------------------------------------------------
  // BARS
  // //------------------------------------------------------
  // // BARS: FUNCTIONS

  const margin = { top: 10, right: 50, bottom: 6, left: 170 }

  const x = d3.scaleLinear()
    .domain([0, 1])
    .range([margin.left, width - margin.right])

  const y = d3.scaleBand()
    .domain(d3.range(states.length))
    .rangeRound([margin.top, height - margin.top - margin.bottom])
    .padding(0.1)

  const xAxis = d3
    .axisTop(x)
    .tickSizeOuter(0)
    .tickSizeInner(-height + margin.top + margin.bottom)

  const axis = svg => {
    const g = svg.append('g').attr('transform', `translate(0,${margin.top})`);
  
    return (_, transition, largestBarVal) => {
      const min = Math.floor(largestBarVal);
      const max = width / 160;
      xAxis.ticks(min > max ? max : min);
  
      g.transition(transition).call(xAxis);
      // g.select('.tick:first-of-type text').remove();
      g.selectAll('.tick line').attr('stroke', 'white');
      g.select('.domain').remove();
    };
  }

  const labels = svg => {
    let label = svg
      .append('g')
      .style("font", "bold 12px var(--sans-serif)")
      .style("font-variant-numeric", "tabular-nums")
      .attr('text-anchor', 'end')
      .selectAll('text');
  
    return (data, transition) =>
      (label = label
        .data(data.statesRanked, d => d.state)
        .join(
          enter =>
            enter
              .append('text')
              // change
              .attr('transform', d => `translate(${(x(0), y(d.rank))})`)
              .attr('y', y.bandwidth() / 2)
              .attr('x', -4)
              .attr('dy', '0.25em')
              // .attr('text-anchor', 'end')
              .style('opacity', 0)
              .text(d => d.state),
          update => update,
          exit => exit.transition(transition).remove()
        )
        .call(label =>
          label
            .transition(transition)
            .attr(
              'transform',
              d =>
                `translate(${d.value ? x(d.value.smaRound) : x(0)}, ${y(d.rank)})`
            )
            .style('opacity', d => (d.value.smaRound === 0 ? 0 : 1))
        ));
  }

  const values = svg => {
    let value = svg
      .append('g')
      .style("font", "12px var(--sans-serif)")
      .style("font-variant-numeric", "tabular-nums")
      .attr('text-anchor', 'start')
      .selectAll('text');
  
    return (data, transition) =>
      (value = value
        .data(data.statesRanked, d => d.state)
        .join(
          enter =>
            enter
              .append('text')
              // change
              .attr('transform', d => `translate(${(x(0), y(d.rank))})`)
              .attr('y', y.bandwidth() / 2)
              .attr('x', 3)
              .attr('dy', '0.25em')
              .style('opacity', 0)
              .text(d => (d.value ? d.value.smaRound : 0)),
          update => update,
          exit => exit.transition(transition).remove()
        )
        .call(value => {
          return value
            .transition(transition)
            .attr(
              'transform',
              d =>
                `translate(${d.value ? x(d.value.smaRound) : x(0)}, ${y(d.rank)})`
            )
            .style('opacity', d => (d.value.smaRound === 0 ? 0 : 1))
            .tween('text', d => {
              if (!prev.get(d) && d.value) return textTween(0, d.value.smaRound);
              return prev.get(d) && d.value
                ? !prev.get(d).value
                  ? textTween(0, d.value.smaRound)
                  : textTween(prev.get(d).value.smaRound, d.value.smaRound)
                : textTween(0, 0);
            });
        }));
  }

  function textTween(a, b) {
    const i = d3.interpolateNumber(a, b);
    return function(t) {
      this.textContent = formatNumber(i(t));
    };
  }

  const formatDate = d3.utcFormat("%B %d")
  const parseDate = d3.timeParse("%Y-%m-%d")

  const ticker = svg => {
    const now = svg.append('g').append("text")
        .attr("transform", `translate(${mapWidth * 0.677},${mapHeight - mapHeight / 30})`)
        // .style("font", `bold ${barSize}px var(--sans-serif)`)
        .style("font", `bold ${10}px var(--sans-serif)`)
        .style("font-variant-numeric", "tabular-nums")
        .style("text-anchor", "middle")
        .style("font-size", `${d3.min([mapWidth/20, 32])}px`)
        .text(formatDate(parseDate(keyFrames[0].date)));
  
    return transition => now.text(formatDate(parseDate(transition.date)))
  }

  const formatNumber = d3.format(",d")

  const bars = svg => {
    let bar = svg
      .append('g')
      .attr('fill-opacity', 0.4)
      .selectAll('rect');
  
    return (data, transition) => {
      return (bar = bar
        .data(data.statesRanked, d => d.state)
        .join(
          enter =>
            enter
              .append("rect")
              // .attr("fill", color)
              .attr("height", y.bandwidth())
              .attr("x", x(0))
              // .attr("y", d => y((prev.get(d) || d).rank))
              .attr("y", d => y.range()[1])
              .attr("width", d => x((prev.get(d) || d).value.smaRound) - x(0)),
          update => update,
          exit =>
            exit
              .transition(transition)
              .remove()
              // .attr("y", d => y((next.get(d) || d).rank))
              .attr("y", d => y(d.rank))
              // .attr("width", d => x((next.get(d) || d).value) - x(0))
              .attr("width", d => x(d.value - x(0)))
        )
        .call(bar =>
          bar
            .transition(transition)
            .attr("y", d => y(d.rank))
            .attr("width", d => (d.value ? x(d.value.smaRound) - x(0) : 0))
            .attr('fill', d => color(d.value.perHundThou))
        ));
    };
  }

  // //------------------------------------------------------
  // // BARS: DRAWING THINGS

  const updateBars = bars(chartSvg);
  const updateAxis = axis(chartSvg);
  const updateLabels = labels(chartSvg);
  const updateValues = values(chartSvg);
  const updateTicker = ticker(mapSvg);

  function scrub(form) {
    const keyframe = form.value

    const transition = chartSvg.transition()
      .duration(duration)
      .ease(d3.easeLinear)

    // const transition2 = mapSvg.transition()
    //   .duration(duration)
    //   .ease(d3.easeLinear)

    const largestBarVal = d3.max([keyframe.statesRanked[0].value.smaRound, 1]);
    x.domain([0, largestBarVal]);

    updateAxis(keyframe, transition, largestBarVal);
    updateBars(keyframe, transition);
    updateLabels(keyframe, transition);
    updateValues(keyframe, transition);
    updateTicker(keyframe, transition);

    update(keyframe)
  }
} // getData callback

getData()