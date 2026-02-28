document.addEventListener('DOMContentLoaded', () => {
    const eventsContainer = document.getElementById('events-container');
    
    // Initial fetch
    fetchEvents();

    // Poll every 15 seconds
    setInterval(fetchEvents, 15000);

    async function fetchEvents() {
        try {
            const response = await fetch('/api/events');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const events = await response.json();
            renderEvents(events);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        }
    }

    function renderEvents(events) {
        if (!events || events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No webhook events recorded yet. Waiting for incoming data...</p>
                </div>`;
            return;
        }

        // Clear container and keep a simple virtual DOM-like approach for this scale
        eventsContainer.innerHTML = '';
        
        events.forEach(event => {
            const card = document.createElement('div');
            card.className = `event-card ${event.action}`;
            
            const iconSymbol = getIconSymbol(event.action);
            const formattedText = getFormattedText(event);
            const displayId = event.request_id ? event.request_id.substring(0, 7) : 'N/A';
            
            card.innerHTML = `
                <div class="event-icon">${iconSymbol}</div>
                <div class="event-content">
                    <div class="event-text">${formattedText}</div>
                    <div class="event-meta">
                        <span class="request-id" title="${event.request_id}">${displayId}</span>
                        <span class="event-type">${event.action}</span>
                    </div>
                </div>
            `;
            
            eventsContainer.appendChild(card);
        });
    }

    function getIconSymbol(action) {
        if (action === 'PUSH') return '↑'; // Arrow up for push
        if (action === 'PULL_REQUEST') return '↹'; // PR arrows
        if (action === 'MERGE') return '⭉'; // Merge icon approximation
        return '•';
    }

    function formatCustomDate(isoString) {
        const dateObj = new Date(isoString);
        
        const day = dateObj.getUTCDate();
        const month = dateObj.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
        const year = dateObj.getUTCFullYear();
        
        let hours = dateObj.getUTCHours();
        let minutes = dateObj.getUTCMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        
        const suffix = getOrdinalSuffix(day);
        
        return `${day}${suffix} ${month} ${year} - ${hours}:${minutes} ${ampm} UTC`;
    }

    function getOrdinalSuffix(d) {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    }

    function getFormattedText(event) {
        const authorStr = `<span class="author">"${event.author}"</span>`;
        const toBranchStr = `<span class="branch">"${event.to_branch}"</span>`;
        const timeStr = event.timestamp ? formatCustomDate(event.timestamp) : 'Unknown Time';

        switch (event.action) {
            case 'PUSH':
                return `${authorStr} pushed to ${toBranchStr} on ${timeStr}`;
                
            case 'PULL_REQUEST':
                const fromBranchPrStr = `<span class="branch">"${event.from_branch}"</span>`;
                return `${authorStr} submitted a pull request from ${fromBranchPrStr} to ${toBranchStr} on ${timeStr}`;
                
            case 'MERGE':
                const fromBranchMergeStr = `<span class="branch">"${event.from_branch}"</span>`;
                return `${authorStr} merged branch ${fromBranchMergeStr} to ${toBranchStr} on ${timeStr}`;
                
            default:
                return `${authorStr} performed ${event.action} on ${timeStr}`;
        }
    }
});
