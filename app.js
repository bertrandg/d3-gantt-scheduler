//@ts-check

const WIDTH = 800;
const HEIGHT = 400;
const BORDER = 50;
const GAP = 60;

let scaleX, scaleY, axisX, axisY;
let svg, elMain, elDragZone, elContainer, elAxisX, elAxisY, elDateStartAll;
let currentSelectedSession = null;

const dateStartAll = new Date();
dateStartAll.setMinutes(dateStartAll.getMinutes() + 10);
dateStartAll.setSeconds(0);

const nowPlusXMinutes = (min) => new Date(dateStartAll.getTime() + min * 1000 * 60);

let data = [
    {id: 1, name: 'clown B', start: nowPlusXMinutes(3), duration: 4 * 60},
    {id: 2, name: 'clown A', start: nowPlusXMinutes(0), duration: 3 * 60},
    {id: 3, name: 'clown A', start: nowPlusXMinutes(7), duration: 9 * 60},
    {id: 4, name: 'clown C', start: nowPlusXMinutes(2), duration: 3 * 60},
    {id: 5, name: 'clown D', start: nowPlusXMinutes(7), duration: 10 * 60},
    {id: 6, name: 'clown E', start: nowPlusXMinutes(25), duration: 7 * 60},
    {id: 7, name: 'clown F', start: nowPlusXMinutes(5), duration: 12 * 60},
    {id: 8, name: 'clown A', start: nowPlusXMinutes(17), duration: 6 * 60},
    {id: 9, name: 'clown X', start: nowPlusXMinutes(21), duration: 2 * 60},
];



function buildDom() {
    scaleX = d3.scaleTime()
        .range([0, WIDTH-BORDER*2])
        .domain([dateStartAll, getTimePlusDuration(dateStartAll, 15*60)]);
    
    scaleY = d3.scalePoint()
        .range([HEIGHT-BORDER*2, 0])
        .padding(.5)
        .domain( getUniqClownList() );
    
    
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
            .on('start', dragStart)
            .on('drag', dragProgress)
            .on('end', dragEnd));

    elContainer = elMain.append('g')
        .attr('class', 'container')
        .attr('clip-path', 'url(#clip)');
        
    elDateStartAll = elMain.append('line')
        .attr('class', 'dateStartAll')
        .attr('clip-path', 'url(#clip)')
        .attr('x1', d => scaleX(dateStartAll))
        .attr('y1', d => scaleY.range()[0])
        .attr('x2', d => scaleX(dateStartAll))
        .attr('y2', d => scaleY.range()[1])
        .style('stroke', 'blue');

    let startDragMouseX = null;
    let startDragDateStart = null;
    let startDragDuration = null;
    let startZoomK = 1;

    function dragStart() {
        startDragMouseX = d3.mouse(this)[0];
        
        const [start, end] = scaleX.domain();
        startDragDateStart = start;
        startDragDuration = getDurationBetween(start, end);
    }
    function dragProgress() {
        const [start, end] = scaleX.domain();
        const newStart = scaleX.invert(-d3.event.dx);
        let duration = getDurationBetween(start, newStart);
        
        updateTimeAxis(getTimePlusDuration(start, duration), getTimePlusDuration(end, duration), 0);
    }
    function dragEnd() {
        startDragMouseX = null;
        startDragDateStart = null;
        startDragDuration = null;
    }
    function scrollZoom() {
        if(d3.event.transform.k > startZoomK) {
            zoom('in');
        }
        else if(d3.event.transform.k < startZoomK) {
            zoom('out');
        }

        startZoomK = d3.event.transform.k;
    }
}



function updateData() {
    const updateSessions = elContainer.selectAll('.session').data(data, d => d.id);
    const exitSessions = updateSessions.exit();
    const enterSessions = updateSessions.enter();
    
    exitSessions.remove();
    
    exitSessions.transition()
        .duration(500)
        .attr('opacity', 0);

    const sessionHeight = getClownAxisSessionHeight();

    const entry = enterSessions.append('g')
        .attr('class', 'session')
        .attr('uniqid', d => 'id'+d.id)
        .attr('name', d => d.name)
        //.attr('opacity', 0)
        .attr('transform', d => `translate(${ scaleX(d.start) }, ${ scaleY(d.name) })`);
    
    entry.append('rect')
        .attr('class', 'zone')
        .attr('x', 0)
        .attr('y', -sessionHeight/2)
        .attr('width', d => scaleX(getEndDate(d.start, d.duration)) - scaleX(d.start))
        .attr('height', sessionHeight)
        .attr('cursor', 'move')
        .style('fill', d => getColor(d.name))
        .call(d3.drag()
            .on('start', dragZoneStart)
            .on('drag', dragZoneProgress)
            .on('end', dragZoneEnd));

    entry.append('rect')
        .attr('class', 'handlerLeft')
        .attr('x', d => -5)
        .attr('y', d => -sessionHeight/2)
        .attr('width', 10)
        .attr('height', sessionHeight)
        .attr('cursor', 'ew-resize')
        .style('fill', 'grey')
        .attr('fill-opacity', .2)
        .call(d3.drag()
            .on('start', dragLeftStart)
            .on('drag', dragLeftProgress)
            .on('end', dragLeftEnd));

    entry.append('rect')
            .attr('class', 'handlerRight')
            .attr('x', d => (scaleX(getEndDate(d.start, d.duration)) - scaleX(d.start)) - 5)
            .attr('y', d => -sessionHeight/2)
            .attr('width', 10)
            .attr('height', sessionHeight)
            .attr('cursor', 'ew-resize')
            .style('fill', 'grey')
            .attr('fill-opacity', .2)
            .call(d3.drag()
                .on('start', dragRightStart)
                .on('drag', dragRightProgress)
                .on('end', dragRightEnd));

    /*entry.transition()
        .duration(200)
        .attr('opacity', 1);
    */
    let startDragMouseX = null;
    let startDragDuration = null;
    let startDragDate = null;
    
    ///////////////////////////////////////////
    ///////////////////////////////////////////

    function dragZoneStart(data) {
        startDragMouseX = d3.mouse(this)[0];

        elContainer.selectAll('.session')
            .select('.zone')
            .classed('active', false);

        d3.select(this).classed('active', true);
        currentSelectedSession = data;
        updateSelectionDiv();
    }
    
    // UPDATE START
    function dragZoneProgress(data) {
        const moveX = d3.event.x - startDragMouseX;
        const currSessionPosPixelX = scaleX(data.start);
        let newStartDate = scaleX.invert(currSessionPosPixelX + moveX);
        newStartDate.setSeconds(0);
        if(isDateBeforeOther(newStartDate, dateStartAll, GAP)) newStartDate = new Date(dateStartAll.getTime());
        
        if(checkIfTimelineOk(data, newStartDate, data.duration)) {
            data.start = newStartDate;
            
            // change g.session translation
            d3.select(this.parentNode)
                .attr('transform', `translate(${ scaleX(data.start) }, ${ scaleY(data.name) })`);
        }
    }
    
    function dragZoneEnd(data) {
        startDragMouseX = null;
    }
    
    ///////////////////////////////////////////
    ///////////////////////////////////////////
    
    function dragLeftStart(data) {
        startDragMouseX = d3.mouse(this)[0];
        startDragDuration = data.duration;
        startDragDate = data.start;
    }
    
    // UPDATE START & DURATION
    function dragLeftProgress(data) {
        const moveX = d3.event.x - startDragMouseX;
        const currPosX = scaleX(startDragDate);
        const newPosX = scaleX(startDragDate) + moveX;

        const newStartDate = scaleX.invert(newPosX);
        newStartDate.setSeconds(0);
        
        const endDate = getEndDate(startDragDate, startDragDuration);
        let newDuration = (endDate.getTime() - newStartDate.getTime()) / 1000;
        newDuration = Math.round(newDuration / 60) * 60;
        if(newDuration < 60) newDuration = 60;

        console.group('PROGRESS');
        console.log('d3.event.x: ', d3.event.x);
        console.log('moveX: ', moveX);
        console.log('currPosX: ', currPosX);
        console.log('newwPosX: ', newPosX);
        console.groupEnd();

        if(false && checkIfTimelineOk(data, newStartDate, newDuration)) {
            data.start = newStartDate;
            data.duration = newDuration;

            // change g.session translation
            d3.select(this.parentNode)
                .attr('transform', `translate(${ scaleX(data.start) }, ${ scaleY(data.name) })`);

            // change rect.zone width
            d3.select(this.parentNode)
                .select('.zone')
                .attr('width', scaleX(getEndDate(data.start, data.duration)) - scaleX(data.start))
            
            // change rect.handlerRight x
            d3.select(this.parentNode)
                .select('.handlerRight')
                .attr('x', (scaleX(getEndDate(data.start, data.duration)) - scaleX(data.start)) - 5);
        }
    }
    
    function dragLeftEnd(data) {
        startDragMouseX = null;
        startDragDuration = null;
        startDragDate = null;
    }
    
    ///////////////////////////////////////////
    ///////////////////////////////////////////
    
    function dragRightStart(data) {
        startDragMouseX = d3.mouse(this)[0];
        startDragDuration = data.duration;
    }

    // UPDATE DURATION
    function dragRightProgress(data) {
        const moveX = d3.event.x - startDragMouseX;
        const currSessionWidthPixelX = scaleX(getEndDate(data.start, startDragDuration));
        
        const newEndDate = scaleX.invert(currSessionWidthPixelX + moveX);
        let newDuration = (newEndDate.getTime() - data.start.getTime()) / 1000;
        newDuration = Math.round(newDuration / 60) * 60;
        if(newDuration < 60) newDuration = 60;
        
        if(checkIfTimelineOk(data, data.start, newDuration)) {
            data.duration = newDuration;

            // change rect.zone width
            d3.select(this.parentNode)
                .select('.zone')
                .attr('width', scaleX(getEndDate(data.start, data.duration)) - scaleX(data.start))
            
            // change rect.handlerRight x
            d3.select(this.parentNode)
                .select('.handlerRight')
                .attr('x', (scaleX(getEndDate(data.start, data.duration)) - scaleX(data.start)) - 5);
        }
    }
    function dragRightEnd(data) {
        startDragMouseX = null;
        startDragDuration = null;
    }
}

// Verify if future session position is possible
function checkIfTimelineOk(dataToCheck, newStart, newDuration) {
    const newEnd = getEndDate(newStart, newDuration);    
    const allClownSession = data.filter(d => d.name === dataToCheck.name && d.id !== dataToCheck.id);
    
    const isSessionOverriding = allClownSession.some(s => {
        const itemStart = s.start;
        const itemEnd = getEndDate(s.start, s.duration);

        if( (isDateAfterOther(itemStart, newStart, GAP) && isDateBeforeOther(itemStart, newEnd, GAP)) || 
            (isDateAfterOther(itemEnd, newStart, GAP) && isDateBeforeOther(itemEnd, newEnd, GAP)) || 
            (isDateAfterOther(newStart, itemStart, GAP) && isDateBeforeOther(newStart, itemEnd, GAP)) || 
            (isDateAfterOther(newEnd, itemStart, GAP) && isDateBeforeOther(newEnd, itemEnd, GAP)) )
        {
            return true;
        }
        return false;
    });

    return newDuration >= 60 &&
            (newStart.getTime() === dateStartAll.getTime() || isDateAfterOther(newStart, dateStartAll)) && 
            (allClownSession.length === 0 || isSessionOverriding === false);
}



function updateSelectionDiv() {
    if(!currentSelectedSession) {
        document.getElementById('selection').innerHTML = ``;
    }
    else {
        document.getElementById('selection').innerHTML = `
            <div style="background: grey;">
                <h3>NAME: ${ currentSelectedSession.name } (id=${ currentSelectedSession.id })<br>
                START: ${ formatDate(currentSelectedSession.start) }<br>
                END: ${ formatDate(getEndDate(currentSelectedSession.start, currentSelectedSession.duration)) }
                <button onClick="removeSession(${ currentSelectedSession.id })">REMOVE</button>
                </h3>
            </div>
        `;
    }

    function formatDate(d) {
        let h = d.getHours();
        let m = d.getMinutes();
        let s = d.getSeconds();
        
        if(h < 10) h = "0" + h;
        if(m < 10) m = "0" + m;
        if(s < 10) s = "0" + s;
        
        return `${ h }:${ m }:${ s }`;
    }
}

function removeSession(id) {
    data = data.filter(s => s.id !== id);
    updateData();
    updateClownAxis();

    if(currentSelectedSession && currentSelectedSession.id === id) {
        currentSelectedSession = null;
        updateSelectionDiv();
    }
}

function addSession(name) {
    const newId = (_.max(_.map(data, 'id')) || 1) + 1;
    const newData = {id: newId, name, start: dateStartAll, duration: 1*60};
    
    const existingClownSessions = data.filter(s => s.name === name);
    if(existingClownSessions.length > 0) {
        const maxSessionEnd = _.max(_.map(existingClownSessions, d => getEndDate(d.start, d.duration).getTime()));
        newData.start = new Date(maxSessionEnd + GAP*1000);
    }

    data.push(newData);
    updateData();
    
    // update selected session
    elContainer.selectAll('.session')
    .select('.zone')
    .classed('active', false);
    
    elContainer.selectAll(`.session[uniqid='id${newData.id}']`)
    .select('.zone')
    .classed('active', true);
    
    currentSelectedSession = newData;
    updateSelectionDiv();
    
    // make sure new one is visible
    const [start, end] = scaleX.domain();
    const newOneStart = newData.start;
    const newOneEnd = getEndDate(newData.start, newData.duration);
    
    if(isDateBeforeOther(newOneStart, start) || isDateAfterOther(newOneEnd, end)) {
        zoomViewAll();
    }
    updateClownAxis();
}



function move(dir) {
    const [start, end] = scaleX.domain();
    const newStart = scaleX.invert(WIDTH*.2);
    let duration = getDurationBetween(start, newStart);
    duration = (dir === 'left') ? -duration : duration;
    
    updateTimeAxis(getTimePlusDuration(start, duration), getTimePlusDuration(end, duration));
}

function zoom(dir) {
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
        updateTimeAxis(getTimePlusDuration(start, diff), getTimePlusDuration(end, -diff));
    }
    else if(dir === 'out') {
        updateTimeAxis(getTimePlusDuration(start, -diff), getTimePlusDuration(end, diff));
    }
}

function zoomViewAll() {
    const startMin = _.min(_.map(data, d => d.start.getTime()));
    const endMax = _.max(_.map(data, d => getEndDate(d.start, d.duration).getTime()));
    
    if(startMin && endMax) {
        updateTimeAxis(new Date(startMin), new Date(endMax));
    }
}

function updateTimeAxis(start, end, animDuration = 200) {
    const trans = d3.transition().ease(d3.easeLinear).duration(animDuration);

    scaleX.domain([start, end]);
    elAxisX.transition(trans).call(axisX);
    
    elContainer.selectAll('.session')
        .transition(trans)
        .attr('transform', d => `translate(${ scaleX(d.start) }, ${ scaleY(d.name) })`);
    
    elContainer.selectAll('.session')
        .transition(trans)
        .select('.zone')
        .attr('width', d => scaleX(getEndDate(d.start, d.duration)) - scaleX(d.start));

    elContainer.selectAll('.session')
        .transition(trans)
        .select('.handlerRight')
        .attr('x', d => (scaleX(getEndDate(d.start, d.duration)) - scaleX(d.start)) - 5);
        
    elMain.select('.dateStartAll')
        .transition(trans)
        .attr('x1', d => scaleX(dateStartAll))
        .attr('x2', d => scaleX(dateStartAll))
}

function updateClownAxis() {
    const trans = d3.transition().ease(d3.easeLinear).duration(200);

    scaleY.domain( getUniqClownList() );
    elAxisY.transition(trans).call(axisY);
    
    elContainer.selectAll('.session')
        .transition(trans)
        .attr('transform', d => `translate(${ scaleX(d.start) }, ${ scaleY(d.name) })`);
    

    const sessionHeight = getClownAxisSessionHeight();
    
    elContainer.selectAll('.session')
        .select('.zone')
        .transition(trans)
        .attr('y', -sessionHeight/2)
        .attr('height', sessionHeight);

    elContainer.selectAll('.session')
        .select('.handlerLeft')
        .transition(trans)
        .attr('y', d => -sessionHeight/2)
        .attr('height', sessionHeight);

    elContainer.selectAll('.session')
        .select('.handlerRight')
        .transition(trans)
        .attr('y', d => -sessionHeight/2)
        .attr('height', sessionHeight);
}

buildDom();
updateData();




function getUniqClownList() {
    return _.uniq(_.map(data, 'name')).sort().reverse();
}

function getClownAxisSessionHeight() {
    const l = getUniqClownList().length;
    
    return Math.ceil((HEIGHT - 2*BORDER) / l) - 4;
}

///////////////////////
///////////////////////
// Utils function


function getTimePlusDuration(date, duration) {
    return new Date(date.getTime() + duration * 1000);
}

function getDurationBetween(dateA, dateB) {
    return (dateB.getTime() - dateA.getTime()) / 1000;
}

function getEndDate(date, duration) {
    return getTimePlusDuration(date, duration);
}

function isDateAfterOther(dateA, dateB, gap = 0) {
    return dateA.getTime() + gap * 1000 > dateB.getTime();
}

function isDateBeforeOther(dateA, dateB, gap = 0) {
    return dateA.getTime() + gap * 1000 < dateB.getTime();
}

function getColor(name) {
    switch(name) {
        case 'clown A': return 'rgba(156,39,176,1)';
        case 'clown B': return 'rgba(180,12,111,1)';
        case 'clown C': return 'rgba(75,39,21,1)';
        case 'clown D': return 'rgba(156,200,176,1)';
        case 'clown E': return 'rgba(16,39,102,1)';
        case 'clown F': return 'rgba(222,222,122,1)';
    }
}