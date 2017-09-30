//@ts-check

const WIDTH = 800;
const HEIGHT = 400;
const BORDER = 50;
const GAP = 60;

let scaleX, scaleY, axisX, axisY;
let svg, elMain, elDragZone, elContainer, elAxisX, elAxisY, elDateStartAll;
let currentSlot = null;

let dateStartAll = new Date();
dateStartAll.setMinutes(dateStartAll.getMinutes() + 10);
dateStartAll.setSeconds(0);
dateStartAll.setMilliseconds(0);

document.getElementById('startDate').innerHTML = formatDate(dateStartAll);

let data = [
    {id: 1, name: 'B', startAfter: 3 * 60, duration: 4 * 60},
    {id: 4, name: 'C', startAfter: 2 * 60, duration: 3 * 60},
    {id: 5, name: 'D', startAfter: 7 * 60, duration: 10 * 60},
    {id: 2, name: 'A', startAfter: 0 * 60, duration: 3 * 60},
    {id: 3, name: 'A', startAfter: 4 * 60, duration: 2 * 60},
    {id: 6, name: 'A', startAfter: 8 * 60, duration: 4 * 60},
    {id: 7, name: 'A', startAfter: 13 * 60, duration: 2 * 60},
];



function buildDom() {
    scaleX = d3.scaleTime()
        .range([0, WIDTH-BORDER*2])
        .domain([dateStartAll, getDatePlusDuration(dateStartAll, 15*60)]);
    
    scaleY = d3.scalePoint()
        .range([HEIGHT-BORDER*2, 0])
        .padding(.5)
        .domain( getUniqList() );
    
    
    axisX = d3.axisBottom(scaleX).tickSizeInner(-HEIGHT+BORDER*2);
    axisY = d3.axisLeft(scaleY).tickSizeInner(-WIDTH+BORDER*2);

    svg = d3.select('#chart').append('svg')
        .attr('width', WIDTH)
        .attr('height', HEIGHT);

    svg.append('defs')
        .append('clipPath')
            .attr('id', 'clip')
        .append('rect')
            .attr('width', WIDTH-BORDER*2)
            .attr('height', HEIGHT-BORDER*2)
            .style('fill', 'red');

    elMain = svg.append('g')
        .attr('class', 'main')
        .attr('transform', 'translate(' + BORDER + ',' + BORDER + ')')
        .call(d3.zoom()
            .on('zoom', scrollZoom));

    elAxisX = elMain.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', 'translate(0,' + (HEIGHT-BORDER*2) + ')')
        .call(axisX);
    
    elAxisY = elMain.append('g')
        .attr('class', 'axis axis--y')
        .call(axisY);

    elDragZone = elMain.append('rect')
        .attr('class', 'drag-zone')
        .attr('width', WIDTH-BORDER*2)
        .attr('height', HEIGHT-BORDER*2)
        .attr('clip-path', 'url(#clip)')
        .call(d3.drag()
            .on('drag', dragProgress));

    elContainer = elMain.append('g')
        .attr('class', 'container')
        .attr('clip-path', 'url(#clip)');
        
    elDateStartAll = elMain.append('line')
        .attr('class', 'dateStartAll')
        .attr('clip-path', 'url(#clip)')
        .attr('x1', scaleX(dateStartAll))
        .attr('y1', scaleY.range()[0])
        .attr('x2', scaleX(dateStartAll))
        .attr('y2', scaleY.range()[1])
        .style('stroke', 'blue');

    let startZoomK = 1;

    function dragProgress() {
        const [start, end] = scaleX.domain();
        const newStart = scaleX.invert(-d3.event.dx);
        let duration = getDurationBetween(start, newStart);
        
        updateAxisX(getDatePlusDuration(start, duration), getDatePlusDuration(end, duration), 0);
    }
    function scrollZoom() {
        if(d3.event.transform.k > startZoomK) {
            zoomAxisX('in');
        }
        else if(d3.event.transform.k < startZoomK) {
            zoomAxisX('out');
        }
        startZoomK = d3.event.transform.k;
    }
}


function updateData() {
    const updateSlots = elContainer.selectAll('.slot').data(data, d => d.id);
    const exitSlots = updateSlots.exit();
    const enterSlots = updateSlots.enter();
    
    exitSlots.remove();
    
    exitSlots.transition()
        .duration(500)
        .attr('opacity', 0);

    const slotHeight = getSlotHeight();

    const entry = enterSlots.append('g')
        .attr('class', 'slot')
        .attr('uniqid', d => 'id'+d.id)
        .attr('name', d => d.name)
        .attr('transform', d => `translate(${ scaleX(getStart(d)) }, ${ scaleY(d.name) })`);
    
    entry.append('rect')
        .attr('class', 'zone')
        .attr('x', 0)
        .attr('y', -slotHeight/2)
        .attr('width', d => scaleX(getEnd(d)) - scaleX(getStart(d)))
        .attr('height', slotHeight)
        .attr('cursor', 'move')
        .style('fill', d => getColor(d.name))
        .call(d3.drag()
            .on('start', dragZoneStart)
            .on('drag', dragZoneProgress)
            .on('end', dragZoneEnd));

    entry.append('rect')
        .attr('class', 'handlerLeft')
        .attr('x', d => -5)
        .attr('y', d => -slotHeight/2)
        .attr('width', 10)
        .attr('height', slotHeight)
        .attr('cursor', 'ew-resize')
        .style('fill', 'grey')
        .attr('fill-opacity', 0)
        .call(d3.drag()
            .on('start', dragLeftStart)
            .on('drag', dragLeftProgress)
            .on('end', dragLeftEnd));

    entry.append('rect')
            .attr('class', 'handlerRight')
            .attr('x', d => (scaleX(getEnd(d)) - scaleX(getStart(d))) - 5)
            .attr('y', d => -slotHeight/2)
            .attr('width', 10)
            .attr('height', slotHeight)
            .attr('cursor', 'ew-resize')
            .style('fill', 'grey')
            .attr('fill-opacity', 0)
            .call(d3.drag()
                .on('start', dragRightStart)
                .on('drag', dragRightProgress)
                .on('end', dragRightEnd));
    
    let startDragMouseX = null;
    let startDragDuration = null;
    let startDragDate = null;
    
    ///////////////////////////////////////////
    ///////////////////////////////////////////

    function dragZoneStart(slot) {
        startDragMouseX = d3.mouse(this)[0];

        selectSlot(slot.id);
    }
    
    // UPDATE START
    function dragZoneProgress(slot) {
        const moveX = d3.event.x - startDragMouseX;

        const currSlotPosPixelX = scaleX(getStart(slot));
        const tempStartDate = scaleX.invert(currSlotPosPixelX + moveX);
        tempStartDate.setSeconds(0);
        tempStartDate.setMilliseconds(0);

        const newValue = calculateNewValue(slot, tempStartDate, slot.duration, 'move');
        slot.startAfter = newValue.startAfter;
        slot.duration = newValue.duration;
        
        // change g.slot translation
        d3.select(this.parentNode)
            .attr('transform', `translate(${ scaleX(getStart(slot)) }, ${ scaleY(slot.name) })`);
            
        selectSlot(slot.id);
    }
    
    function dragZoneEnd(slot) {
        startDragMouseX = null;
    }
    
    ///////////////////////////////////////////
    ///////////////////////////////////////////
    
    function dragLeftStart(slot) {
        startDragMouseX = d3.event.sourceEvent.screenX;
        startDragDuration = slot.duration;
        startDragDate = getStart(slot);
        
        selectSlot(slot.id);
    }
    // UPDATE START & DURATION
    function dragLeftProgress(slot) {
        const moveX = d3.event.sourceEvent.screenX - startDragMouseX;
        const currPosX = scaleX(startDragDate);
        const newPosX = scaleX(startDragDate) + moveX;

        const tempStartDate = scaleX.invert(newPosX);
        tempStartDate.setSeconds(0);
        tempStartDate.setMilliseconds(0);
        
        const endDate = getDatePlusDuration(startDragDate, startDragDuration);
        let tempDuration = (endDate.getTime() - tempStartDate.getTime()) / 1000;
        tempDuration = Math.round(tempDuration / GAP) * GAP;
        
        const newValue = calculateNewValue(slot, tempStartDate, tempDuration, 'left');
        slot.startAfter = newValue.startAfter;
        slot.duration = newValue.duration;

        // change g.slot translation
        d3.select(this.parentNode)
            .attr('transform', `translate(${ scaleX(getStart(slot)) }, ${ scaleY(slot.name) })`);

        // change rect.zone width
        d3.select(this.parentNode)
            .select('.zone')
            .attr('width', scaleX(getEnd(slot)) - scaleX(getStart(slot)))
        
        // change rect.handlerRight x
        d3.select(this.parentNode)
            .select('.handlerRight')
            .attr('x', (scaleX(getEnd(slot)) - scaleX(getStart(slot))) - 5);
        
        selectSlot(slot.id);
    }
    function dragLeftEnd(slot) {
        startDragMouseX = null;
        startDragDuration = null;
        startDragDate = null;
    }
    
    ///////////////////////////////////////////
    ///////////////////////////////////////////
    
    function dragRightStart(slot) {
        startDragMouseX = d3.mouse(this)[0];
        startDragDuration = slot.duration;
        
        selectSlot(slot.id);
    }
    // UPDATE DURATION
    function dragRightProgress(slot) {
        const moveX = d3.event.x - startDragMouseX;
        const currSlotWidthPixelX = scaleX(getDatePlusDuration(getStart(slot), startDragDuration));
        
        const tempEndDate = scaleX.invert(currSlotWidthPixelX + moveX);
        let tempDuration = (tempEndDate.getTime() - getStart(slot).getTime()) / 1000;
        tempDuration = Math.round(tempDuration / GAP) * GAP;

        const newValue = calculateNewValue(slot, getStart(slot), tempDuration, 'right');
        slot.startAfter = newValue.startAfter;
        slot.duration = newValue.duration;

        // change rect.zone width
        d3.select(this.parentNode)
            .select('.zone')
            .attr('width', scaleX(getEnd(slot)) - scaleX(getStart(slot)))
        
        // change rect.handlerRight x
        d3.select(this.parentNode)
            .select('.handlerRight')
            .attr('x', (scaleX(getEnd(slot)) - scaleX(getStart(slot))) - 5);
            
        selectSlot(slot.id);
    }
    function dragRightEnd(slot) {
        startDragMouseX = null;
        startDragDuration = null;
    }
}


function calculateNewValue(slot, tempStart, tempDuration, action) {
    const newValue = {
        startAfter: getDurationBetween(dateStartAll, tempStart),
        duration: tempDuration
    }

    // Make sure GAP as minimum
    if(newValue.duration < GAP) {
        newValue.duration = GAP;
    }

    let startMin = 0;
    let endMax = null;

    // Check if intersection
    const commonSlots = data.filter(d => d.name === slot.name && d.id !== slot.id);
    if(commonSlots.length > 0) {
        const orderedCommonSlots = commonSlots
            .map(s => ({start: s.startAfter, end: s.startAfter+s.duration, duration: s.duration, id: s.id}))
            .sort((a, b) => a.start < b.start ? -1 : 1);
        
        // DETERMINE IF SLOT IS:
        const tabSlotFirst = orderedCommonSlots[0];
        const tabSlotLast = orderedCommonSlots[orderedCommonSlots.length-1];
        
        // BEFORE ALL > endMax = startFirst - GAP
        if(slot.startAfter + slot.duration <= tabSlotFirst.start - GAP) {
            endMax = tabSlotFirst.start - GAP;
            console.log('BEFORE ALL > endMax = ', endMax);
        }
        // AFTER ALL > startMin = endLast + GAP
        else if(slot.startAfter >= tabSlotLast.start + tabSlotLast.duration + GAP) {
            startMin = tabSlotLast.start + tabSlotLast.duration + GAP;
            console.log('AFTER ALL > startMin = ', startMin);
        }
        // BETWEEN 2 > startMin = endA + GAP && endMax = startB - GAP
        else {
            for(let i = 0; i < orderedCommonSlots.length; i++) {
                const tabSlotA = orderedCommonSlots[i];
                const tabSlotB = orderedCommonSlots[i+1];

                if(slot.startAfter >= tabSlotA.start + tabSlotA.duration + GAP) {
                    startMin = tabSlotA.start + tabSlotA.duration + GAP;
                    
                    if(tabSlotB && slot.startAfter + slot.duration <= tabSlotB.start - GAP) {
                        endMax = tabSlotB.start - GAP;
                        break;
                    }
                }
            }
            console.log('BETWEEN 2 > startMin = ', startMin, ' > endMax = ', endMax);
        }
    }

    if(action === 'move') {
        if(newValue.startAfter < startMin) {
            newValue.startAfter = startMin;
        }
        if(endMax && newValue.startAfter + newValue.duration > endMax) {
            newValue.startAfter = endMax - newValue.duration;
        }
    }
    else if(action === 'left') {
        if(newValue.startAfter < startMin) {
            newValue.startAfter = startMin;
            newValue.duration = slot.duration;
        }
        else if(newValue.startAfter >= slot.startAfter + slot.duration) {
            newValue.startAfter = slot.startAfter + slot.duration - GAP;
        }
    }
    else if(action === 'right') {
        if(endMax && newValue.startAfter + newValue.duration > endMax) {
            newValue.duration = endMax - newValue.startAfter;
        }

    }

    return newValue;
}



function selectSlot(id) {
    const slot = data.find(s => s.id == id);

    // Unselect all slot
    elContainer.selectAll('.slot')
        .select('.zone')
        .classed('active', false);
        
    if(slot) {
        currentSlot = slot;

        elContainer.selectAll(`.slot[uniqid='id${ slot.id }']`)
            .select('.zone')
            .classed('active', true);
        
        document.getElementById('selection').innerHTML = `
            <div style="background: grey;">
                <h3>NAME: ${ currentSlot.name } (id=${ currentSlot.id })<br>
                START: ${ formatDate(getStart(currentSlot)) }<br>
                END: ${ formatDate(getEnd(currentSlot)) }
                <button onClick="removeSlot(${ currentSlot.id })">REMOVE</button>
                </h3>
            </div>`;
    }
    else {
        currentSlot = null;

        document.getElementById('selection').innerHTML = ``;
    }
}

function removeSlot(id) {
    data = data.filter(s => s.id !== id);
    updateData();
    updateAxisY();

    if(currentSlot && currentSlot.id === id) {
        selectSlot(-1);
    }
}

function addSlot(name) {
    const newId = (_.max(_.map(data, 'id')) || 1) + 1;
    const newData = {id: newId, name, startAfter: 0, duration: 1*60};
    
    const commonSlots = data.filter(s => s.name === name);
    if(commonSlots.length > 0) {
        const maxSlotEnd = _.max(_.map(commonSlots, d => d.startAfter + d.duration));
        newData.startAfter = maxSlotEnd + GAP;
    }

    data.push(newData);
    updateData();
    
    // update selected slot
    selectSlot(newData.id);
    
    // make sure new one is visible
    const [start, end] = scaleX.domain();
    const newOneStart = getStart(newData);
    const newOneEnd = getEnd(newData);
    
    if(isDateBeforeOther(newOneStart, start) || isDateAfterOther(newOneEnd, end)) {
        zoomViewAllAxisX(0);
    }
    updateAxisY();
}



function moveAxisX(dir) {
    const [start, end] = scaleX.domain();
    const newStart = scaleX.invert(WIDTH*.2);
    let duration = getDurationBetween(start, newStart);
    duration = (dir === 'left') ? -duration : duration;
    
    updateAxisX(getDatePlusDuration(start, duration), getDatePlusDuration(end, duration));
}

function zoomAxisX(dir) {
    const [start, end] = scaleX.domain();
    const durationVisible = getDurationBetween(start, end);

    let diff = 2*60;
    switch(true) {
        // less 15min visible > move 1min each side if unzoom
        case durationVisible <= 15*60:      diff = (dir === 'out') ? 1*60 : 0;      break;
        // less 30min visible > move 1min each side
        case durationVisible <= 30*60:      diff = 1*60;                            break;
        // less 1hour visible > move 4min each side
        case durationVisible <= 60*60:      diff = 4*60;                            break;
        // less 3hour visible > move 8min each side
        case durationVisible <= 3*60*60:    diff = 8*60;                            break;
        // less 6hour visible > move 12min each side
        case durationVisible <= 6*60*60:    diff = 12*60;                           break;
    }

    if(dir === 'in') {
        updateAxisX(getDatePlusDuration(start, diff), getDatePlusDuration(end, -diff));
    }
    else if(dir === 'out') {
        updateAxisX(getDatePlusDuration(start, -diff), getDatePlusDuration(end, diff));
    }
}

function zoomViewAllAxisX(animDuration = 200) {
    const startMin = _.min(_.map(data, d => getStart(d).getTime()));
    const endMax = _.max(_.map(data, d => getEnd(d).getTime()));
    
    if(startMin && endMax) {
        updateAxisX(new Date(startMin), new Date(endMax), animDuration);
    }
}

function updateAxisX(start, end, animDuration = 200) {
    const trans = d3.transition().ease(d3.easeLinear).duration(animDuration);

    scaleX.domain([start, end]);
    elAxisX.transition(trans).call(axisX);
    
    elContainer.selectAll('.slot')
        .transition(trans)
        .attr('transform', d => `translate(${ scaleX(getStart(d)) }, ${ scaleY(d.name) })`);
    
    elContainer.selectAll('.slot')
        .transition(trans)
        .select('.zone')
        .attr('width', d => scaleX(getEnd(d)) - scaleX(getStart(d)));

    elContainer.selectAll('.slot')
        .transition(trans)
        .select('.handlerRight')
        .attr('x', d => (scaleX(getEnd(d)) - scaleX(getStart(d))) - 5);
        
    elMain.select('.dateStartAll')
        .transition(trans)
        .attr('x1', d => scaleX(dateStartAll))
        .attr('x2', d => scaleX(dateStartAll))
}

function updateAxisY() {
    const trans = d3.transition()
        .ease(d3.easeLinear)
        .duration(200);

    scaleY.domain( getUniqList() );
    elAxisY.transition(trans).call(axisY);
    
    elContainer.selectAll('.slot')
        .transition(trans)
        .attr('transform', d => `translate(${ scaleX(getStart(d)) }, ${ scaleY(d.name) })`);
    

    const slotHeight = getSlotHeight();
    
    elContainer.selectAll('.slot')
        .select('.zone')
        .transition(trans)
        .attr('y', -slotHeight/2)
        .attr('height', slotHeight);

    elContainer.selectAll('.slot')
        .select('.handlerLeft')
        .transition(trans)
        .attr('y', d => -slotHeight/2)
        .attr('height', slotHeight);

    elContainer.selectAll('.slot')
        .select('.handlerRight')
        .transition(trans)
        .attr('y', d => -slotHeight/2)
        .attr('height', slotHeight);
}


function moveStartDate(duration) {
    updateStartDate(new Date(dateStartAll.getTime() + duration * 1000));
}

function updateStartDate(date) {
    date.setSeconds(0);
    date.setMilliseconds(0);

    const diffDuration = getDurationBetween(dateStartAll, date);

    dateStartAll = date;
    document.getElementById('startDate').innerHTML = formatDate(dateStartAll);
    
    elMain.select('.dateStartAll')
        .attr('x1', scaleX(dateStartAll))
        .attr('x2', scaleX(dateStartAll));
    
    elContainer.selectAll('.slot')
        .attr('transform', d => `translate(${ scaleX(getStart(d)) }, ${ scaleY(d.name) })`);

    updateData();

    const [start, end] = scaleX.domain();
    updateAxisX(getDatePlusDuration(start, diffDuration), getDatePlusDuration(end, diffDuration), 0);
    
    if(currentSlot) {
        selectSlot(currentSlot.id);
    }
}



function getUniqList() {
    return _.uniq(_.map(data, 'name')).sort().reverse();
}

function getSlotHeight() {
    const l = getUniqList().length;
    
    return Math.ceil((HEIGHT - 2*BORDER) / l) - 4;
}


buildDom();
updateData();


///////////////////////
///////////////////////
// Utils function


function getDatePlusDuration(date, duration) {
    return new Date(date.getTime() + duration * 1000);
}

function getDurationBetween(dateA, dateB) {
    return (dateB.getTime() - dateA.getTime()) / 1000;
}

function getStart(slot) {
    return getDatePlusDuration(dateStartAll, slot.startAfter);
}

function getEnd(slot) {
    return getDatePlusDuration(getStart(slot), slot.duration);
}

function isDateAfterOther(dateA, dateB, gap = 0) {
    return dateA.getTime() + gap * 1000 > dateB.getTime();
}

function isDateBeforeOther(dateA, dateB, gap = 0) {
    return dateA.getTime() + gap * 1000 < dateB.getTime();
}

function formatDate(d) {
    let h = d.getHours();
    let m = d.getMinutes();
    let s = d.getSeconds();
    
    if(h < 10) h = "0" + h;
    if(m < 10) m = "0" + m;
    if(s < 10) s = "0" + s;
    
    return `${ h }:${ m }:${ s }+${ d.getMilliseconds() }`;
}

function getColor(name) {
    switch(name) {
        case 'A': return 'rgba(156,39,176,1)';
        case 'B': return 'rgba(180,12,111,1)';
        case 'C': return 'rgba(75,39,21,1)';
        case 'D': return 'rgba(156,200,176,1)';
        case 'E': return 'rgba(16,39,102,1)';
        case 'F': return 'rgba(222,222,122,1)';
    }
}