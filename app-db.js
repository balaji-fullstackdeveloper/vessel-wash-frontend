// Database API functions
const API_BASE = 'https://vessel-wash.onrender.com/api';

let allPersons = [];
let dutySchedule = [];
let workload = {};
let pastSchedules = [];
let allLeaves = [];

// Fetch data from MongoDB
async function fetchPersons() {
    try {
        const response = await fetch(`${API_BASE}/persons`);
        allPersons = await response.json();
        initializeWorkload();
        return allPersons;
    } catch (error) {
        console.error('Error fetching persons:', error);
        return [];
    }
}

async function fetchSchedule() {
    try {
        console.log('Fetching schedule...');
        const response = await fetch(`${API_BASE}/schedule`);
        const newSchedule = await response.json();
        console.log('Schedule fetched:', newSchedule.length, 'days');
        dutySchedule = newSchedule;
        calculateWorkload();
        console.log('Schedule updated in fetchSchedule');
        return dutySchedule;
    } catch (error) {
        console.error('Error fetching schedule:', error);
        return [];
    }
}

async function fetchPastSchedules() {
    try {
        const response = await fetch(`${API_BASE}/past-schedules`);
        pastSchedules = await response.json();
        return pastSchedules;
    } catch (error) {
        console.error('Error fetching past schedules:', error);
        return [];
    }
}

async function fetchLeaves() {
    try {
        console.log('Fetching leaves...');
        const response = await fetch(`${API_BASE}/leaves`);
        allLeaves = await response.json();
        console.log('Leaves fetched:', allLeaves.length, 'items');
        console.log('Leaves data:', allLeaves);
        return allLeaves;
    } catch (error) {
        console.error('Error fetching leaves:', error);
        return [];
    }
}

async function requestLeave(personName, startDate, endDate, reason) {
    try {
        const response = await fetch(`${API_BASE}/leaves`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                personName, 
                startDate, 
                endDate, 
                reason 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            return result;
        }
    } catch (error) {
        console.error('Error adding work history:', error);
        return { success: false };
    }
}

async function addPersonToDB(name, available) {
    try {
        const response = await fetch(`${API_BASE}/persons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, available })
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding person:', error);
        return { success: false };
    }
}

async function updatePersonInDB(name, available) {
    try {
        const response = await fetch(`${API_BASE}/persons/${name}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ available })
        });
        return await response.json();
    } catch (error) {
        console.error('Error updating person:', error);
        return { success: false };
    }
}

async function removePersonFromDB(name) {
    try {
        const response = await fetch(`${API_BASE}/persons/${name}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Error removing person:', error);
        return { success: false };
    }
}

async function regenerateSchedule() {
    try {
        const response = await fetch(`${API_BASE}/schedule/regenerate`, {
            method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
            dutySchedule = result.schedule;
            calculateWorkload();
        }
        return result;
    } catch (error) {
        console.error('Error regenerating schedule:', error);
        return { success: false };
    }
}

function initializeWorkload() {
    workload = {};
    allPersons.forEach(person => {
        workload[person.name] = 0;
    });
}

function calculateWorkload() {
    workload = {};
    allPersons.forEach(person => {
        workload[person.name] = 0;
    });
    
    dutySchedule.forEach(day => {
        ['morning', 'afternoon', 'night'].forEach(shift => {
            if (day[shift]) {
                workload[day[shift]]++;
            }
        });
    });
}

function checkAuth() {
    const userType = localStorage.getItem("userType");
    if (!userType) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

function goToAdmin() {
    window.location.href = "admin-login.html";
}

async function showDuty() {
    const today = new Date().toISOString().split('T')[0];
    const todaySchedule = dutySchedule.find(s => s.date === today);
    
    console.log('Showing duty for today:', today);
    console.log('Today\'s schedule:', todaySchedule);
    
    if (todaySchedule) {
        document.getElementById("morning").innerText = todaySchedule.morning || "No one assigned";
        document.getElementById("afternoon").innerText = todaySchedule.afternoon || "No one assigned";
        document.getElementById("night").innerText = todaySchedule.night || "No one assigned";
        console.log('Today\'s duty updated:', {
            morning: todaySchedule.morning,
            afternoon: todaySchedule.afternoon,
            night: todaySchedule.night
        });
    } else {
        console.log('No schedule found for today, regenerating...');
        await regenerateSchedule();
        showDuty();
    }
}

function generateWeeklySchedule() {
    console.log('Generating weekly schedule with current dutySchedule:', dutySchedule);
    const scheduleBody = document.getElementById("scheduleBody");
    scheduleBody.innerHTML = "";
    
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const row = document.createElement("tr");
        
        // Use the same date format as leave modal
        const dateDisplay = date.toLocaleDateString('en-US', { 
            day: 'numeric',
            weekday: 'short', 
            month: 'short'
        });
        
        const daySchedule = dutySchedule.find(s => s.date === dateStr);
        
        console.log(`Day ${dateStr} (${dateDisplay}):`, daySchedule);
        
        row.innerHTML = `
            <td>${dateDisplay}</td>
            <td>${daySchedule?.morning || "No one assigned"}</td>
            <td>${daySchedule?.afternoon || "No one assigned"}</td>
            <td>${daySchedule?.night || "No one assigned"}</td>
        `;
        
        scheduleBody.appendChild(row);
    }
    
    console.log('Weekly schedule generated');
}

function setReminder() {
    let date = document.getElementById("reminderDate").value;
    alert("Reminder set for " + date);
}

function analytics() {
    let stats = "";
    
    stats += `Total persons: ${allPersons.length}<br>`;
    stats += "<strong>Workload Distribution:</strong><br>";
    
    // Sort by workload
    const sortedWorkload = Object.entries(workload).sort((a, b) => b[1] - a[1]);
    sortedWorkload.forEach(([name, count]) => {
        stats += `${name}: ${count} shifts<br>`;
    });
    
    document.getElementById("stats").innerHTML = stats;
}

async function showHistory() {
    try {
        const response = await fetch(`${API_BASE}/history`);
        const history = await response.json();
        
        const historyContent = document.getElementById("historyContent");
        
        if (history.length === 0) {
            historyContent.innerHTML = "<p>No history data available. Generate a schedule first.</p>";
        } else {
            // Group history by person
            const historyByPerson = {};
            history.forEach(entry => {
                if (!historyByPerson[entry.person]) {
                    historyByPerson[entry.person] = [];
                }
                historyByPerson[entry.person].push(entry);
            });
            
            let html = '<div class="history-tabs">';
            
            // Create tabs for each person
            Object.keys(historyByPerson).sort().forEach((person, index) => {
                const isActive = index === 0 ? 'active' : '';
                html += `<button class="tab-button ${isActive}" onclick="showPersonHistory('${person}')">${person}</button>`;
            });
            
            html += '</div>';
            html += '<div id="personHistoryContent"></div>';
            
            historyContent.innerHTML = html;
            
            // Show first person's history by default
            if (Object.keys(historyByPerson).length > 0) {
                showPersonHistory(Object.keys(historyByPerson)[0]);
            }
        }
        
        document.getElementById("historyModal").style.display = "block";
        
    } catch (error) {
        console.error('Error fetching history:', error);
        document.getElementById("historyContent").innerHTML = "<p>Error loading history data.</p>";
        document.getElementById("historyModal").style.display = "block";
    }
}

function showPersonHistory(personName) {
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === personName) {
            btn.classList.add('active');
        }
    });
    
    // Fetch person's specific history
    fetch(`${API_BASE}/history/${personName}`)
        .then(response => response.json())
        .then(history => {
            const contentDiv = document.getElementById("personHistoryContent");
            
            if (history.length === 0) {
                contentDiv.innerHTML = `<p>No history for ${personName}</p>`;
                return;
            }
            
            // Sort by date
            history.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            let html = `
                <h3>Work History for ${personName}</h3>
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Shift</th>
                            <th>Day</th>
                            <th>Month</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            history.forEach(entry => {
                const date = new Date(entry.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                const dayNum = date.getDate();
                
                html += `
                    <tr>
                        <td>${entry.date}</td>
                        <td>${entry.shift.charAt(0).toUpperCase() + entry.shift.slice(1)}</td>
                        <td>${dayName}</td>
                        <td>${monthName} ${dayNum}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
                <p><strong>Total shifts:</strong> ${history.length}</p>
            `;
            
            contentDiv.innerHTML = html;
        })
        .catch(error => {
            console.error('Error fetching person history:', error);
            document.getElementById("personHistoryContent").innerHTML = "<p>Error loading history.</p>";
        });
}

function closeHistory() {
    document.getElementById("historyModal").style.display = "none";
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById("historyModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

// Load daily Thirukkural (one per day from thirukkural.json)
async function loadDailyThirukkural() {
    const el = document.getElementById('dailyQuote');
    if (!el) return;
    try {
        const res = await fetch('thirukkural.json');
        const data = await res.json();
        const kurals = data.kural || [];
        if (kurals.length === 0) {
            el.textContent = 'No quote available.';
            return;
        }
        const start = new Date(new Date().getFullYear(), 0, 0);
        const diff = Date.now() - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const idx = dayOfYear % kurals.length;
        const k = kurals[idx];
        const line1 = k.Line1 || '';
        const line2 = k.Line2 || '';
        const trans = k.Translation || '';
        const num = k.Number != null ? k.Number : idx + 1;
        el.innerHTML = `<strong>திருக்குறள் ${num}</strong><br><span lang="ta">${line1}<br>${line2}</span><br><em>${trans}</em>`;
    } catch (err) {
        console.error('Error loading daily Thirukkural:', err);
        el.textContent = 'Daily quote could not be loaded.';
    }
}
// Load daily Thirukkural (one per day from thirukkural.json)
async function loadDailyThirukkural() {
    const el = document.getElementById('dailyQuote');
    if (!el) return;
    try {
        const res = await fetch('thirukkural.json');
        const data = await res.json();
        const kurals = data.kural || [];
        // ... picks one by day-of-year, displays in #dailyQuote
        el.innerHTML = `<strong>திருக்குறள் ${num}</strong><br><span lang="ta">${line1}<br>${line2}</span><br><em>${trans}</em>`;
    } catch (err) {
        // ...
    }
}
window.onload = async function() {
    if (checkAuth()) {
        await fetchPersons();
        await fetchSchedule();
        await fetchLeaves();
        showDuty();
        generateWeeklySchedule();
        analytics();
        loadDailyThirukkural();
        console.log('Daily Thirukkural loaded');
        console.log('Daily Thirukkural:', dailyQuote);
    }
};
