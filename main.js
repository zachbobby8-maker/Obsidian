// --- FIREBASE SETUP ---
// Paste your Firebase config here to enable Realtime Multiplayer!
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let db;
let useFirebase = false;

if (firebaseConfig.apiKey && typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  useFirebase = true;
  console.log("Firebase Realtime Sync Enabled!");
}
// -----------------------

// --- ADMIN CONFIG ---
const ADMIN_ID = '186';
// --------------------

const STORAGE_KEYS = {
  SPINS: 'obsidian_spins_v2',
  ROLLS: 'obsidian_rolls_v2',
  EXPOSURES: 'obsidian_exposures_v2',
  WHEEL: 'obsidian_wheel_v2'
};

// AI Model for Task Generation (RolePlay V2)
const AI_MODEL_ID = '052a23d8-d053-4fc6-a23b-4cdbb2f78a45';

// Default Wheel Items
const DEFAULT_WHEEL = ['edge', 'Walk out nude', 'Cage cock', 'inhale 15 sec', 'send daddy 15', 'Total ruin'];

// App State
const appState = {
  currentUser: '',
  isAdmin: false,
  wheelItems: [],
  spins: [],
  rolls: [],
  exposures: []
};

// DOM Elements
const elements = {
  loginModal: document.getElementById('login-modal'),
  loginInput: document.getElementById('piggy-id-input'),
  loginBtn: document.getElementById('login-btn'),
  mainHeader: document.getElementById('main-header'),
  mainContent: document.getElementById('main-content'),
  currentUserDisplay: document.getElementById('current-user-display'),
  logoutBtn: document.getElementById('logout-btn'),
  navBtns: document.querySelectorAll('.nav-btn'),
  viewSections: document.querySelectorAll('.view-section'),
  
  // Wheel
  wheelCanvas: document.getElementById('wheel-canvas'),
  aiSpinBtn: document.getElementById('ai-spin-btn'),
  manualSpinBtn: document.getElementById('manual-spin-btn'),
  wheelResult: document.getElementById('wheel-result'),
  staticWheelList: document.getElementById('static-wheel-list'),
  
  // Admin Wheel Editor
  premiumAd: document.getElementById('premium-ad'),
  adminWheelEditor: document.getElementById('admin-wheel-editor'),
  adminWheelList: document.getElementById('admin-wheel-list'),
  adminWheelInput: document.getElementById('admin-wheel-input'),
  adminWheelAddBtn: document.getElementById('admin-wheel-add-btn'),
  
  // Dice
  diceContainer: document.getElementById('dice-container'),
  rollDiceBtn: document.getElementById('roll-dice-btn'),
  diceResultContainer: document.getElementById('dice-result-container'),
  diceNumberDisplay: document.getElementById('dice-number'),
  diceTaskText: document.getElementById('dice-task-text'),
  
  // Exposure
  exposureUpload: document.getElementById('exposure-upload'),
  exposureGallery: document.getElementById('exposure-gallery'),
  
  // Trainer
  trainerSpinsList: document.getElementById('trainer-spins-list'),
  trainerRollsList: document.getElementById('trainer-rolls-list'),
  refreshTrainerBtn: document.getElementById('refresh-trainer-btn'),
  firebaseWarning: document.getElementById('firebase-warning'),
  adminClearLogsBtn: document.getElementById('admin-clear-logs-btn')
};

let wheelRotation = 0;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  switchTab('wheel-view'); // Set initial active tab styles
  
  // Check if we have a saved ID in session (for hot-seat switching)
  const savedId = sessionStorage.getItem('piggy_id');
  if (savedId) {
    appState.currentUser = savedId;
    await loginUser(savedId);
  }
});

function setupEventListeners() {
  // Login
  elements.loginBtn.addEventListener('click', () => {
    const id = elements.loginInput.value.trim().toUpperCase();
    if (id) loginUser(id);
  });
  elements.loginInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.loginBtn.click();
  });
  elements.logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('piggy_id');
    location.reload();
  });

  // Navigation
  elements.navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.target = btn.dataset.target));
  });

  // Wheel
  elements.aiSpinBtn.addEventListener('click', aiSpinWheel);
  elements.manualSpinBtn.addEventListener('click', manualSpinWheel);
  
  // Admin Wheel
  elements.adminWheelAddBtn.addEventListener('click', addAdminWheelItem);
  elements.adminWheelInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addAdminWheelItem();
  });

  // Dice
  elements.rollDiceBtn.addEventListener('click', rollDice);

  // Exposure
  elements.exposureUpload.addEventListener('change', handleExposureUpload);
  
  // Trainer
  elements.refreshTrainerBtn.addEventListener('click', () => {
    if (!useFirebase) {
      loadData();
      showToast('Trainer board synced locally.', '#00ffff', 'text-black');
    } else {
      showToast('Board is synced in Realtime via Firebase.', '#00ffff', 'text-black');
    }
  });
}

// --- UI Utilities ---
function showToast(message, bgColor, textColor = 'text-white') {
  const toast = document.createElement('div');
  toast.className = `px-4 py-2 rounded font-bold shadow-lg transform transition-all duration-300 translate-y-10 opacity-0 ${textColor} border border-black/20 uppercase tracking-wide text-sm flex items-center gap-2 z-[9999]`;
  toast.style.backgroundColor = bgColor;
  toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg> ${message}`;
  
  document.getElementById('toast-container').appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  });
  
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-10');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Auth & Data Loading ---
async function loginUser(id) {
  appState.currentUser = id;
  appState.isAdmin = (id === ADMIN_ID);
  sessionStorage.setItem('piggy_id', id);
  
  if (appState.isAdmin) {
    elements.currentUserDisplay.innerHTML = `PIGGY: ${id} <span class="bg-bloodred text-white text-[10px] font-black px-2 py-0.5 rounded ml-2 uppercase tracking-widest border border-white/20 shadow-[0_0_10px_rgba(197,0,26,0.5)]">Master</span>`;
    elements.premiumAd.classList.add('hidden');
    elements.adminWheelEditor.classList.remove('hidden');
    elements.adminClearLogsBtn.classList.remove('hidden');
  } else {
    elements.currentUserDisplay.textContent = `PIGGY: ${id}`;
    elements.premiumAd.classList.remove('hidden');
    elements.adminWheelEditor.classList.add('hidden');
    elements.adminClearLogsBtn.classList.add('hidden');
  }
  
  elements.loginModal.classList.replace('flex', 'hidden');
  elements.mainHeader.classList.remove('hidden');
  elements.mainContent.classList.remove('hidden');
  
  await loadData();
}

async function loadData() {
  if (!useFirebase && elements.firebaseWarning) {
    elements.firebaseWarning.classList.remove('hidden');
  }

  if (useFirebase) {
    // Realtime Sync via Firebase
    db.ref('obsidian/wheel').on('value', snap => {
      appState.wheelItems = snap.val() || DEFAULT_WHEEL;
      renderWheel();
      renderStaticWheelList();
      if(appState.isAdmin) renderAdminWheelList();
    });
    db.ref('obsidian/spins').on('value', snap => {
      appState.spins = snap.val() || [];
      renderTrainerBoard();
    });
    db.ref('obsidian/rolls').on('value', snap => {
      appState.rolls = snap.val() || [];
      renderTrainerBoard();
    });
    db.ref('obsidian/exposures').on('value', snap => {
      appState.exposures = snap.val() || [];
      cleanupExposures();
      renderExposures();
    });
  } else {
    // Local Fallback Sync
    try {
      const [wheelStr, spinsStr, rollsStr, expStr] = await Promise.all([
        window.miniappsAI.storage.getItem(STORAGE_KEYS.WHEEL),
        window.miniappsAI.storage.getItem(STORAGE_KEYS.SPINS),
        window.miniappsAI.storage.getItem(STORAGE_KEYS.ROLLS),
        window.miniappsAI.storage.getItem(STORAGE_KEYS.EXPOSURES)
      ]);
      
      appState.wheelItems = wheelStr ? JSON.parse(wheelStr) : DEFAULT_WHEEL;
      appState.spins = spinsStr ? JSON.parse(spinsStr) : [];
      appState.rolls = rollsStr ? JSON.parse(rollsStr) : [];
      appState.exposures = expStr ? JSON.parse(expStr) : [];
      
      cleanupExposures();
      renderExposures();
      renderTrainerBoard();
      renderWheel();
      renderStaticWheelList();
      if(appState.isAdmin) renderAdminWheelList();
    } catch (err) {
      console.error('Error loading local data:', err);
    }
  }
}

function cleanupExposures() {
  const now = Date.now();
  const validExposures = appState.exposures.filter(e => e.expires_at > now);
  if (validExposures.length !== appState.exposures.length) {
    appState.exposures = validExposures;
    saveExposures();
  }
}

// --- Persistence Helpers ---
async function saveWheel() {
  if (useFirebase) {
    await db.ref('obsidian/wheel').set(appState.wheelItems);
  } else {
    await window.miniappsAI.storage.setItem(STORAGE_KEYS.WHEEL, JSON.stringify(appState.wheelItems));
  }
}

async function saveSpins() {
  if (appState.spins.length > 250) appState.spins.length = 250;
  if (useFirebase) {
    await db.ref('obsidian/spins').set(appState.spins);
  } else {
    await window.miniappsAI.storage.setItem(STORAGE_KEYS.SPINS, JSON.stringify(appState.spins));
  }
}

async function saveRolls() {
  if (appState.rolls.length > 250) appState.rolls.length = 250;
  if (useFirebase) {
    await db.ref('obsidian/rolls').set(appState.rolls);
  } else {
    await window.miniappsAI.storage.setItem(STORAGE_KEYS.ROLLS, JSON.stringify(appState.rolls));
  }
}

async function saveExposures() {
  if (appState.exposures.length > 25) appState.exposures.length = 25;
  if (useFirebase) {
    await db.ref('obsidian/exposures').set(appState.exposures);
  } else {
    await window.miniappsAI.storage.setItem(STORAGE_KEYS.EXPOSURES, JSON.stringify(appState.exposures));
  }
}

// --- Navigation ---
function switchTab(targetId) {
  elements.viewSections.forEach(sec => sec.classList.remove('active'));
  const activeSec = document.getElementById(targetId);
  if (activeSec) activeSec.classList.add('active');
  
  elements.navBtns.forEach(btn => {
    const isActive = btn.dataset.target === targetId;
    
    let colorClass = 'border-bloodred';
    let textClass = 'text-bloodred';
    
    if (targetId === 'dice-view') { 
      colorClass = 'border-neonpurple'; 
      textClass = 'text-neonpurple'; 
    } else if (targetId === 'exposure-view') { 
      colorClass = 'border-warningyellow'; 
      textClass = 'text-warningyellow'; 
    } else if (targetId === 'trainer-view') { 
      colorClass = 'border-terminalcyan'; 
      textClass = 'text-terminalcyan'; 
    }
    
    btn.className = 'nav-btn pb-1 px-3 whitespace-nowrap transition-colors ' + 
      (isActive ? `${textClass} border-b-2 ${colorClass} font-bold` : 'text-lightgray hover:text-white');
  });

  if(targetId === 'wheel-view') {
    renderWheel();
    renderStaticWheelList();
  }
  if(targetId === 'exposure-view') renderExposures();
  if(targetId === 'trainer-view') renderTrainerBoard();
}

// --- Admin Wheel Logic ---
async function addAdminWheelItem() {
  const text = elements.adminWheelInput.value.trim();
  if (!text) return;
  
  appState.wheelItems.push(text);
  elements.adminWheelInput.value = '';
  
  await saveWheel();
  if (!useFirebase) {
    renderWheel();
    renderStaticWheelList();
    renderAdminWheelList();
  }
  showToast('Wheel updated!', '#C5001A');
}

window.removeAdminWheelItem = async function(index) {
  if(appState.wheelItems.length <= 2) {
    showToast('Cannot have fewer than 2 items', '#C5001A');
    return;
  }
  appState.wheelItems.splice(index, 1);
  await saveWheel();
  if (!useFirebase) {
    renderWheel();
    renderStaticWheelList();
    renderAdminWheelList();
  }
};

function renderStaticWheelList() {
  elements.staticWheelList.innerHTML = '';
  appState.wheelItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = "p-2.5 bg-obsidian border border-gray-800 rounded shadow-inner";
    li.textContent = `${index + 1}. ${item}`;
    elements.staticWheelList.appendChild(li);
  });
}

function renderAdminWheelList() {
  elements.adminWheelList.innerHTML = '';
  appState.wheelItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = "p-2 bg-obsidian border border-bloodred/30 rounded flex justify-between items-center";
    li.innerHTML = `
      <span>${item}</span>
      <button class="text-bloodred hover:text-white font-bold px-2 rounded hover:bg-bloodred/50 transition-colors" onclick="removeAdminWheelItem(${index})">✕</button>
    `;
    elements.adminWheelList.appendChild(li);
  });
}

// --- Wheel Logic ---
function renderWheel() {
  const ctx = elements.wheelCanvas.getContext('2d');
  const items = appState.wheelItems;
  const numItems = items.length;
  if(numItems === 0) return;

  const w = elements.wheelCanvas.width;
  const h = elements.wheelCanvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(centerX, centerY) - 5;

  ctx.clearRect(0, 0, w, h);
  const sliceAngle = (2 * Math.PI) / numItems;

  for (let i = 0; i < numItems; i++) {
    const startAngle = i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    
    ctx.fillStyle = i % 2 === 0 ? '#1F2833' : '#C5001A';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0B0C10';
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    
    let text = items[i];
    if (text.length > 15) text = text.substring(0, 15) + '...';
    
    ctx.fillText(text, radius - 15, 0);
    ctx.restore();
  }
}

function manualSpinWheel() {
  if (appState.wheelItems.length === 0) return;
  elements.aiSpinBtn.disabled = true;
  elements.manualSpinBtn.disabled = true;
  elements.wheelResult.textContent = 'SPINNING...';
  
  const winningIndex = Math.floor(Math.random() * appState.wheelItems.length);
  const resultText = appState.wheelItems[winningIndex];
  
  animateWheelToIndex(winningIndex, resultText, false);
}

async function aiSpinWheel() {
  if (appState.wheelItems.length === 0) return;
  
  elements.aiSpinBtn.disabled = true;
  elements.manualSpinBtn.disabled = true;
  elements.wheelResult.innerHTML = '<span class="animate-pulse text-bloodred">CRAIG IS DECIDING...</span>';
  
  try {
    const aiResponse = await window.miniappsAI.callModel({
      modelId: AI_MODEL_ID,
      messages: [
        { role: 'system', content: `You are 'CRAIG', a dominant AI. Choose exactly ONE of these wheel outcomes to inflict on the submissive user: ${appState.wheelItems.join(', ')}. Reply ONLY with the exact text of the chosen outcome. No intro, no punctuation.` },
        { role: 'user', content: 'Master, pick my outcome.' }
      ]
    });
    
    let chosen = window.miniappsAI.extractText(aiResponse).trim();
    let winningIndex = appState.wheelItems.indexOf(chosen);
    
    // Fallback if AI hallucinates casing or spaces
    if (winningIndex === -1) {
      winningIndex = appState.wheelItems.findIndex(i => chosen.toLowerCase().includes(i.toLowerCase()));
    }
    if (winningIndex === -1) {
      winningIndex = Math.floor(Math.random() * appState.wheelItems.length);
      chosen = appState.wheelItems[winningIndex];
    } else {
      chosen = appState.wheelItems[winningIndex]; // Ensure perfect match
    }
    
    animateWheelToIndex(winningIndex, chosen, true);
    
  } catch (e) {
    console.error('AI Error:', e);
    // Fallback to manual spin if AI fails
    const fallbackIndex = Math.floor(Math.random() * appState.wheelItems.length);
    animateWheelToIndex(fallbackIndex, appState.wheelItems[fallbackIndex], false);
  }
}

function animateWheelToIndex(index, resultText, isAI) {
  const sliceAngle = 360 / appState.wheelItems.length;
  const targetSliceStart = index * sliceAngle;
  // Offset inside the slice to not land perfectly on the line
  const randomOffsetInsideSlice = Math.random() * (sliceAngle - 10) + 5; 
  const targetPointerAngle = targetSliceStart + randomOffsetInsideSlice;
  
  let normalizedRotation = (270 - targetPointerAngle) % 360;
  if (normalizedRotation < 0) normalizedRotation += 360;
  
  const extraRotations = (Math.floor(Math.random() * 3) + 4) * 360; // 4-6 full spins
  
  const currentMod = wheelRotation % 360;
  let diff = normalizedRotation - currentMod;
  if (diff < 0) diff += 360;
  
  const totalRotation = wheelRotation + extraRotations + diff;
  
  elements.wheelCanvas.style.transform = `rotate(${totalRotation}deg)`;
  wheelRotation = totalRotation;
  
  setTimeout(async () => {
    if (isAI) {
      elements.wheelResult.innerHTML = `<span class="text-neonpurple drop-shadow-[0_0_8px_rgba(176,38,255,0.8)]">CRAIG SAYS:</span> ${resultText}`;
    } else {
      elements.wheelResult.innerHTML = `<span class="text-bloodred">RESULT:</span> ${resultText}`;
    }
    
    appState.spins.unshift({
      id: Date.now().toString(),
      user: appState.currentUser,
      result: resultText,
      isAI: isAI,
      timestamp: Date.now()
    });
    
    await saveSpins();
    showToast(isAI ? 'CRAIG Spin synced!' : 'Spin synced!', isAI ? '#b026ff' : '#C5001A');
    
    elements.aiSpinBtn.disabled = false;
    elements.manualSpinBtn.disabled = false;
  }, 4000);
}

// --- Dice Logic ---
async function rollDice() {
  elements.rollDiceBtn.disabled = true;
  elements.diceContainer.classList.add('dice-rolling');
  elements.diceResultContainer.classList.add('hidden');
  elements.diceTaskText.textContent = 'Connecting to Trainer CRAIG...';
  
  const interval = setInterval(() => {
    elements.diceContainer.textContent = Math.floor(Math.random() * 6) + 1;
  }, 100);

  setTimeout(async () => {
    clearInterval(interval);
    elements.diceContainer.classList.remove('dice-rolling');
    
    const result = Math.floor(Math.random() * 6) + 1;
    elements.diceContainer.textContent = result;
    elements.diceContainer.classList.add('dice-bounce');
    
    setTimeout(() => elements.diceContainer.classList.remove('dice-bounce'), 400);

    elements.diceNumberDisplay.textContent = result;
    elements.diceResultContainer.classList.remove('hidden');

    let task = "No task for this roll. Rest.";
    
    // Trainer tasks on 3, 5, 6
    if ([3, 5, 6].includes(result)) {
      elements.diceTaskText.innerHTML = '<span class="animate-pulse">Consulting CRAIG...</span>';
      try {
        const aiResponse = await window.miniappsAI.callModel({
          modelId: AI_MODEL_ID,
          messages: [
            { role: 'system', content: 'You are CRAIG, an intense, strict physical fitness trainer. The user triggered a special task. Respond with a VERY short, commanding physical training task. Max 10 words. No intro.' },
            { role: 'user', content: 'Give me a task!' }
          ]
        });
        task = window.miniappsAI.extractText(aiResponse).trim();
      } catch (e) {
        console.error('AI Error:', e);
        task = 'Drop and do 20 Burpees NOW!';
      }
    }
    
    elements.diceTaskText.textContent = task;
    
    appState.rolls.unshift({
      id: Date.now().toString(),
      user: appState.currentUser,
      result: result,
      task: task,
      timestamp: Date.now()
    });
    
    await saveRolls();
    showToast('Roll synced!', '#b026ff');
    
    elements.rollDiceBtn.disabled = false;
  }, 1500);
}

// --- Exposure Logic ---
function handleExposureUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = async function() {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      
      appState.exposures = appState.exposures.filter(exp => exp.user !== appState.currentUser);
      
      appState.exposures.unshift({
        id: Date.now().toString(),
        user: appState.currentUser,
        image_url: dataUrl,
        expires_at: Date.now() + 3600000, // 1 hour
        timestamp: Date.now()
      });
      
      await saveExposures();
      if (!useFirebase) renderExposures();
      
      showToast('Photo exposed & synced!', '#ffea00', 'text-black');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function renderExposures() {
  elements.exposureGallery.innerHTML = '';
  const now = Date.now();
  
  if (appState.exposures.length === 0) {
    elements.exposureGallery.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">No active exposures. Upload to start the feed.</p>';
    return;
  }
  
  appState.exposures.forEach(exp => {
    const timeLeft = exp.expires_at - now;
    if(timeLeft <= 0) return;
    
    const minutesLeft = Math.ceil(timeLeft / 60000);
    
    const div = document.createElement('div');
    div.className = 'bg-obsidian border border-warningyellow/30 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(255,234,0,0.1)] group relative flex flex-col p-2';
    
    div.innerHTML = `
      <div class="h-56 w-full bg-black relative cursor-zoom-in rounded border border-warningyellow/20 overflow-hidden" onclick="showFullscreenImage('${exp.image_url}')">
        <img src="${exp.image_url}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 scale-100 group-hover:scale-105">
        <div class="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-warningyellow border border-warningyellow/30">@${exp.user}</div>
        <div class="absolute top-2 right-2 bg-warningyellow/90 px-2 py-1 rounded text-xs font-bold text-black shadow-lg shadow-black/50">${minutesLeft}m left</div>
      </div>
      <div class="mt-2 flex justify-between items-center bg-darkgray/50 rounded px-3 py-2 border border-warningyellow/10">
        <span class="text-xs text-warningyellow/60 font-mono">${new Date(exp.timestamp).toLocaleTimeString()}</span>
        <div class="flex gap-2">
          ${appState.isAdmin ? `<button class="bg-bloodred/20 hover:bg-bloodred text-bloodred hover:text-white border border-bloodred/50 text-xs px-2 py-1.5 rounded transition-colors" onclick="deleteExposure('${exp.id}')">🗑️</button>` : ''}
          <button class="bg-warningyellow/10 hover:bg-warningyellow text-warningyellow hover:text-black border border-warningyellow/50 text-xs px-3 py-1.5 rounded transition-colors uppercase tracking-wider font-bold" onclick="boostExposure('${exp.id}')">+10 MINS</button>
        </div>
      </div>
    `;
    elements.exposureGallery.appendChild(div);
  });
}

window.boostExposure = async function(id) {
  const exp = appState.exposures.find(e => e.id === id);
  if (exp) {
    exp.expires_at += 600000; // +10 minutes
    await saveExposures();
    if (!useFirebase) renderExposures();
    showToast('Exposure extended!', '#ffea00', 'text-black');
  }
};

window.deleteExposure = async function(id) {
  if(!appState.isAdmin) return;
  appState.exposures = appState.exposures.filter(e => e.id !== id);
  await saveExposures();
  if (!useFirebase) renderExposures();
  showToast('Exposure deleted (Admin)', '#C5001A');
};

window.showFullscreenImage = function(url) {
  document.getElementById('fullscreen-image').src = url;
  document.getElementById('image-modal').classList.replace('hidden', 'flex');
};

// --- Trainer Logic ---
window.clearLogs = async function() {
  if(!appState.isAdmin) return;
  if(!confirm('Master, are you sure you want to clear all logs?')) return;
  
  appState.spins = [];
  appState.rolls = [];
  await saveSpins();
  await saveRolls();
  
  if (!useFirebase) renderTrainerBoard();
  showToast('Logs cleared.', '#C5001A');
};

function renderTrainerBoard() {
  // Render Spins
  elements.trainerSpinsList.innerHTML = '';
  if(appState.spins.length === 0) {
    elements.trainerSpinsList.innerHTML = '<p class="text-terminalcyan/40 text-sm">> No recent spin logs.</p>';
  } else {
    appState.spins.forEach(s => {
      const li = document.createElement('li');
      li.className = `bg-obsidian p-3 rounded border-l-2 ${s.isAI ? 'border-neonpurple' : 'border-terminalcyan'} flex justify-between items-center mb-2`;
      li.innerHTML = `
        <div class="flex flex-col">
          <span class="font-bold ${s.isAI ? 'text-neonpurple' : 'text-terminalcyan'} text-sm">USR: ${s.user} ${s.isAI ? '[AI]' : ''}</span>
          <span class="text-xs ${s.isAI ? 'text-neonpurple/50' : 'text-terminalcyan/50'}">[${new Date(s.timestamp).toLocaleTimeString()}]</span>
        </div>
        <span class="text-white font-bold break-words max-w-[50%] text-right">> ${s.result}</span>
      `;
      elements.trainerSpinsList.appendChild(li);
    });
  }

  // Render Rolls
  elements.trainerRollsList.innerHTML = '';
  if(appState.rolls.length === 0) {
    elements.trainerRollsList.innerHTML = '<p class="text-terminalcyan/40 text-sm">> No recent task logs.</p>';
  } else {
    appState.rolls.forEach(r => {
      const li = document.createElement('li');
      li.className = 'bg-obsidian p-3 rounded border-l-2 border-terminalcyan mb-3';
      const isTask = r.task !== 'No task for this roll. Rest.';
      li.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <div class="flex flex-col">
            <span class="font-bold text-terminalcyan text-sm">USR: ${r.user}</span>
            <span class="text-xs text-terminalcyan/50">[${new Date(r.timestamp).toLocaleTimeString()}]</span>
          </div>
          <span class="bg-darkgray border border-terminalcyan/50 text-terminalcyan w-8 h-8 flex items-center justify-center font-black rounded">${r.result}</span>
        </div>
        <div class="bg-darkgray p-2 rounded text-xs ${isTask ? 'text-white border border-terminalcyan/30' : 'text-terminalcyan/50'}">
          ${isTask ? '> EXEC: ' : ''}${r.task}
        </div>
      `;
      elements.trainerRollsList.appendChild(li);
    });
  }
}

