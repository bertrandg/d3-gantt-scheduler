const WIDTH = 800;
const HEIGHT = 400;
const BORDER = 50;

const minGapSeconds = 60;
let elMain, elContainer, elAxisX, elAxisY, elDateStartAll;

const dateStartAll = new Date();
dateStartAll.setMinutes(dateStartAll.getMinutes() + 10);
dateStartAll.setSeconds(0);

const nowPlusXMinutes = (min) => new Date(dateStartAll.getTime() + min * 1000 * 60);

const data = [
    {id: 1, name: 'clown B', start: nowPlusXMinutes(3), duration: 4 * 60},
    {id: 2, name: 'clown A', start: nowPlusXMinutes(0), duration: 3 * 60},
    {id: 3, name: 'clown A', start: nowPlusXMinutes(6), duration: 9 * 60},
    {id: 4, name: 'clown C', start: nowPlusXMinutes(2), duration: 3 * 60},
    {id: 5, name: 'clown D', start: nowPlusXMinutes(7), duration: 10 * 60},
    {id: 6, name: 'clown E', start: nowPlusXMinutes(35), duration: 37 * 60},
    {id: 7, name: 'clown F', start: nowPlusXMinutes(72), duration: 73 * 60},
    {id: 8, name: 'clown A', start: nowPlusXMinutes(41), duration: 45 * 60},
    {id: 9, name: 'clown X', start: nowPlusXMinutes(110), duration: 111 * 60},
]


function getTimePlusDuration(date, duration) {
    return new Date(date.getTime() + duration * 1000);
}

function getTimeRange(startDate, nbMin) {
    const endDate = new Date(startDate.getTime());
    endDate.setMinutes(endDate.getMinutes() + nbMin);
    
    return [startDate, endDate];
}

function getDurationBetween(dateA, dateB) {
    return (dateB.getTime() - dateA.getTime())/1000;
}

function getEndDate(date, nbSeconds) {
    return new Date(date.getTime() + nbSeconds * 1000);
}

const isDateAfterOther = (dateA, dateB, minGapSeconds = 0) => dateA.getTime() + minGapSeconds*1000 > dateB.getTime();
const isDateBeforeOther = (dateA, dateB, minGapSeconds = 0) => dateA.getTime() + minGapSeconds*1000 < dateB.getTime();


const scaleX = d3.scaleTime()
    .range([0, WIDTH-BORDER*2])
    .domain(getTimeRange(dateStartAll, 15));

const scaleY = d3.scalePoint()
    .range([HEIGHT-BORDER*2, 0])
    .padding(.5)
    .domain( _.uniq(_.map(data, 'name')) );


const axisX = d3.axisBottom(scaleX).tickSizeInner(-HEIGHT+BORDER*2);
const axisY = d3.axisLeft(scaleY).tickSizeInner(-WIDTH+BORDER*2);


function buildDom() {
    const svg = d3.select('#chart').append('svg')
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
        .attr('transform', 'translate(' + BORDER + ',' + BORDER + ')');

    elAxisX = elMain.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', 'translate(0,' + (HEIGHT-BORDER*2) + ')')
        .call(axisX);
    
    elAxisY = elMain.append('g')
        .attr('class', 'axis axis--y')
        .call(axisY);

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
}


function updateData() {
    const updateSessions = elContainer.selectAll('.session').data(data);
    const exitSessions = updateSessions.exit();
    const enterSessions = updateSessions.enter();
    
    exitSessions.remove();

    const entry = enterSessions.append('g')
            .attr('class', 'session')
            .attr('transform', d => `translate(${ scaleX(d.start) }, ${ scaleY(d.name) })`);
    
    entry.append('rect')
        .attr('class', 'zone')
        .attr('x', 0)
        .attr('y', -15)
        .attr('width', d => scaleX(getEndDate(d.start, d.duration)) - scaleX(d.start))
        .attr('height', 30)
        .attr('cursor', 'move')
        .style('fill', d => getColor(d.name))
        .call(d3.drag()
            .on('start', dragZoneStart)
            .on('drag', dragZoneProgress)
            .on('end', dragZoneEnd));

    entry.append('rect')
        .attr('class', 'handlerLeft')
        .attr('x', d => -5)
        .attr('y', d => -15)
        .attr('width', 10)
        .attr('height', 30)
        .attr('cursor', 'ew-resize')
        .style('fill', 'grey')
        .attr('fill-opacity', 0)
        .call(d3.drag()
            .on('start', dragLeftStart)
            .on('drag', dragLeftProgress)
            .on('end', dragLeftEnd));

    entry.append('rect')
            .attr('class', 'handlerRight')
            .attr('x', d => (scaleX(getEndDate(d.start, d.duration)) - scaleX(d.start)) - 5)
            .attr('y', d => -15)
            .attr('width', 10)
            .attr('height', 30)
            .attr('cursor', 'ew-resize')
            .style('fill', 'grey')
            .attr('fill-opacity', 0)
            .call(d3.drag()
                .on('start', dragRightStart)
                .on('drag', dragRightProgress)
                .on('end', dragRightEnd));
    
    
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

    let startDragMouseX = null;
    let startDragDuration = null;
    let startDragDate = null;
    
    ///////////////////////////////////////////
    ///////////////////////////////////////////

    function dragZoneStart(data) {
        startDragMouseX = d3.mouse(this)[0];
    }
    
    // UPDATE START
    function dragZoneProgress(data) {
        const moveX = d3.event.x - startDragMouseX;
        const currSessionPosPixelX = scaleX(data.start);
        let newStartDate = scaleX.invert(currSessionPosPixelX + moveX);
        newStartDate.setSeconds(0);
        if(isDateBeforeOther(newStartDate, dateStartAll, minGapSeconds)) newStartDate = new Date(dateStartAll.getTime());
        
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
        // console.log('curr start: ', startDragDate);
        // console.log('neew start: ', newStartDate);
        // console.log('curr duration: ', startDragDuration);
        // console.log('neew duration: ', newDuration);
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
        
        console.group('PROGRESS');
        console.log('curr end: ', getEndDate(data.start, startDragDuration));
        console.log('neew end: ', newEndDate);
        console.log('curr duration: ', startDragDuration);
        console.log('neew duration: ', newDuration);
        console.log('moveX: ', moveX);
        console.groupEnd();
        
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

// TODO: check if future position doesn't overlap previous/next session
// and if it doesn't go before global start date
function checkIfTimelineOk(dataToCheck, newStart, newDuration) {
    const newEnd = getEndDate(newStart, newDuration);    
    const allClownSession = data.filter(d => d.name === dataToCheck.name && d.id !== dataToCheck.id);
    
    const isSessionOverriding = allClownSession.some(s => {
        const itemStart = s.start;
        const itemEnd = getEndDate(s.start, s.duration);

        if( (isDateAfterOther(itemStart, newStart, minGapSeconds) && isDateBeforeOther(itemStart, newEnd, minGapSeconds)) || 
            (isDateAfterOther(itemEnd, newStart, minGapSeconds) && isDateBeforeOther(itemEnd, newEnd, minGapSeconds)) || 
            (isDateAfterOther(newStart, itemStart, minGapSeconds) && isDateBeforeOther(newStart, itemEnd, minGapSeconds)) || 
            (isDateAfterOther(newEnd, itemStart, minGapSeconds) && isDateBeforeOther(newEnd, itemEnd, minGapSeconds)) )
        {
            return true;
        }
        return false;
    });

    return newDuration >= 60 &&
            (newStart.getTime() === dateStartAll.getTime() || isDateAfterOther(newStart, dateStartAll)) && 
            (allClownSession.length === 0 || isSessionOverriding === false);
}


buildDom();
updateData();




function move(dir) {
    const [start, end] = scaleX.domain();
    const newStart = scaleX.invert(WIDTH*.2);
    let duration = getDurationBetween(start, newStart);
    duration = (dir === 'left') ? -duration : duration;
    
    updateTimeAxis(getTimePlusDuration(start, duration), getTimePlusDuration(end, duration));
}

function zoom(dir) {
 console.log("dir ", dir);
    const [start, end] = scaleX.domain();
    const durationVisible = getDurationBetween(start, end);

    let diff = 2*60;
    switch(true) {
        case durationVisible <= 15*60: // less 15min visible
            diff = (dir === 'out') ? 1*60 : 0;
            break;

        case durationVisible <= 30*60: // less 30min visible
            diff = 1*60;
            break;

        case durationVisible <= 60*60: // less 1hour visible
            diff = 4*60;
            break;

        case durationVisible <= 3*60*60: // less 3hour visible
            diff = 8*60;
            break;

        case durationVisible <= 6*60*60: // less 6hour visible
            diff = 12*60;
            break;
    }
    console.log("durationVisible ", durationVisible/60);
    console.log("diff ", diff/60);

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

function updateTimeAxis(start, end) {
    const trans = d3.transition().ease(d3.easeLinear).duration(200);

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