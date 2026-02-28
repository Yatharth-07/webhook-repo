document.addEventListener('DOMContentLoaded', () => {
    const eventsContainer = document.getElementById('events-container');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const toastContainer = document.getElementById('toast-container');
    
    let allEvents = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let lastEventId = null;

    // Initial fetch
    fetchEvents(true);

    // Poll every 15 seconds
    const pollInterval = setInterval(() => fetchEvents(false), 15000);

    // Event Listeners for Filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderEvents();
        });
    });

    // Event Listener for Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderEvents();
    });

    // Event Listener for Refresh
    refreshBtn.addEventListener('click', () => {
        // Add loading spin to icon
        const icon = refreshBtn.querySelector('svg');
        icon.classList.add('animate-spin');
        icon.style.animation = 'spin 1s linear infinite';
        
        fetchEvents(false).then(() => {
            setTimeout(() => {
                icon.style.animation = 'none';
                icon.classList.remove('animate-spin');
            }, 500);
        });
    });

    async function fetchEvents(isInitial = false) {
        try {
            const response = await fetch('/api/events');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const fetchedEvents = await response.json();
            
            // Check for new events to trigger toasts (if not initial load)
            if (!isInitial && fetchedEvents.length > 0) {
                const latestEvent = fetchedEvents[0];
                if (latestEvent._id !== lastEventId && lastEventId !== null) {
                    // It's a new event we haven't seen before
                    showToast(`New ${latestEvent.action} event by ${latestEvent.author}`, 'toast-new-event');
                }
                lastEventId = latestEvent._id;
            } else if (isInitial && fetchedEvents.length > 0) {
                lastEventId = fetchedEvents[0]._id;
            }

            allEvents = fetchedEvents;
            renderEvents(isInitial);
        } catch (error) {
            console.error("Failed to fetch events:", error);
            if (isInitial) {
                eventsContainer.innerHTML = `
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p>Server disconnected. Retrying...</p>
                    </div>`;
            }
        }
    }

    function renderEvents(isInitial = false) {
        // Step 1: Filter events
        let filteredEvents = allEvents;

        if (currentFilter !== 'all') {
            filteredEvents = filteredEvents.filter(e => e.action === currentFilter);
        }

        if (searchQuery.trim() !== '') {
            filteredEvents = filteredEvents.filter(e => {
                const searchStr = `${e.author} ${e.action} ${e.to_branch} ${e.from_branch || ''} ${e.request_id || ''}`.toLowerCase();
                return searchStr.includes(searchQuery);
            });
        }

        // Step 2: Render
        if (!filteredEvents || filteredEvents.length === 0) {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    <p>${allEvents.length === 0 ? 'No webhook events recorded yet.' : 'No events match your criteria.'}</p>
                </div>`;
            return;
        }

        eventsContainer.innerHTML = '';
        
        filteredEvents.forEach((event, index) => {
            const card = document.createElement('div');
            card.className = `event-card ${event.action}`;
            
            // Stagger animation delay slightly for initial load effect
            if (isInitial) {
                card.style.animationDelay = `${index * 0.05}s`;
            }

            const iconSvg = getIconSvg(event.action);
            const { titleHtml, descriptionHtml } = getFormattedEventStrings(event);
            const displayId = event.request_id ? event.request_id.substring(0, 7) : 'N/A';
            const initials = event.author ? event.author.substring(0,2).toUpperCase() : '??';
            const timeAgo = getRelativeTime(event.timestamp);
            
            card.innerHTML = `
                <div class="event-avatar-container">
                    <div class="event-avatar">${initials}</div>
                    <div class="event-type-badge">${iconSvg}</div>
                </div>
                
                <div class="event-content">
                    <div class="event-header">
                        <div class="event-title">${titleHtml}</div>
                        <div class="event-time">${timeAgo}</div>
                    </div>
                    
                    ${descriptionHtml ? `<div class="event-description mb-2 text-sm text-gray-400">${descriptionHtml}</div>` : ''}
                    
                    <div class="event-meta-footer">
                        <span class="tag">${event.action}</span>
                        <span class="req-id" title="Commit/PR ID: ${event.request_id}">#${displayId}</span>
                    </div>
                </div>
            `;
            
            eventsContainer.appendChild(card);
        });
    }

    function showToast(message, typeClass) {
        const toast = document.createElement('div');
        toast.className = `toast ${typeClass}`;
        toast.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function getIconSvg(action) {
        if (action === 'PUSH') {
            return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>`;
        }
        if (action === 'PULL_REQUEST') {
            return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>`;
        }
        if (action === 'MERGE') {
            return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>`; // Adjusted generic PR icon for merge visualization
        }
        return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`;
    }

    function getFormattedEventStrings(event) {
        let titleHtml = '';
        let descriptionHtml = '';

        switch (event.action) {
            case 'PUSH':
                titleHtml = `<strong>${event.author}</strong> pushed to <code>${event.to_branch}</code>`;
                break;
                
            case 'PULL_REQUEST':
                titleHtml = `<strong>${event.author}</strong> opened a pull request`;
                descriptionHtml = `Wants to merge code from <code>${event.from_branch}</code> into <code>${event.to_branch}</code>`;
                break;
                
            case 'MERGE':
                titleHtml = `<strong>${event.author}</strong> merged a pull request`;
                descriptionHtml = `Merged <code>${event.from_branch}</code> into <code>${event.to_branch}</code>.`;
                break;
                
            default:
                titleHtml = `<strong>${event.author}</strong> generated a ${event.action} event`;
        }
        
        return { titleHtml, descriptionHtml };
    }

    function getRelativeTime(isoString) {
        if (!isoString) return 'Unknown Time';
        
        const date = new Date(isoString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        // Handle slight future drift or exact same second
        if (seconds <= 5) return 'Just now';
        
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (seconds < 60) return `${seconds}s ago`;
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 30) {
            if (days === 1) return 'Yesterday';
            return `${days}d ago`;
        }
        if (months < 12) return `${months}mo ago`;
        return `${years}y ago`;
    }
});
