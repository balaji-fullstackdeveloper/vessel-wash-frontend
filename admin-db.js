// Database API functions
const API_BASE = 'https://vessel-wash.onrender.com/api';

let allPersons = [];
let dutySchedule = [];
let workload = {};
let pastSchedules = [];

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
        const response = await fetch(`${API_BASE}/schedule`);
        dutySchedule = await response.json();
        calculateWorkload();
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
    if (userType !== "admin") {
        window.location.href = "admin-login.html";
        return false;
    }
    return true;
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

function goToUser() {
    window.location.href = "login.html";
}

async function showDuty() {
    const today = new Date().toDateString();
    const todaySchedule = dutySchedule.find(s => s.date === today);
    
    if (todaySchedule) {
        document.getElementById("morning").innerText = todaySchedule.morning || "No one assigned";
        document.getElementById("afternoon").innerText = todaySchedule.afternoon || "No one assigned";
        document.getElementById("night").innerText = todaySchedule.night || "No one assigned";
    } else {
        await regenerateSchedule();
        showDuty();
    }
}

async function addPerson() {
    let name = document.getElementById("newPerson").value;
    
    if (name.trim() === "") {
        alert("Please enter a name");
        return;
    }
    
    const available = [];
    if (document.getElementById("availMorning").checked) available.push("morning");
    if (document.getElementById("availAfternoon").checked) available.push("afternoon");
    if (document.getElementById("availNight").checked) available.push("night");
    
    if (available.length === 0) {
        alert("Please select at least one available time");
        return;
    }
    
    const result = await addPersonToDB(name, available);
    
    if (result.success) {
        alert("Person Added: " + name + " (Available: " + available.join(", ") + ")");
        
        // Reset form
        document.getElementById("newPerson").value = "";
        document.getElementById("availMorning").checked = false;
        document.getElementById("availAfternoon").checked = false;
        document.getElementById("availNight").checked = false;
        
        await fetchPersons();
        await regenerateSchedule();
        await fetchPastSchedules();
        populatePersonDropdown();
        showDuty();
        analytics();
        generatePastSchedule();
    } else {
        alert("Failed to add person");
    }
}

function populatePersonDropdown() {
    const removeDropdown = document.getElementById("personToRemove");
    const editDropdown = document.getElementById("personToEdit");
    
    removeDropdown.innerHTML = '<option value="">Select person to remove</option>';
    editDropdown.innerHTML = '<option value="">Select person to edit</option>';
    
    allPersons.forEach(person => {
        // Remove dropdown
        const removeOption = document.createElement("option");
        removeOption.value = person.name;
        removeOption.textContent = person.name + " (" + person.available.join(", ") + ")";
        removeDropdown.appendChild(removeOption);
        
        // Edit dropdown
        const editOption = document.createElement("option");
        editOption.value = person.name;
        editOption.textContent = person.name + " (" + person.available.join(", ") + ")";
        editDropdown.appendChild(editOption);
    });
}

async function editPerson() {
    const editDropdown = document.getElementById("personToEdit");
    const personName = editDropdown.value;
    
    if (!personName || personName.trim() === "") {
        alert("Please select a person to edit");
        return;
    }
    
    const available = [];
    if (document.getElementById("editMorning").checked) available.push("morning");
    if (document.getElementById("editAfternoon").checked) available.push("afternoon");
    if (document.getElementById("editNight").checked) available.push("night");
    
    if (available.length === 0) {
        alert("Please select at least one available time");
        return;
    }
    
    const result = await updatePersonInDB(personName, available);
    
    if (result.success) {
        alert("Updated " + personName + " availability to: " + available.join(", "));
        
        // Reset form
        editDropdown.value = "";
        document.getElementById("editMorning").checked = false;
        document.getElementById("editAfternoon").checked = false;
        document.getElementById("editNight").checked = false;
        
        await fetchPersons();
        await regenerateSchedule();
        await fetchPastSchedules();
        populatePersonDropdown();
        showDuty();
        analytics();
        generatePastSchedule();
    } else {
        alert("Failed to update person");
    }
}

async function removePerson() {
    const dropdown = document.getElementById("personToRemove");
    const name = dropdown.value;
    
    if (!name || name.trim() === "") {
        alert("Please select a person to remove");
        return;
    }
    
    const result = await removePersonFromDB(name);
    
    if (result.success) {
        alert("Removed: " + name);
        delete workload[name];
        
        await fetchPersons();
        await regenerateSchedule();
        await fetchPastSchedules();
        populatePersonDropdown();
        showDuty();
        analytics();
        generatePastSchedule();
    } else {
        alert("Failed to remove person");
    }
}

// Add event listener to auto-fill checkboxes when person is selected
document.addEventListener('DOMContentLoaded', function() {
    const editDropdown = document.getElementById("personToEdit");
    if (editDropdown) {
        editDropdown.addEventListener('change', function() {
            const personName = this.value;
            if (personName) {
                const person = allPersons.find(p => p.name === personName);
                if (person) {
                    document.getElementById("editMorning").checked = person.available.includes("morning");
                    document.getElementById("editAfternoon").checked = person.available.includes("afternoon");
                    document.getElementById("editNight").checked = person.available.includes("night");
                }
            } else {
                document.getElementById("editMorning").checked = false;
                document.getElementById("editAfternoon").checked = false;
                document.getElementById("editNight").checked = false;
            }
        });
    }
});

function setReminder() {
    let date = document.getElementById("reminderDate").value;
    alert("Reminder set for " + date);
}

function generatePastSchedule() {
    console.log('Generating past schedule with current dutySchedule:', dutySchedule);
    const pastScheduleBody = document.getElementById("pastScheduleBody");
    pastScheduleBody.innerHTML = "";
    
    // Use current schedule instead of pastSchedules to show live data
    if (dutySchedule.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="4" style="text-align: center;">No schedule data available</td>`;
        pastScheduleBody.appendChild(row);
        return;
    }
    
    // Show current schedule (next 30 days or all available)
    const daysToShow = Math.min(30, dutySchedule.length);
    
    for (let i = 0; i < daysToShow; i++) {
        const daySchedule = dutySchedule[i];
        const row = document.createElement("tr");
        
        // Use the same date format as leave modal and weekly schedule
        const date = new Date(daySchedule.date);
        const dateDisplay = date.toLocaleDateString('en-US', { 
            day: 'numeric',
            weekday: 'short', 
            month: 'short'
        });
        
        console.log(`Admin schedule day ${daySchedule.date} (${dateDisplay}):`, daySchedule);
        
        row.innerHTML = `
            <td>${dateDisplay}</td>
            <td>${daySchedule.morning || "No one assigned"}</td>
            <td>${daySchedule.afternoon || "No one assigned"}</td>
            <td>${daySchedule.night || "No one assigned"}</td>
        `;
        
        pastScheduleBody.appendChild(row);
    }
    
    console.log('Admin past schedule generated');
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

// Initialize admin panel
window.onload = async function() {
    await fetchPersons();
    await fetchSchedule();
    await fetchPastSchedules();
    populatePersonDropdown();
    showDuty();
    analytics();
    generatePastSchedule();
};
