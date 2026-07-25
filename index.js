// ye video clock ke part 2 hai part 1 niche me hai 
window.addEventListener('load', () => {
    const clock = document.getElementById('digital-clock');
    console.log("Clock Element Found:", clock); 
    if(!clock) {
        alert("Error: digital-clock ID HTML me nahi mili!");
    }
});

// AAPKA CLOCK FUNCTION (Updated for absolute stability)
function updateClock() {
    const clockElement = document.getElementById('digital-clock');
    const dateElement = document.getElementById('date-text');

    if (!clockElement || !dateElement) return;

    const now = new Date();
    
    // Time Formatting
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    // Date Formatting
    const dateString = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
    });

    clockElement.innerText = timeString;
    dateElement.innerText = dateString;
}

// Interval
setInterval(updateClock, 1000);
updateClock();




//              ..............................////////////
    


    if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('Digital Saathi PWA Registered!'));
}



// 1. REAL-TIME FIREBASE SYNC
db.collection('data').doc('matrix_config').onSnapshot((doc) => {
    if (doc.exists) {
        renderUI(doc.data());
    }
});

// 2. RENDER LOGIC
function renderUI(config) {
    const sidebarMenu = document.getElementById('masterLiveSidebarMenu');
    const gridContainer = document.getElementById('toolsDisplayGrid');
    const noticeBoard = document.getElementById('liveNoticeBoardHeadlineText');
    const noResults = document.getElementById('noResultsMessage');

    if (!sidebarMenu) return;

    sidebarMenu.innerHTML = '';
    gridContainer.innerHTML = '';
    if (noResults) gridContainer.appendChild(noResults); 
    
    if (noticeBoard && config.notice) noticeBoard.innerText = config.notice;

    const applyColor = (color) => color || "#4f46e5";

    // --- 1. RENDER FOLDERS AND SIDE-LINKS ---
    if (config.folders) {
        config.folders.forEach((mainFolder, fIdx) => {
            const safeFolderName = mainFolder.name.replace(/\s+/g, '');
            const folderColor = applyColor(mainFolder.color);
            
            const li = document.createElement('li');
            li.className = `menu-item ${fIdx === 0 ? 'open' : ''}`;
            li.innerHTML = `
                <div class="menu-link">
                    <div class="menu-link-content">
                        <i class="${mainFolder.icon}" style="color: ${folderColor};"></i> 
                        <span>${mainFolder.name}</span>
                    </div>
                    <i class="fas fa-chevron-down chevron-icon"></i>
                </div>
                <div class="submenu-container" id="container-${safeFolderName}"></div>
            `;
            sidebarMenu.appendChild(li);

            const subContainer = document.getElementById(`container-${safeFolderName}`);
            if (config.subs) {
                config.subs.filter(s => s.parent === mainFolder.name).forEach(subPortal => {
                    const subId = `subPortal-${subPortal.name.replace(/\s+/g, '')}`;
                    const subColor = applyColor(subPortal.color);
                    
                    const subDiv = document.createElement('div');
                    subDiv.className = "submenu-link-toggle";
                    subDiv.setAttribute('data-target', subId);
                    subDiv.setAttribute('data-filter', subPortal.name.toLowerCase());
                    subDiv.innerHTML = `
                        <span class="menu-link-content">
                            <i class="${subPortal.icon}" style="color: ${subColor};"></i> ${subPortal.name}
                        </span>
                        <i class="fas fa-chevron-down nested-chevron"></i>
                    `;
                    subContainer.appendChild(subDiv);

                    const nestedContainer = document.createElement('div');
                    nestedContainer.className = "nested-submenu-container";
                    nestedContainer.id = subId;

                    if (config.sideLinks) {
                        config.sideLinks.filter(l => l.sub?.toLowerCase().trim() === subPortal.name.toLowerCase().trim()).forEach(dl => {
                            const dlAnchor = document.createElement('a');
                            dlAnchor.href = dl.url || '#';
                            dlAnchor.target = "_blank";
                            dlAnchor.className = "nested-submenu-link";
                            const dlColor = applyColor(dl.color);
                            dlAnchor.innerHTML = `<i class="${dl.icon}" style="color: ${dlColor};"></i> ${dl.label || dl.title}`;
                            nestedContainer.appendChild(dlAnchor);
                        });
                    }
                    subContainer.appendChild(nestedContainer);
                });
            }
        });
    }
// --- 2. RENDER CARDS (Dashboard) ---
    if (config.cards) {
        config.cards.forEach(card => {
            console.log("Card Data Check:", card);
            
            // Image logic
            const displayImage = card.imageUrl && card.imageUrl.trim() !== "" ? card.imageUrl : "default-icon.png";
            
            const anchor = document.createElement('div'); 
            anchor.className = `service-card-block tool-card-item`;
            anchor.setAttribute('data-sub', card.sub?.toLowerCase() || '');
            anchor.setAttribute('data-name', (card.title || card.name || '').toLowerCase());
            anchor.style.cursor = "pointer";
            
            anchor.style.setProperty('--card-accent', card.color || '#4f46e5');
            anchor.style.setProperty('--card-glow', (card.color || '#4f46e5') + '40');

            // SUPER CHECK: Popup kholne ka logic + Recent Portal Tracking
            if (card.links && Array.isArray(card.links) && card.links.length > 0) {
                anchor.onclick = () => {
                    addRecentPortal(card); // Recent list mein add karega
                    openServicePopup(card);
                };
            } else {
                anchor.onclick = () => {
                    addRecentPortal(card); // Recent list mein add karega
                    window.open(card.url || '#', '_blank');
                };
            }
            
            // Card HTML
            anchor.innerHTML = `
                <div class="square-icon-box" style="background-color: ${card.color || '#4f46e5'};">
                    <i class="${card.icon || 'fas fa-link'}"></i>
                </div>
                <div class="service-meta-text">
                    <h4>${card.title || card.name || 'Untitled'}</h4>
                    <p>${card.desc || card.description || ''}</p>
                </div>
            `;
            
            gridContainer.appendChild(anchor);
        }); 
    }
} // <--- Yahan renderUI function close hua jo pehle missing tha

// 3. SINGLE MASTER EVENT LISTENER (Filter + UI Toggle)
document.getElementById('masterLiveSidebarMenu').addEventListener('click', function(e) {
    const allCards = document.querySelectorAll('.tool-card-item');
    const noResults = document.getElementById('noResultsMessage');
    const breadCrumb = document.getElementById('breadCrumbStatus');
    const sectionTitle = document.getElementById('gridSectionTitle');

    // 1. FOLDER CLICK: Reset UI (Show All)
    const menuLink = e.target.closest('.menu-link');
    if (menuLink) {
        // Sidebar UI toggle
        menuLink.parentElement.classList.toggle('open');
        
        // Sabhi cards dikhayein
        allCards.forEach(c => {
            c.style.display = "flex"; // Reset display
            c.classList.remove('card-hidden');
            c.classList.add('card-visible');
        });
        
        // Reset Breadcrumb and Title
        if (breadCrumb) breadCrumb.innerText = "Dashboard";
        if (sectionTitle) sectionTitle.innerText = "Sarkari Portals & Recruitment Desks";
        if (noResults) noResults.style.display = "none";
        return;
    }

    // 2. SUB-FOLDER CLICK: Filter Logic
    const subToggle = e.target.closest('.submenu-link-toggle');
    if (subToggle) {
        e.stopPropagation(); // Parent tak click na jaye
        
        const filterVal = subToggle.getAttribute('data-filter').toLowerCase().trim();
        const subName = subToggle.innerText.trim(); // Sub-folder ka naam nikala
        
        // UI Toggle (Active state)
        subToggle.classList.toggle('active-toggle-item');
        const nestedMenu = document.getElementById(subToggle.getAttribute('data-target'));
        if (nestedMenu) nestedMenu.classList.toggle('nested-open');

        // Update Breadcrumb and Title Dynamically
        if (breadCrumb) breadCrumb.innerText = subName;
        if (sectionTitle) sectionTitle.innerText = subName;

        // Filter Execution
        let matchCount = 0;
        allCards.forEach(c => {
            const cardSub = c.getAttribute('data-sub').toLowerCase().trim();
            
            if (cardSub === filterVal) {
                c.style.display = "flex"; // Match hone par dikhayein
                c.classList.remove('card-hidden');
                c.classList.add('card-visible');
                matchCount++;
            } else {
                c.style.display = "none"; // Match na hone par chupayein
                c.classList.remove('card-visible');
                c.classList.add('card-hidden');
            }
        });

        // Agar result zero hai toh "No results" dikhayein
        if (noResults) noResults.style.display = (matchCount === 0) ? "block" : "none";
    }
});

// 1. CLOCK LOGIC
setInterval(() => {
    const clock = document.getElementById('liveMatrixClock');
    if (clock) {
        clock.innerText = new Date().toLocaleTimeString('en-IN', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
        });
    }
}, 1000);





function toggleFabMenu() {
    const menu = document.getElementById('fabMenu');
    menu.classList.toggle('active');
    
    // Button rotate animation
    const btn = document.querySelector('.fab-main i');
    btn.style.transform = menu.classList.contains('active') ? 'rotate(45deg)' : 'rotate(0deg)';
    btn.style.transition = '0.3s';
}

// Function ko call karte waqt 'card' object pura pass karein
function openServicePopup(card) {
    const modal = document.getElementById('reusableModal');
    const container = document.getElementById('popupLinks');
    const titleElement = document.getElementById('popupTitle');

    if (titleElement) titleElement.innerText = card.title || "Untitled Service"; 
    container.innerHTML = ''; 

    if (card.links && card.links.length > 0) {
        card.links.forEach(link => {
            const displayImage = card.imageUrl && card.imageUrl.trim() !== "" ? card.imageUrl : "default-icon.png";
            
            container.innerHTML += `
                <div class="premium-link-card">
                    <div class="card-img-wrapper">
                        <img src="${displayImage}" alt="${link.title}" class="card-img">
                    </div>
                    <div class="card-content">
                        <p class="card-desc">${link.desc || 'Explore this service'}</p>
                    </div>
                    <!-- Yahan simple link use karein, onclick ki zaroorat nahi -->
                    <a href="${link.url}" target="_blank" class="btn-update">
                       ${link.title}
                    </a>
                </div>
            `;
        });
    } else {
        container.innerHTML = '<p class="no-data">No services available.</p>';
    }

    // Popup khulte hi sidebar aur main-content par blur class add hogi (popup par nahi)
    document.querySelector('.sidebar')?.classList.add('blurred');
    document.querySelector('.main-content')?.classList.add('blurred');

    modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Close Button ko select karein
    const closeBtn = document.getElementById('closeModalBtn');
    const modal = document.getElementById('reusableModal');

    // 2. Button click hone par modal hide karein
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            // Modal band hone par blur hata diya jayega
            document.querySelector('.sidebar')?.classList.remove('blurred');
            document.querySelector('.main-content')?.classList.remove('blurred');
        });
    }
});

// Toggle Floating Menu
function toggleSupremeFab(event) {
    if (event) event.stopPropagation();
    const wrapper = document.getElementById('supremeFabWrapper');
    wrapper.classList.toggle('active');
}

// Close Floating Menu
function closeSupremeFab() {
    const wrapper = document.getElementById('supremeFabWrapper');
    if (wrapper) wrapper.classList.remove('active');
}

// Auto-close when clicking anywhere outside the FAB wrapper
window.addEventListener('click', function(e) {
    const wrapper = document.getElementById('supremeFabWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        wrapper.classList.remove('active');
    }
});

// Modal Control Functions
function openSupremeHubModal() {
    document.getElementById('supremeHubModal').style.display = 'flex';
}

function closeSupremeHubModal() {
    document.getElementById('supremeHubModal').style.display = 'none';
}

// Tab Switching Logic
function switchHubTab(evt, tabId) {
    let panes = document.getElementsByClassName('hub-tab-pane');
    for (let pane of panes) { pane.classList.remove('active'); }

    let buttons = document.getElementsByClassName('hub-tab-btn');
    for (let btn of buttons) { btn.classList.remove('active'); }

    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// 1. Age Calculator Logic
function calculateHubAge() {
    const val = document.getElementById('hubDobInput').value;
    const res = document.getElementById('hubAgeResult');
    if (!val) { res.style.display='block'; res.innerHTML='Kripya Date of Birth chunein!'; return; }

    const dob = new Date(val);
    const today = new Date();
    if (dob > today) { res.style.display='block'; res.innerHTML='Future date select nahi ho sakti!'; return; }

    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
        months--;
        let pMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += pMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    let status = years < 18 ? '<span style="color:#fbbf24; font-weight:700;">Minor (Under 18)</span>' : '<span style="color:#34d399; font-weight:700;">Adult (18+)</span>';

    res.style.display = 'block';
    res.innerHTML = `🎂 <b>${years} Years, ${months} Months, ${days} Days</b><br>Status: ${status}`;
}

// 2. Marks to Percentage Logic
function calculateHubMarks() {
    let obt = parseFloat(document.getElementById('hubObtained').value);
    let tot = parseFloat(document.getElementById('hubTotal').value);
    let res = document.getElementById('hubMarksResult');

    if (isNaN(obt) || isNaN(tot) || tot <= 0) {
        res.style.display='block'; res.innerHTML='Kripya sahi ank darj karein!'; return;
    }
    let p = (obt / tot) * 100;
    res.style.display='block';
    res.innerHTML = `📊 Percentage: <b>${p.toFixed(2)}%</b>`;
}

// 3. Percentage to CGPA Logic
function calculateHubPerToCgpa() {
    let per = parseFloat(document.getElementById('hubPerInput').value);
    let res = document.getElementById('hubPerToCgpaResult');

    if (isNaN(per) || per < 0 || per > 100) {
        res.style.display='block'; res.innerHTML='Sahi percentage dalein (0-100)!'; return;
    }
    let cgpa = per / 9.5;
    res.style.display='block';
    res.innerHTML = `🎓 Estimated CGPA: <b>${cgpa.toFixed(2)}</b>`;
}

// 4. CGPA to Percentage Logic
function calculateHubCgpaToPer() {
    let cgpa = parseFloat(document.getElementById('hubCgpaInput').value);
    let res = document.getElementById('hubCgpaToPerResult');

    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        res.style.display='block'; res.innerHTML='Sahi CGPA dalein (0-10)!'; return;
    }
    let per = (cgpa - 0.75) * 10;
    res.style.display='block';
    res.innerHTML = `📈 Percentage: <b>${per.toFixed(2)}%</b>`;
}

// 5. Calculator Logic
function hubAppend(val) { document.getElementById('hubCalcScreen').value += val; }
function hubClear() { document.getElementById('hubCalcScreen').value = ''; }
function hubCalculate() {
    let scr = document.getElementById('hubCalcScreen');
    try { scr.value = eval(scr.value); } catch(e) { scr.value = 'Error'; setTimeout(hubClear, 1200); }
}

function closeModal() { document.getElementById('calcModal').style.display = 'none'; }

function togglePremiumDropdown(id, event) {
    event.stopPropagation(); // Click event ko bubble hone se roke
    const dropdown = document.getElementById(id);
    dropdown.classList.toggle('show');
}

// Bahaar click karne par dropdown band ho jaye
window.onclick = function(event) {
    if (!event.target.matches('.dropdown-trigger')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.remove('show');
        }
    }
}

// Sidebar ke bahar click karne par close ho jaye
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.menu-toggler');
    
    if (sidebar && menuBtn) {
        if (!sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
            sidebar.classList.remove('active');
        }
    }
});

const menuToggler = document.querySelector('.menu-toggler');
if (menuToggler) {
    menuToggler.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.add('active');
    });
}

const sidebarCloseBtn = document.querySelector('.sidebar-close-btn');
if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.remove('active');
    });
}

// 1. DESKTOP REFRESH (Ctrl + F)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault(); 
        window.location.reload();
    }
});

// 2. MOBILE PREMIUM PULL-TO-REFRESH
let touchStartY = 0;
const threshold = 150; 
const ptrIndicator = document.getElementById('ptr-indicator');

window.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
    }
});

window.addEventListener('touchend', (e) => {
    if (window.scrollY === 0) {
        let touchEndY = e.changedTouches[0].clientY;
        let diff = touchEndY - touchStartY;

        if (diff > threshold) {
            if (ptrIndicator) {
                ptrIndicator.style.transform = 'translateY(100px)'; 
                ptrIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
            }
            
            setTimeout(() => {
                window.location.reload();
            }, 800);
        }
    }
});

// Theme Function
function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('selectedTheme', themeName); 
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
    setTheme(savedTheme);
});

// Screen width check
function checkDeviceAndRedirect() {
    var screenWidth = window.innerWidth;
    if (screenWidth <= 768) {
        if (window.location.pathname.indexOf('mobile.html') === -1) {
            window.location.href = 'mobile.html';
        }
    } else {
        if (window.location.pathname.indexOf('index.html') === -1 && window.location.pathname.endsWith('.html')) {
            window.location.href = 'index.html';
        }
    }
}


// ==========================================
// 2. RECENT USED PORTALS LOGIC (LocalStorage)
// ==========================================
const RECENT_STORAGE_KEY = 'digital_saathi_recent_portals';
const MAX_RECENT_ITEMS = 6;

function getRecentPortals() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function addRecentPortal(cardData) {
    let recent = getRecentPortals();
    
    recent = recent.filter(item => (item.title || item.name) !== (cardData.title || cardData.name));
    
    recent.unshift({
        title: cardData.title || cardData.name,
        desc: cardData.desc || cardData.description || '',
        icon: cardData.icon || 'fas fa-link',
        color: cardData.color || '#4f46e5',
        url: cardData.url || '#',
        links: cardData.links || []
    });
    
    if (recent.length > MAX_RECENT_ITEMS) {
        recent = recent.slice(0, MAX_RECENT_ITEMS);
    }
    
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent));
    renderRecentPortals();
}

function renderRecentPortals() {
    const wrapper = document.getElementById('recentSectionWrapper');
    const grid = document.getElementById('recentPortalsGrid');
    if (!wrapper || !grid) return;

    const recent = getRecentPortals();
    if (recent.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    wrapper.style.display = 'block';
    grid.innerHTML = '';

    recent.forEach(card => {
        const anchor = document.createElement('div');
        anchor.className = `service-card-block`;
        anchor.style.cursor = "pointer";
        anchor.style.setProperty('--card-accent', card.color || '#10b981');
        anchor.style.setProperty('--card-glow', (card.color || '#10b981') + '40');

        if (card.links && Array.isArray(card.links) && card.links.length > 0) {
            anchor.onclick = () => {
                addRecentPortal(card);
                openServicePopup(card);
            };
        } else {
            anchor.onclick = () => {
                addRecentPortal(card);
                window.open(card.url || '#', '_blank');
            };
        }

        anchor.innerHTML = `
            <div class="square-icon-box" style="background-color: ${card.color || '#10b981'};">
                <i class="${card.icon}"></i>
            </div>
            <div class="service-meta-text">
                <h4>${card.title}</h4>
                <p>${card.desc}</p>
            </div>
        `;
        grid.appendChild(anchor);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderRecentPortals();
});

// ==========================================
// 9. LOUD & CRISP FUTURISTIC CLICK SOUND ENGINE
// ==========================================
let audioCtx = null;

function playClickSound() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        // Triangle wave use kiya hai jo sine wave se thoda zyada rich aur loud lagta hai
        osc.type = 'triangle';
        
        // High-tech energetic laser pop frequency drop
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);
        
        // Volume (Gain) ko badha diya hai taaki ab ye kaafi accha aur tez (loud) sunai de
        gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
        // Fallback block
    }
}

document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('a, button, .service-card-block, .tab-item, .hub-tab-btn, .h-btn, .submenu-link-toggle');
    if (target) {
        playClickSound();
    }
});

// ==========================================
// BLOCK 1: CTRL + K COMMAND PALETTE LOGIC
// ==========================================
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
    }
    if (e.key === 'Escape') {
        closeCommandPalette();
    }
});

function openCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    const input = document.getElementById('cmdSearchInput');
    if (modal && input) {
        modal.style.display = 'flex';
        input.value = '';
        input.focus();
        renderCmdResults('');
    }
}

function closeCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    if (modal) modal.style.display = 'none';
}

document.getElementById('cmdSearchInput')?.addEventListener('input', function() {
    renderCmdResults(this.value.toLowerCase().trim());
});

function renderCmdResults(query) {
    const list = document.getElementById('cmdResultsList');
    if (!list) return;
    list.innerHTML = '';

    const allCards = document.querySelectorAll('.tool-card-item');
    let matches = [];

    allCards.forEach(card => {
        const title = card.querySelector('h4')?.innerText || '';
        const desc = card.querySelector('p')?.innerText || '';
        const iconClass = card.querySelector('.square-icon-box i')?.className || 'fas fa-link';
        
        if (query === '' || title.toLowerCase().includes(query) || desc.toLowerCase().includes(query)) {
            matches.push({ title, desc, icon: iconClass, element: card });
        }
    });

    if (matches.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 13px;">No matching portals found!</div>';
        return;
    }

    matches.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `cmd-result-item ${index === 0 ? 'selected' : ''}`;
        div.innerHTML = `
            <i class="${item.icon}"></i>
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight: 600; font-size: 13px;">${item.title}</span>
                <span style="font-size: 11px; color: #64748b;">${item.desc}</span>
            </div>
        `;
        div.onclick = () => {
            closeCommandPalette();
            item.element.click();
        };
        list.appendChild(div);
    });
}

document.getElementById('commandPaletteModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'commandPaletteModal') {
        closeCommandPalette();
    }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let activeRecognition = null; // Global instance track karne ke liye

function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        alert("Aapka browser Voice Search support nahi karta. Kripya Google Chrome use karein.");
        return;
    }

    const micBtn = document.getElementById('micSearchBtn');
    const searchInput = document.getElementById('toolSearchField');

    // Agar mic pehle se chal raha hai, toh dubara click karne par ise rok (stop) do
    if (activeRecognition) {
        activeRecognition.stop();
        resetVoiceState();
        return;
    }

    const recognition = new SpeechRecognition();
    activeRecognition = recognition;
    
   recognition.lang = 'en-IN'; // Roman script / Hinglish ke liye English (India) set karein
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        if(micBtn) micBtn.classList.add('listening');
        if(searchInput) searchInput.placeholder = "Listening... boliye kya search karein?";
    };

    recognition.onresult = function(event) {
        const speechResult = event.results[0][0].transcript;
        if(searchInput) {
            searchInput.value = speechResult;
            searchInput.dispatchEvent(new Event('input')); // Live search filter trigger karega
        }
    };

    recognition.onerror = function(event) {
        console.error("Mic Error: ", event.error);
        resetVoiceState();
    };

    recognition.onend = function() {
        resetVoiceState();
    };

    try {
        recognition.start();
    } catch (error) {
        console.error("Mic start error", error);
        resetVoiceState();
    }
}

function resetVoiceState() {
    activeRecognition = null;
    const micBtn = document.getElementById('micSearchBtn');
    const searchInput = document.getElementById('toolSearchField');
    if(micBtn) micBtn.classList.remove('listening');
    if(searchInput) searchInput.placeholder = "Search portals by name...";
}



///////////////////////////////////
document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.getElementById('toolSearchField');
    const recentBar = document.getElementById('recentSectionWrapper'); 

    if (searchInput && recentBar) {
        
        // 1. Jab search box par click (focus) ho
        searchInput.addEventListener('focus', function() {
            recentBar.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
            recentBar.style.opacity = '0';
            recentBar.style.visibility = 'hidden';
            setTimeout(() => {
                if (document.activeElement === searchInput) {
                    recentBar.style.display = 'none';
                }
            }, 300);
        });

        // 2. Jab search box se focus hate (blur)
        searchInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (document.activeElement !== searchInput && this.value.trim() === '') {
                    recentBar.style.display = 'block';
                    setTimeout(() => {
                        recentBar.style.opacity = '1';
                        recentBar.style.visibility = 'visible';
                    }, 10);
                }
            }, 200);
        });

        // 3. Jab user kuch type kare
        searchInput.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                recentBar.style.display = 'none';
                recentBar.style.opacity = '0';
                recentBar.style.visibility = 'hidden';
            } else {
                recentBar.style.display = 'block';
                recentBar.style.opacity = '1';
                recentBar.style.visibility = 'visible';
            }
        });
    }
});


///////////////////////////////////////////////////////////
// Smart Search Filtering with Fuzzy Matching & Exact Priority
document.getElementById('toolSearchField')?.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    const allCards = document.querySelectorAll('.tool-card-item'); // Apne card ki class yahan check kar lein
    const recentBar = document.getElementById('recentSectionWrapper');

    // Recent bar hide/show handle karein input ke mutabiq
    if (recentBar) {
        if (query !== '') {
            recentBar.style.display = 'none';
            recentBar.style.opacity = '0';
            recentBar.style.visibility = 'hidden';
        } else {
            recentBar.style.display = 'block';
            recentBar.style.opacity = '1';
            recentBar.style.visibility = 'visible';
        }
    }

    if (query === '') {
        allCards.forEach(card => card.style.display = '');
        return;
    }

    // Query ko words mein tod lein (jaise "e kyc" ko ["e", "kyc"])
    const queryWords = query.split(/\s+/);

    allCards.forEach(card => {
        const title = card.querySelector('h4')?.innerText.toLowerCase() || '';
        const desc = card.querySelector('p')?.innerText.toLowerCase() || '';
        const cardText = title + ' ' + desc;

        let matchScore = 0;

        // 1. Agar exact query match ho jaye toh highest score do
        if (cardText.includes(query)) {
            matchScore += 10;
        }

        // 2. Fuzzy / Partial match check (agar spelling thodi galat ya aage-piche ho)
        let matchedWordsCount = 0;
        queryWords.forEach(word => {
            if (word.length > 1) {
                // Check karein ki word ka koi sa hissa title ya description mein milta hai kya
                if (cardText.includes(word)) {
                    matchedWordsCount++;
                } else {
                    // Agar spelling mein 1-2 letter ka fark ho (simple character matching)
                    let fuzzyMatched = false;
                    for (let i = 0; i < title.length - word.length + 1; i++) {
                        let subStr = title.substring(i, i + word.length);
                        let diff = 0;
                        for(let c = 0; c < word.length; c++) {
                            if(subStr[c] !== word[c]) diff++;
                        }
                        if(diff <= 1) { // Agar sirf 1 letter ka error/fark hai
                            fuzzyMatched = true;
                            break;
                        }
                    }
                    if(fuzzyMatched) matchedWordsCount++;
                }
            }
        });

        if (matchedWordsCount > 0 || matchScore > 0) {
            card.style.display = ''; // Show card
        } else {
            card.style.display = 'none'; // Hide card
        }
    });
});

// 3. ENTER KEY - BLUR (Bahar nikalne ke liye aur recent bar restore karne ke liye)
const searchInputField = document.getElementById('toolSearchField');
searchInputField?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        this.blur(); // Cursor search box se bahar aa jayega
    }
});

// Blur event par agar input khali ho toh recent bar wapas dikhe
searchInputField?.addEventListener('blur', function() {
    const recentBar = document.getElementById('recentSectionWrapper');
    if (recentBar && this.value.trim() === '') {
        recentBar.style.display = 'block';
        setTimeout(() => {
            recentBar.style.opacity = '1';
            recentBar.style.visibility = 'visible';
        }, 10);
    }
});

function resetSearch() {
    const input = document.getElementById('toolSearchField');
    input.value = ''; // Input box khali karein
    input.dispatchEvent(new Event('input')); // Event trigger karein taaki cards aur recent bar wapas aa jayein
}
