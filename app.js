// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- FIREBASE CONFIGURATION (Replace with your project values or inject via build/env) ---
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// --- INITIALIZE FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// --- GLOBAL VARIABLES ---
let currentItineraryData = null;
let currentUser = null;

// --- UI ELEMENTS ---
const elements = {
    heroSection: document.getElementById('heroSection'),
    planningSection: document.getElementById('planningSection'),
    loadingSection: document.getElementById('loadingSection'),
    itinerarySection: document.getElementById('itinerarySection'),
    authContainer: document.getElementById('auth-container'),
    myTripsList: document.getElementById('myTripsList'),
    modalsContainer: document.getElementById('modals-container'),
};

// --- AUTHENTICATION ---
window.handleLogin = function () {
    signInWithPopup(auth, provider)
        .then((result) => showToast(`Welcome, ${result.user.displayName}!`))
        .catch((error) => {
            console.error(error);
            showToast("Login failed.");
        });
};

window.handleLogout = function () {
    signOut(auth).then(() => {
        showToast("Logged out.");
        showSection(elements.heroSection);
    });
};

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUI();
});

function updateAuthUI() {
    if (currentUser) {
        elements.authContainer.innerHTML = `
            <button id="headerMyTripsBtn" class="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 px-4 py-2 rounded-full transition-all">
                <span class="material-icons-outlined">history</span> <span class="hidden sm:inline">History</span>
            </button>
            <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
                <img src="${currentUser.photoURL}" alt="Profile" class="w-9 h-9 rounded-full border border-slate-300">
                <button onclick="handleLogout()" class="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-full transition-all" title="Logout">
                    <span class="material-icons-outlined text-xl">logout</span>
                </button>
            </div>
        `;
        document.getElementById('headerMyTripsBtn').addEventListener('click', loadAndShowTrips);
    } else {
        elements.authContainer.innerHTML = `
            <button onclick="handleLogin()" class="flex items-center gap-3 bg-white-600 hover:bg-blue-300 text-black font-medium py-2 px-4 rounded-full transition-all border border-slate-200 shadow-sm hover:shadow-md">
                <div class="bg-white p-1 rounded-full flex items-center justify-center w-6 h-6">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-4 h-4">
                </div>
                <span class="text-sm">Sign in with Google</span>
            </button>
        `;
    }
    lucide.createIcons();
}

// --- REALTIME DATABASE LOGIC ---
function saveCurrentTrip() {
    if (!currentUser) {
        showToast("Please sign in to save trips.");
        handleLogin();
        return;
    }
    if (!currentItineraryData) return;

    const tripsRef = ref(db, 'users/' + currentUser.uid + '/trips');
    push(tripsRef, {
        ...currentItineraryData,
        timestamp: Date.now()
    }).then(() => {
        showToast("Trip saved to cloud!");
    }).catch((error) => {
        console.error(error);
        showToast("Error saving trip.");
    });
}

function loadAndShowTrips() {
    if (!currentUser) {
        showToast("Please sign in first.");
        return;
    }

    showModal(document.getElementById('myTripsModal'));
    const listContainer = elements.myTripsList;
    listContainer.innerHTML = '<div class="text-center py-4"><span class="material-icons-outlined animate-spin text-emerald-600">refresh</span> Syncing...</div>';

    const tripsRef = ref(db, 'users/' + currentUser.uid + '/trips');

    onValue(tripsRef, (snapshot) => {
        listContainer.innerHTML = '';
        const data = snapshot.val();

        if (!data) {
            listContainer.innerHTML = `<p class="text-slate-500 text-center">No saved trips found.</p>`;
            return;
        }

        const tripsArray = Object.entries(data).map(([key, value]) => ({ id: key, ...value })).reverse();
        const list = document.createElement('div');
        list.className = 'space-y-4';

        tripsArray.forEach((trip) => {
            const item = document.createElement('div');
            item.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center';
            item.innerHTML = `
                <div>
                    <p class="font-bold text-slate-800">${trip.details.destination}</p>
                    <p class="text-sm text-slate-500">${trip.details.days} Days • ${trip.details.interests}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="load-trip-btn bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-md text-sm">Load</button>
                    <button class="delete-trip-btn p-2 rounded-md hover:bg-red-100 text-red-500">
                        <span class="material-icons-outlined">delete</span>
                    </button>
                </div>
            `;

            item.querySelector('.load-trip-btn').onclick = () => {
                renderItinerary(trip, trip.details);
                showSection(elements.itinerarySection);
                closeModal(document.getElementById('myTripsModal'));
            };

            item.querySelector('.delete-trip-btn').onclick = () => {
                if (confirm('Delete this trip permanently?')) {
                    const tripRef = ref(db, 'users/' + currentUser.uid + '/trips/' + trip.id);
                    remove(tripRef);
                }
            };
            list.appendChild(item);
        });
        listContainer.appendChild(list);
    });
}

// --- AI GENERATION LOGIC ---
function startGeneration() {
    document.getElementById('errorMessage').classList.remove('show');
    showSection(elements.loadingSection);
    document.getElementById('generateBtn').disabled = true;

    const destinationCity = document.getElementById('destination').value.split(',')[0] || "your destination";
    document.getElementById('loaderText').textContent = `Mapping adventure for ${destinationCity}...`;

    generateItinerary()
        .then(itineraryData => {
            if (itineraryData && itineraryData.days) {
                renderItinerary(itineraryData);
                showSection(elements.itinerarySection);
            } else {
                throw new Error("Invalid itinerary format.");
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('errorText').textContent = err.message;
            document.getElementById('errorMessage').classList.add('show');
            showSection(elements.planningSection);
        })
        .finally(() => {
            document.getElementById('generateBtn').disabled = false;
        });
}

async function generateItinerary() {
    const destination = document.getElementById('destination').value;
    const days = parseInt(document.getElementById('days').value, 10);
    const interests = document.getElementById('interests').value;
    const includeHotels = document.getElementById('includeHotels').checked;

    if (!destination || !days || !interests) {
        throw new Error("Please fill out all the trip details.");
    }

    const validIcons = ["map-pin", "camera", "soup", "leaf", "shopping-cart", "trees", "beer", "gamepad-2", "heart", "gem", "bar-chart-2", "plane", "bus", "train", "utensils-crossed", "landmark", "mountain", "palace", "ticket", "log-in", "bed-double"];

    const eventSchema = {
        type: "OBJECT",
        properties: {
            "time": { type: "STRING" },
            "title": { type: "STRING" },
            "locationName": { type: "STRING" },
            "description": { type: "STRING" },
            "icon": { type: "STRING" },
            "latitude": { type: "NUMBER" },
            "longitude": { type: "NUMBER" }
        },
        required: ["time", "title", "locationName", "description", "icon", "latitude", "longitude"]
    };
    const daySchema = {
        type: "OBJECT",
        properties: {
            "day": { type: "NUMBER" },
            "title": { type: "STRING" },
            "events": { type: "ARRAY", items: eventSchema }
        },
        required: ["day", "title", "events"]
    };
    const metaSchema = {
        type: "OBJECT",
        properties: {
            "tripTitle": { type: "STRING" },
            "dayThemes": { type: "ARRAY", items: { type: "STRING" } },
            "hotelRecommendations": {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "name": { type: "STRING" },
                        "style": { type: "STRING" },
                        "description": { type: "STRING" },
                        "latitude": { type: "NUMBER" },
                        "longitude": { type: "NUMBER" }
                    },
                    required: ["name", "style", "description", "latitude", "longitude"]
                }
            }
        },
        required: ["tripTitle", "dayThemes", "hotelRecommendations"]
    };

    const hotelInstruction = includeHotels
        ? "Provide 3 distinct hotel recommendations in hotelRecommendations."
        : "RETURN AN EMPTY ARRAY for hotelRecommendations. DO NOT generate any hotels.";
    const metaPrompt = `You are an expert Travel Planner. Plan the overview of a ${days}-day trip to ${destination} focusing on: ${interests}.
1. tripTitle: a short catchy title.
2. dayThemes: exactly ${days} short strings, one per day, each naming the area/neighbourhood and focus of that day. Group nearby places together and make sure no attraction appears on two days.
3. ${hotelInstruction}`;
    const meta = await callGenerativeAPI(`Overview for a ${days} day trip to ${destination}. Interests: ${interests}.`, metaPrompt, metaSchema);
    const themes = Array.isArray(meta.dayThemes) ? meta.dayThemes : [];

    const dayPrompt = (n) => `You are an expert Travel Planner. Plan ONLY day ${n} of a ${days}-day trip to ${destination}. Interests: ${interests}.
This day's theme/area: ${themes[n - 1] || 'a distinct area not covered by the other days'}.
Key Constraints:
1. Provide 4 to 6 events in logical order for the day, staying in or near the theme area.
2. Set "day" to ${n}.
3. Choose icons from: ${validIcons.join(', ')}.
4. For each event, provide specific location name, coordinates, and description.
5. CRITICAL: For any 'Lunch' or 'Dinner' or 'Breakfast' event, the locationName MUST be a REAL, SPECIFIC RESTAURANT Name (e.g. 'Paradise Biryani House', 'Karim's', 'Saravana Bhavan'). Do NOT use generic names like 'Local Restaurant' or 'Street Food'. This is required for search links to work.`;

    const results = new Array(days);
    let next = 1, done = 0;
    const loader = document.getElementById('loaderText');
    const worker = async () => {
        while (next <= days) {
            const n = next++;
            const d = await callGenerativeAPI(`Plan day ${n} of ${days} in ${destination}.`, dayPrompt(n), daySchema);
            d.day = n;
            results[n - 1] = d;
            done++;
            if (loader) loader.textContent = `Planned ${done} of ${days} days...`;
        }
    };
    await Promise.all(Array.from({ length: Math.min(8, days) }, worker));

    return {
        tripTitle: meta.tripTitle,
        days: results,
        hotelRecommendations: includeHotels ? (meta.hotelRecommendations || []) : []
    };
}

async function callGenerativeAPI(userQuery, systemPrompt, schema) {
    const apiUrl = "/.netlify/functions/generate";

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nUser Request: ${userQuery}` }]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    };

    let retries = 3;
    let delay = 1000;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                let jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (jsonText) {
                    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
                    return JSON.parse(jsonText);
                } else {
                    throw new Error("API returned an empty response.");
                }
            }

            const errorBody = await response.json().catch(() => ({}));
            const errorMessage = errorBody?.error?.message || `HTTP ${response.status}`;

            if ((response.status === 503 || response.status === 429 || response.status >= 500) && i < retries - 1) {
                console.warn(`Transient API error (${response.status}). Retrying in ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
                continue;
            }

            const apiErr = new Error(`API request failed (${response.status}): ${errorMessage}`);
            apiErr.nonRetryable = true;
            throw apiErr;
        } catch (error) {
            if (i === retries - 1 || error.nonRetryable) throw error;
        }
    }
}

function renderItinerary(itineraryData, tripDetails = null) {
    const details = tripDetails || {
        destination: document.getElementById('destination').value,
        days: document.getElementById('days').value,
        interests: document.getElementById('interests').value,
    };
    currentItineraryData = { ...itineraryData, details };

    document.getElementById('trip-title').textContent = itineraryData.tripTitle || `Trip to ${details.destination}`;
    document.getElementById('trip-subtitle').textContent = `${details.days} Days • ${details.interests}`;

    const hotelContainer = document.getElementById('hotel-section-container');
    const hotelCardsContainer = document.getElementById('hotel-cards');
    hotelCardsContainer.innerHTML = '';

    if (itineraryData.hotelRecommendations && itineraryData.hotelRecommendations.length > 0) {
        hotelContainer.classList.remove('hidden');
        itineraryData.hotelRecommendations.forEach(hotel => {
            const card = document.createElement('div');
            card.className = "bg-white rounded-xl p-4 border border-purple-100 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all";
            card.innerHTML = `
                <div class="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                <div class="flex gap-4">
                    <div class="bg-purple-50 p-2.5 rounded-lg h-fit text-purple-600">
                        <span class="material-icons-outlined">bed</span>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 text-base mb-1">${hotel.name}</h4>
                        <p class="text-xs text-slate-500 mb-2 leading-relaxed">${hotel.description}</p>
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + " " + details.destination)}" target="_blank" class="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1">
                            <span class="material-icons-outlined text-sm">map</span> View on Map
                        </a>
                    </div>
                </div>
            `;
            hotelCardsContainer.appendChild(card);
        });
    } else {
        hotelContainer.classList.add('hidden');
    }

    const itineraryContentContainer = document.getElementById('itinerary-content-container');
    itineraryContentContainer.innerHTML = '';
    itineraryData.days.forEach((day, dayIndex) => {
        const dayContainer = document.createElement('div');
        dayContainer.className = "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden day-events-container";
        dayContainer.dataset.dayIndex = dayIndex;

        let mapsUrl = "#";
        const coords = day.events.filter(e => e.locationName);

        if (coords.length >= 2) {
            const origin = encodeURIComponent(coords[0].locationName + ", " + details.destination);
            const dest = encodeURIComponent(coords[coords.length - 1].locationName + ", " + details.destination);
            let waypoints = "";
            if (coords.length > 2) {
                const wpList = coords.slice(1, -1).map(e => encodeURIComponent(e.locationName + ", " + details.destination)).join("|");
                waypoints = `&waypoints=${wpList}`;
            }
            mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints}&travelmode=driving`;
        } else if (coords.length === 1) {
            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords[0].locationName + ", " + details.destination)}`;
        }

        let contentHTML = `
            <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Day ${day.day}</h3>
                    <p class="text-slate-500 text-sm font-medium">${day.title}</p>
                </div>
                <a href="${mapsUrl}" target="_blank" class="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all">
                    <span class="material-icons-outlined text-sm">map</span> Route Map
                </a>
            </div>
            <div class="relative pl-4 space-y-6">
                <div class="absolute left-[19px] top-3 bottom-6 w-0.5 bg-slate-200"></div>
        `;

        (day.events || []).forEach((event, eventIndex) => {
            const isFood = /lunch|dinner|breakfast|snack|meal|cafe|restaurant|food/i.test(event.title + event.description + event.icon);
            const encodedLoc = encodeURIComponent(event.locationName + " " + details.destination);
            const mapsLoc = encodeURIComponent(event.locationName + ", " + details.destination);

            contentHTML += `
            <div class="flex gap-4 group relative z-10" data-day-index="${dayIndex}" data-event-index="${eventIndex}">
                <div class="flex flex-col items-center pt-1">
                    <div class="w-10 h-10 rounded-full border-4 border-white shadow-md flex items-center justify-center
                        ${isFood ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}">
                        <span class="material-icons-outlined text-lg">${isFood ? 'restaurant' : 'place'}</span>
                    </div>
                </div>
                <div class="flex-1 pb-2 bg-slate-50/50 rounded-xl p-4 border border-slate-100 hover:border-slate-300 transition-colors">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-xs font-bold px-2 py-0.5 rounded border bg-white text-slate-600 border-slate-200">${event.time}</span>

                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="move-btn-up p-1 hover:bg-white rounded text-slate-400 hover:text-slate-700 disabled:opacity-0 transition-all" data-day="${dayIndex}" data-idx="${eventIndex}" ${eventIndex === 0 ? 'disabled' : ''}>
                                <span class="material-icons-outlined text-sm">arrow_upward</span>
                            </button>
                            <button class="move-btn-down p-1 hover:bg-white rounded text-slate-400 hover:text-slate-700 disabled:opacity-0 transition-all" data-day="${dayIndex}" data-idx="${eventIndex}" ${eventIndex === day.events.length - 1 ? 'disabled' : ''}>
                                <span class="material-icons-outlined text-sm">arrow_downward</span>
                            </button>
                            <button class="delete-btn p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 ml-1 transition-all" data-day="${dayIndex}" data-idx="${eventIndex}">
                                <span class="material-icons-outlined text-sm">close</span>
                            </button>
                        </div>
                    </div>
                    <h4 class="text-base font-bold text-slate-900 mb-1">${event.locationName}</h4>
                    <p class="text-sm text-slate-600 leading-relaxed">${event.description}</p>

                    <div class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100/50">
                        ${isFood ? `
                        <a href="https://www.zomato.com/search?q=${encodedLoc}" target="_blank" class="inline-flex items-center gap-1 px-2 py-1 bg-[#cb202d] text-white text-[10px] font-bold rounded hover:bg-[#b01b27] transition-colors shadow-sm">
                            <span class="material-icons-outlined text-[12px]">restaurant</span> Zomato
                        </a>
                        <a href="https://www.swiggy.com/search?query=${encodedLoc}" target="_blank" class="inline-flex items-center gap-1 px-2 py-1 bg-[#fc8019] text-white text-[10px] font-bold rounded hover:bg-[#e47316] transition-colors shadow-sm">
                            <span class="material-icons-outlined text-[12px]">delivery_dining</span> Swiggy
                        </a>` : ''}
                        <a href="https://m.uber.com/ul/?action=setPickup&client_id=uber&pickup=my_location&dropoff[formatted_address]=${encodedLoc}" target="_blank" class="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded hover:bg-slate-200 transition-colors">
                            <span class="material-icons-outlined text-[12px]">local_taxi</span> Uber
                        </a>
                        <a href="https://www.rapido.bike/" target="_blank" class="inline-flex items-center gap-1 px-2 py-1 bg-[#f9c935] text-slate-900 border border-yellow-400 text-[10px] font-bold rounded hover:bg-[#eebf2f] transition-colors">
                            <span class="material-icons-outlined text-[12px]">two_wheeler</span> Rapido
                        </a>
                        <a href="https://www.google.com/maps/search/?api=1&query=${mapsLoc}" target="_blank" class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold rounded hover:bg-blue-100 transition-colors">
                            <span class="material-icons-outlined text-[12px]">map</span> Map
                        </a>
                    </div>
                </div>
            </div>`;
        });
        contentHTML += `</div>`;
        dayContainer.innerHTML = contentHTML;
        itineraryContentContainer.appendChild(dayContainer);
    });
    lucide.createIcons();
}

// --- HELPER UI FUNCTIONS ---
function showSection(section) {
    [elements.heroSection, elements.planningSection, elements.loadingSection, elements.itinerarySection].forEach(s => s.classList.add('hidden'));
    document.getElementById('errorMessage').classList.remove('show');
    section.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-4');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
    }, 3500);
}

function showModal(modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
    }, 10);
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('opacity-0');
    modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function handleItineraryClick(e) {
    const upBtn = e.target.closest('.move-btn-up');
    const downBtn = e.target.closest('.move-btn-down');
    const deleteBtn = e.target.closest('.delete-btn');

    if (upBtn && !upBtn.disabled) moveEvent(parseInt(upBtn.dataset.day), parseInt(upBtn.dataset.idx), -1);
    if (downBtn && !downBtn.disabled) moveEvent(parseInt(downBtn.dataset.day), parseInt(downBtn.dataset.idx), 1);
    if (deleteBtn) deleteEvent(parseInt(deleteBtn.dataset.day), parseInt(deleteBtn.dataset.idx));
}

function moveEvent(dayIdx, eventIdx, direction) {
    if (!currentItineraryData) return;
    const events = currentItineraryData.days[dayIdx].events;
    const newIdx = eventIdx + direction;
    if (newIdx >= 0 && newIdx < events.length) {
        [events[eventIdx], events[newIdx]] = [events[newIdx], events[eventIdx]];
        renderItinerary(currentItineraryData, currentItineraryData.details);
    }
}

function deleteEvent(dayIdx, eventIdx) {
    if (!currentItineraryData) return;
    currentItineraryData.days[dayIdx].events.splice(eventIdx, 1);
    renderItinerary(currentItineraryData, currentItineraryData.details);
}

// --- EVENT LISTENERS ---
document.getElementById('startPlanningBtn').addEventListener('click', () => {
    if (currentUser) {
        showSection(elements.planningSection);
    } else {
        showToast("Please sign in to plan.");
        handleLogin();
    }
});

document.getElementById('generateBtn').addEventListener('click', startGeneration);
document.getElementById('startOverBtn').addEventListener('click', () => showSection(elements.heroSection));
document.getElementById('saveTripBtn').addEventListener('click', saveCurrentTrip);

document.getElementById('itinerary-content-container').addEventListener('click', handleItineraryClick);

elements.modalsContainer.addEventListener('click', (e) => {
    if (e.target.closest('.close-modal-btn') || e.target.matches('.modal-backdrop')) {
        closeModal(e.target.closest('.modal-backdrop'));
    }
});

window.onload = function () {
    lucide.createIcons();
};
