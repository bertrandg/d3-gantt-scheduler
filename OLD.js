"use strict";

var nbMinVisible = 3;
var nbSecVisibleZoomed = 30;
var refreshTimeDelay = 500;

var margin = {top: 20, right: 20, bottom: 110, left: 50};
var margin2 = {top: 430, right: 20, bottom: 30, left: 40};
var width = 750 - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;
var height2 = 500 - margin2.top - margin2.bottom;

var isTimeMoving = false;
var isDataAdding = false;
var timeInterval = null;

var debug = false;
var ui = {
  isLine: true,
  isPoints: true,
}

////////////////////////////////////////////
////////////////////////// DECLARATIONS ////

var elem = {
  svg: null,        // d3.select('body').append('svg')
    main: null,      // svg.append('g')
      lineMain: null,
      dots: null,       // elem.main.append('g');
      nowMain: null,
      axisMainX: null,  // elem.main.append('g')
      axisMainY: null,  // elem.main.append('g')
      
    context: null,    // svg.append('g')
      lineContext: null,
      dots2: null,      // elem.context.append('g');
      nowContext: null,
      axisContextX: null, // elem.context.append('g');
      brush: null         // elem.context.append('g')
};

var scale = {
  mainX: d3.scaleTime().range([0, width]),
  mainY: d3.scaleLinear().range([height, 0]),
  contextX: d3.scaleTime().range([0, width]),
  contextY: d3.scaleLinear().range([height2, 0]),
};

var axis = {
  mainX: d3.axisBottom(scale.mainX).ticks(8),
  mainY: d3.axisLeft(scale.mainY),
  contextX: d3.axisBottom(scale.contextX).ticks(d3.timeMinute, 1).tickFormat(d3.timeFormat('%H:%M')),
};
  
var brush = d3.brushX()
    .extent([[0, 0], [width, height2]])
    .on('brush', brushed);

if(ui.isLine) {
  var valuelineMain = d3.line()
    .defined(d => d.value)
    .x(d => scale.mainX(d.date))
    .y(d => scale.mainY(d.value));
    
  var valuelineContext = d3.line()
    .defined(d => d.value)
    .x(d => scale.contextX(d.date))
    .y(d => scale.contextY(d.value));
}

////////////////////////////////////////////
////////////////////////// START BOUZIN ////

var initialRange = getRangeNow(nbMinVisible);
var initialData = generateInitialData(initialRange);

initAxis(initialRange);
buildDom();
addLegend();
updateData(initialData);

startStopTime();
startStopData();

////////////////////////////////////////////
///////////////////////////////// LOOPS ////

function startStopTime() {
  if(isTimeMoving) {
    clearInterval(timeInterval);
    
    // hide 2 NOW lines
    elem.nowMain.attr('visibility', 'hidden');
    elem.nowContext.attr('visibility', 'hidden');
  }
  else {
    timeInterval = setInterval(() => refreshTimeAxis(), refreshTimeDelay);
    
    // show 2 NOW lines
    refreshNowPosition();
    elem.nowMain.attr('visibility', 'visible');
    elem.nowContext.attr('visibility', 'visible');
  }
  
  isTimeMoving = !isTimeMoving;
}

function startStopData() {
  if(!isDataAdding) {
    isDataAdding = true
    addData(initialData[initialData.length-1].value);
  }
  else {
    isDataAdding = false;
  }
}

function addData(v) {
  v = v - Math.round(Math.random()*10) + Math.round(Math.random()*5);
  
  var d = {
    date: new Date(),
    value: v,
    uniqId: initialData[initialData.length-1].uniqId + 1
  }
  initialData.push(d);
  
  updateData(initialData);
  
  // check if array first elem date before current chart starting date
  // if true > remove it (allow to avoid svg accumulation and memory leak)
  var minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() - nbMinVisible);
  
  if(initialData[0].date < minDate) {
    initialData.shift();
  }
  
  if(isDataAdding) {
    var delay = 200 + Math.round(Math.random()*100);
    setTimeout(() => addData(v), delay);
  }
}

////////////////////////////////////////////
///////////////////////////////// BUILD ////

function initAxis(range) {
  scale.mainX.domain(range);
  scale.mainY.domain([0, 8000]);
  
  scale.contextX.domain(scale.mainX.domain());
  scale.contextY.domain(scale.mainY.domain());
}

function buildDom() {
  elem.svg = d3.select('body').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);
  
  elem.svg.append('defs')
    .append('clipPath')
      .attr('id', 'clip')
    .append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'red');
  
  ///
  
  elem.main = elem.svg.append('g')
    .attr('class', 'main')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  
  elem.axisMainX = elem.main.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', 'translate(0,' + height + ')')
    .call(axis.mainX);
  
  elem.axisMainY = elem.main.append('g')
    .attr('class', 'axis axis--y')
    .call(axis.mainY);
  
  if(ui.isPoints) {
    elem.dots = elem.main.append('g')
      .attr('clip-path', 'url(#clip)');
  }
  if(ui.isLine) {
    elem.lineMain = elem.main.append('path')
      .attr('class', 'line')
      .attr('d', valuelineMain(initialData));
  }
    
  elem.nowMain = elem.main.append('line')
    .attr('x1', d => scale.mainX(new Date()))
    .attr('y1', d => scale.mainY.range()[0])
    .attr('x2', d => scale.mainX(new Date()))
    .attr('y2', d => scale.mainY.range()[1])
    .style('stroke', 'blue');
  
  ///
  
  elem.context = elem.svg.append('g')
    .attr('class', 'context')
    .attr('transform', 'translate(' + margin2.left + ',' + margin2.top + ')');
  
  elem.axisContextX = elem.context.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', 'translate(0,' + height2 + ')')
    .call(axis.contextX);
  
  if(ui.isPoints) {
    elem.dots2 = elem.context.append('g')
      .attr('clip-path', 'url(#clip)');
  }
  if(ui.isLine) {
    elem.lineContext = elem.context.append('path')
      .attr('class', 'line')
      .attr('d', valuelineContext(initialData));
  }
  
  elem.nowContext = elem.context.append('line')
      .attr('x1', d => scale.contextX(new Date()))
      .attr('y1', d => scale.contextY.range()[0])
      .attr('x2', d => scale.contextX(new Date()))
      .attr('y2', d => scale.contextY.range()[1])
      .style('stroke', 'blue');
  
  ///
  
  // set brush zone to last 'nbSecVisibleZoomed' seconds
  var endBrushDomain = scale.contextX.domain()[1];
  var startBrushDomain = new Date(endBrushDomain.getTime());
  startBrushDomain.setSeconds(startBrushDomain.getSeconds() - nbSecVisibleZoomed);
  var brushRange = [scale.contextX(startBrushDomain), scale.contextX(endBrushDomain)];
  
  elem.brush = elem.context.append('g')
    .attr('class', 'brush')
    .call(brush)
    .call(brush.move, brushRange);
}

function addLegend() {
  elem.main.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left)
    .attr('x', 0 - (height / 2))
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .text('VALUE');  
  
  var now = new Date();
  var label = `${nbMinVisible} LAST MINUTES (started at ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()})`;
  
  elem.svg.append('text')             
    .attr('transform', `translate(${ (width + margin.right + margin.left)/2 },${ height + margin.top + margin.bottom })`)
    .style('text-anchor', 'middle')
    .text(label);
}

////////////////////////////////////////////
//////////////////////////////// UPDATE ////

function updateData(all) {
  
  if(ui.isPoints) {
    var updatePts = elem.dots.selectAll('.point')
      .data(all, d => d.uniqId);
    updatePts.style('fill', 'black');
        
    var enterPts = updatePts.enter();
    enterPts.append('rect')
        .attr('class', 'point')
        .attr('x', d => scale.mainX(d.date))
        .attr('y', d => scale.mainY(d.value))
        .attr('width', 1)
        .attr('height', 4)
        .style('fill', 'red');
    
    // Tried with circles but took make main graph lag when dragging context fast.
    /*enterPts.append('circle')
        .attr('class', 'point')
        .attr('cx', d => scale.mainX(d.date))
        .attr('cy', d => scale.mainY(d.value))
        .attr('r', 1)
        .style('fill', 'red');*/
    
    // need to have an identifier fct inside .data() call to be effective
    var exitPts = updatePts.exit();
    exitPts.remove();
    
    if(debug) {
      console.log('UPDATE: ', updatePts.nodes().length, ' / ENTER: ', enterPts.nodes().length, ' / EXIT: ', exitPts.nodes().length);
      console.log('ARRAY POINTS LENGTH: ', all.length, ' / NB POINT SVG INSIDE DOM: ', document.querySelectorAll('.point').length);
      console.log('--------------------');
    }
  }
  
  if(ui.isLine) {
    elem.lineMain.attr('d', valuelineMain(all));
  }
  
  //////
  
  if(ui.isPoints) {
    var updateDots = elem.dots2.selectAll('.dotContext')
        .data(all);
        
    updateDots.enter()
        .append('circle')
          .attr('class', 'dotContext')
          .attr('r', 1)
          .attr('cx', d => scale.contextX(d.date))
          .attr('cy', d => scale.contextY(d.value))
          .style('opacity', .5);
    
    updateDots.exit()
      .remove();
  }
  
  if(ui.isLine) {
    elem.lineContext.attr('d', valuelineContext(all));
  }
}

function refreshTimeAxis() {
  refreshNowPosition();
  
  // A. recalculate range 
  var newRange = getRangeNow(nbMinVisible);
  
  // B. Update contextX scale based on new range
  scale.contextX.domain(newRange);
  
  // C1. Animated transition for contextX axis based on new 'scale.contextX'
  elem.axisContextX
    .call(d3.axisBottom(scale.contextX).ticks(d3.timeMinute, 1).tickFormat(d3.timeFormat('%H:%M')));
  
  if(ui.isPoints) {
    // C2. Animated transition for 'cx' prop for all dot based on new 'scale.contextX'
    elem.dots2.selectAll('.dotContext')
      .attr('cx', d => scale.contextX(d.date));
  }
  
  if(ui.isLine) {
    elem.lineMain.attr('d', valuelineMain(initialData));
  }
  
  // D. Update mainX scale based on brush selection applied on new 'scale.contextX'
  var selection = d3.brushSelection(elem.brush.node())
  scale.mainX.domain(selection.map(scale.contextX.invert, scale.contextX));
      
  // E1. Animated transition for mainX axis based on new 'scale.mainX'
  elem.main.select('.axis--x')
      .call(axis.mainX);
  
  if(ui.isPoints) {
    // E2. Animated transition for 'x' prop for all point based on new 'scale.mainX'
    elem.main.selectAll('.point')
        .attr('x', d => scale.mainX(d.date));
  }
  
  if(ui.isLine) {
    elem.lineContext.attr('d', valuelineContext(initialData));
  }
}

function brushed() {
  if(isTimeMoving) {
    refreshNowPosition();
  }
  
  var selection = d3.event.selection;
  
  scale.mainX.domain(selection.map(scale.contextX.invert, scale.contextX));
  
  if(ui.isPoints) {
    elem.main.selectAll('.point')
      .attr('x', d => scale.mainX(d.date))
      .attr('y', d => scale.mainY(d.value));
  }
        
  elem.main.select('.axis--x').call(axis.mainX);
  
  if(ui.isLine) {
    elem.lineMain.attr('d', valuelineMain(initialData));
  }
}

function refreshNowPosition() {
  var now = new Date();
  var newPosX = scale.mainX(now);
  
  elem.nowMain
      .attr('x1', newPosX)
      .attr('x2', newPosX);
  
  var newPosX2 = scale.contextX(now);
  elem.nowContext
      .attr('x1', newPosX2)
      .attr('x2', newPosX2);
}

////////////////////////////////////////////
///////////////////////////////// UTILS ////

function getRangeNow(nbMin) {
  var endDate = new Date();
  endDate.setSeconds(endDate.getSeconds() + 3);
  
  var startDate = new Date(endDate.getTime());
  startDate.setMinutes(startDate.getMinutes() - nbMin);
  
  return [startDate, endDate];
}


function generateInitialData(range) {
  var start = new Date(range[0].getTime());
  var end = new Date(range[1].getTime());
  end.setSeconds(end.getSeconds() - 5);
  
  var amplitude = (end.getTime() - start.getTime())/4;
  var startEmpty = new Date(start.getTime() + amplitude)
  var endEmpty = new Date(startEmpty.getTime() + amplitude);
  
  var l = [];
  var v = 6000;
  var uniqId = 1
  
  while(start.getTime() < end.getTime()) {
    var ms = 200 + Math.round(Math.random()*100); //between 200 and 300
    start.setMilliseconds(start.getMilliseconds() + ms);
    
    var d = new Date(start.getTime());
    v = v - Math.round(Math.random()*10) + 4;
    
    l.push({
      date: d,
      value: (d > startEmpty && d < endEmpty) ? null : v,
      uniqId: uniqId
    });
    
    // uniqId property is used by D3 as identifier key
    // Need to add it because date property not enought (failed when using milliseconds.. bc date.toString() )
    // And it failed even using the following code:
    // .data(all, d => d.date.getHours()+d.date.getMinutes()+d.date.getSeconds()+d.date.getMilliseconds());
    uniqId++;
  }
  
  return l;
}
