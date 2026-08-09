// 1. GLOBAL STATE
    let appData = { folders: [], subs: [], sideLinks: [], cards: [], notice: "", secure_hash: "81dc9bdb52d04dc20036dbd8313ed055" };
    let dataViewActiveTab = 'cards';

    // 2. INITIALIZATION
window.onload = async () => {
    try {
        const docRef = db.collection("data").doc("matrix_config");
        const doc = await docRef.get();
        if (doc.exists) {
            appData = doc.data();
            console.log("Data loaded successfully:", appData);
        }
    } catch (e) {
        console.error("Firebase connection error:", e);
    }
    
    // अब सभी फंक्शन्स को क्रम में कॉल करें
    runDatabaseStateSynchronization();
    
    // ये दो फंक्शन UI एलिमेंट्स (Pickers) को पहले ही लोड कर लेंगे
    compileVisualUISelectionPickers();
    compileColorSelectionPickers();
};

function runDatabaseStateSynchronization() {
    console.log("Syncing Data...");

    // 1. मेन फोल्डर ड्रॉपडाउन अपडेट करें
    const folderSelectors = [
        document.getElementById('subPortalParentSelect'),
        document.getElementById('sideLinkParentSelect'),
        document.getElementById('cardMainFolderContextSelector')
    ];

    if (appData.folders && appData.folders.length > 0) {
        const folderOptions = appData.folders.map(f => `<option value="${f.name}">${f.name}</option>`).join('');
        folderSelectors.forEach(select => {
            if (select) {
                const currentVal = select.value;
                select.innerHTML = '<option value="">Select Folder</option>' + folderOptions;
                select.value = currentVal;
            }
        });
    }

    // 2. साइड-लिंक सब-पोर्टल को सुरक्षित तरीके से इनिशियलाइज़ करें
    const sideLinkSubSelect = document.getElementById('sideLinkSubSelect');
    if (sideLinkSubSelect) {
        // यदि फंक्शन मौजूद है, तो उसे चलाएं
        if (typeof updateSubDropdownForSideLinks === 'function') {
            updateSubDropdownForSideLinks();
        }
    }

    // 3. कार्ड्स वाले सब-पोर्टल ड्रॉपडाउन (सिर्फ 'cards' के लिए सभी उपलब्ध सब-पोर्टल दिखाएं)
    const cardSubSelect = document.getElementById('cardSubPortalContextSelector');
    if (cardSubSelect && appData.subs) {
        const currentVal = cardSubSelect.value;
        const subOptions = appData.subs.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        cardSubSelect.innerHTML = '<option value="">Select Sub-Portal</option>' + subOptions;
        cardSubSelect.value = currentVal;
    }

    // 4. टेबल रेंडर करें (अगर फंक्शन मौजूद है)
    if (typeof renderDynamicManagementViewGrid === 'function') {
        renderDynamicManagementViewGrid();
    }

    // 5. UI Pickers initialize करें
    if (typeof compileVisualUISelectionPickers === 'function') compileVisualUISelectionPickers();
    if (typeof compileColorSelectionPickers === 'function') compileColorSelectionPickers();

    console.log("Sync Complete!");
}


function renderDynamicManagementViewGrid() {
    const body = document.getElementById('renderTableRowsContentBody');
    const head = document.getElementById('renderTableColumnsHead');
    if (!body) return;
    
    body.innerHTML = ''; 
    const tabMap = { 'cards': 'cards', 'sideLinks': 'sideLinks', 'subPortals': 'subs', 'mainFolders': 'folders' };
    const key = tabMap[dataViewActiveTab];
    const items = appData[key] || [];

    // हेडर अपडेट करें
    if (head) {
        head.innerHTML = `<tr>
            <th style="width: 60px;">Icon</th>
            <th>Name</th>
            <th>Main Folder</th>
            <th>Sub-Portal</th>
            <th style="text-align: right;">Actions</th>
        </tr>`;
    }

    if (items.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No data found in ${dataViewActiveTab}</td></tr>`;
        return;
    }

    items.forEach((item, idx) => {
        const displayName = item.label || item.name || item.title || "Unnamed";
        const iconClass = item.icon || "fas fa-link";
        const colorVal = item.color || "#6366f1";
        
        // फिक्स्ड डेटा मैपिंग:
        // Main Folder हमेशा 'folder' या 'parent' से आएगा
        const mainFolder = item.folder || item.parent || "-";
        
        // Sub-Portal हमेशा 'sub' से आएगा (चाहे वो Card हो या Side-Link)
        const subPortal = item.sub || "-"; 

        body.innerHTML += `
        <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
            <td style="padding: 15px;">
                <div style="background:${colorVal}; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:white;">
                    <i class="${iconClass}"></i>
                </div>
            </td>
            <td><strong>${displayName}</strong></td>
            <td><span class="badge">${mainFolder}</span></td>
            <td><span class="badge">${subPortal}</span></td>
            <td style="text-align: right; padding-right: 15px;">
                <div class="action-container-box">
                    <button class="row-btn row-btn-sort" onclick="moveItem('${key}', 'up', ${idx})"><i class="fas fa-chevron-up"></i></button>
                    <button class="row-btn row-btn-sort" onclick="moveItem('${key}', 'down', ${idx})"><i class="fas fa-chevron-down"></i></button>
                    <button class="row-btn row-btn-edit" onclick="setupEditMode('${key}', ${idx})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="row-btn row-btn-delete" onclick="purgeEntry('${key}', ${idx})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>`;
    });
}
    // 4. DATA SUBMISSION LOGIC (FIXED)
 // उदाहरण: executeMainFolderAddition के लिए
async function executeMainFolderAddition() {
    // 1. Validation check (Sirf 'mainFolderNameInput' check karega)
    // Agar user ne edit mode mein bhi naam delete kar diya, toh yeh error dikha dega
    if (!validateFormFields(['mainFolderNameInput'])) {
        console.log("Validation Failed: Empty field detected.");
        return; 
    }

    // 2. UI se values uthayein
    const name = document.getElementById('mainFolderNameInput').value;
    const editIndex = parseInt(document.getElementById('mainFolderEditIndex').value);
    
    // Icon aur Color safe extraction
    const iconElem = document.querySelector('#mainFolderIconTriggerLabel i');
    const colorElem = document.querySelector('#mainFolderColorTriggerLabel .circular-glow-dot');
    
    const icon = iconElem ? iconElem.className : "fas fa-folder";
    const color = colorElem ? colorElem.style.backgroundColor : "#FF78AC";

    // 3. Update ya Create Logic
    if (editIndex !== -1) {
        // --- UPDATE MODE ---
        appData.folders[editIndex] = { name: name, icon: icon, color: color };
        alert("Folder Updated!");
        
        // Buttons reset karein
        document.getElementById('mainFolderSubmitBtn').innerHTML = '<i class="fas fa-folder-plus"></i> Create Folder';
        document.getElementById('mainFolderEditIndex').value = "-1";
        document.getElementById('mainFolderCancelBtn').style.display = "none";
    } else {
        // --- CREATE MODE ---
        appData.folders.push({ name: name, icon: icon, color: color });
        
    }

    // 4. Cleanup
    document.getElementById('mainFolderNameInput').value = ""; 
    document.getElementById('mainFolderIconTriggerLabel').innerHTML = '<i class="fas fa-folder"></i> Select Icon'; // Reset Icon UI
    
    await syncData('folders');
}

// --- SUB-PORTAL SUBMISSION ---
async function executeSubPortalAddition() {
    if (!validateFormFields(['subPortalParentSelect', 'subPortalNameInput'])) return;
    const editIndex = parseInt(document.getElementById('subPortalEditIndex').value);
    const icon = document.querySelector('#subPortalIconTriggerLabel i')?.className || "fas fa-folder-open";
    const color = document.querySelector('#subPortalColorTriggerLabel .circular-glow-dot')?.style.backgroundColor || "#FF78AC";
    
    const data = { 
        parent: document.getElementById('subPortalParentSelect').value,
        name: document.getElementById('subPortalNameInput').value,
        icon: icon, 
        color: color 
    };
    if (!data.name) return alert("Name Required");

    if (editIndex !== -1) {
        appData.subs[editIndex] = data; 
    } else {
        appData.subs.push(data);
    }
    await syncData('subs');
    resetSubPortalForm();
}


async function processCardPanelFormSubmission() {
    // 1. Validation: Standard Fields check karein
    const requiredFields = ['cardMainFolderContextSelector', 'cardSubPortalContextSelector', 'cardTitleHeaderInput', 'cardUrlPathInput'];
    if (!validateFormFields(requiredFields)) return;

    // 2. Dynamic Links Data Collect Karein (New Feature)
    const linksData = [];
    document.querySelectorAll('.link-group').forEach(group => {
        const title = group.querySelector('.link-title').value;
        const desc = group.querySelector('.link-desc').value;
        const url = group.querySelector('.link-url').value;
        if(title && url) {
            linksData.push({ title: title, desc: desc, url: url });
        }
    });

    // 3. UI se Icon aur Color extract karein
    const iconLabel = document.getElementById('workspaceCardIconTriggerLabel');
    const colorLabel = document.getElementById('workspaceCardColorTriggerLabel');
    const icon = iconLabel?.querySelector('i')?.className || "fas fa-link";
    const color = colorLabel?.querySelector('.circular-glow-dot')?.style.backgroundColor || "#FF78AC";

    // 4. Data Object taiyaar karein (Yahan 'links' add ho gaya hai)
// 4. Data Object taiyaar karein
// Final data object
    const data = {
        folder: document.getElementById('cardMainFolderContextSelector').value,
        sub: document.getElementById('cardSubPortalContextSelector').value,
        title: document.getElementById('cardTitleHeaderInput').value,
        url: document.getElementById('cardUrlPathInput').value,
        desc: document.getElementById('cardDescriptionTextSummaryInput').value,
        icon: icon,
        color: color,
        links: linksData,
        imageUrl: document.getElementById('cardImageUrlInput').value // Sahi se save hoga
    };

    // 5. Firebase Sync (Master Logic)
    try {
        const editIndex = parseInt(document.getElementById('cardEditModeTrackerId')?.value || -1);
        
        if (editIndex !== -1) {
            // Update mode: appData array mein update karein
            appData.cards[editIndex] = data;
        } else {
            // Create mode: appData array mein push karein
            appData.cards.push(data);
        }

        // syncData function aapka pura appData object Firebase par {merge: true} ke sath save karta hai
        await syncData('cards'); 
        
        alert("Card Saved Successfully with " + linksData.length + " links!");
        
        // Cleanup
        clearCardFormInputsToInsertState();
        document.getElementById('linkContainer').innerHTML = ''; 
        
    } catch (err) {
        console.error("Sync Error:", err);
        alert("Failed to save. Check Console.");
    }
}

    // 5. CORE LOGIC
 async function moveItem(key, direction, idx) {
    let list = appData[key];
    
    if (direction === 'up' && idx > 0) {
        // ऊपर वाले के साथ स्वैप करें
        [list[idx], list[idx - 1]] = [list[idx - 1], list[idx]];
    } else if (direction === 'down' && idx < list.length - 1) {
        // नीचे वाले के साथ स्वैप करें
        [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
    } else {
        return; // कोई बदलाव नहीं
    }
    
    await syncData(key); // फायरबेस पर सेव करें और टेबल रिफ्रेश करें
}

    async function purgeEntry(key, idx) {
        appData[key].splice(idx, 1);
        await syncData(key);
    }

    async function syncData(key) {
        try {
            await db.collection("data").doc("matrix_config").set(appData, { merge: true });
            runDatabaseStateSynchronization();
            alert("Success!");
        } catch (e) { alert("Sync Error: " + e.message); }
    }

    // 6. UI HELPERS
 function togglePopoverDrawerMenu(id) {
    // पहले बाकी सभी पॉपओवर्स को बंद करें
    document.querySelectorAll('.icon-dropdown-popover, .color-dropdown-popover').forEach(p => {
        if(p.id !== id) p.classList.remove('popover-visible');
    });
    // फिर सिर्फ जिसे क्लिक किया उसे टॉगल करें
    document.getElementById(id).classList.toggle('popover-visible');
}


    function switchManagementDataGridTab(tab, btn) {
        dataViewActiveTab = tab;
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderDynamicManagementViewGrid();
    }
function switchActiveFormPanel(panelId, btn) {
    document.querySelectorAll('.workspace-panel-box').forEach(p => p.style.display = 'none');
    document.getElementById(panelId).style.display = 'flex';
    document.querySelectorAll('.mode-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}


function compileVisualUISelectionPickers() {
    document.querySelectorAll('.icon-dropdown-popover').forEach(popover => {
        // सिर्फ एक बार पॉपुलेट करने के लिए चेक
        if (popover.innerHTML.trim() !== '') return; 
        
        // यहाँ से आप अपनी मनपसंद आइकॉन लिस्ट बढ़ा सकते हैं
      const icons = [
    // 1-100: Folder, Web, Security
    "fas fa-folder", "fas fa-folder-open", "fas fa-file", "fas fa-file-alt", "fas fa-file-pdf", "fas fa-file-word", "fas fa-file-excel", "fas fa-file-archive", "fas fa-copy", "fas fa-paste", "fas fa-file-contract", "fas fa-file-download", "fas fa-file-upload", "fas fa-file-code", "fas fa-file-image", "fas fa-file-video", "fas fa-file-audio", "fas fa-save", "fas fa-trash", "fas fa-archive",
    "fas fa-globe", "fas fa-wifi", "fas fa-link", "fas fa-external-link-alt", "fas fa-cloud", "fas fa-server", "fas fa-network-wired", "fas fa-rss", "fas fa-plug", "fas fa-bolt", "fas fa-broadcast-tower", "fas fa-code-branch", "fas fa-sitemap", "fas fa-anchor", "fas fa-ethernet", "fas fa-satellite", "fas fa-database", "fas fa-hdd", "fas fa-server", "fas fa-cloud-upload-alt",
    "fas fa-user", "fas fa-user-secret", "fas fa-lock", "fas fa-unlock", "fas fa-shield-alt", "fas fa-key", "fas fa-id-card", "fas fa-user-circle", "fas fa-users", "fas fa-user-tie", "fas fa-user-plus", "fas fa-user-minus", "fas fa-user-edit", "fas fa-user-shield", "fas fa-user-lock", "fas fa-fingerprint", "fas fa-user-check", "fas fa-user-times", "fas fa-user-tag", "fas fa-sign-in-alt",
    "fas fa-cog", "fas fa-cogs", "fas fa-sliders-h", "fas fa-wrench", "fas fa-hammer", "fas fa-tools", "fas fa-broom", "fas fa-paint-brush", "fas fa-terminal", "fas fa-code", "fas fa-bug", "fas fa-laptop-code", "fas fa-microchip", "fas fa-power-off", "fas fa-redo", "fas fa-sync", "fas fa-history", "fas fa-magic", "fas fa-filter", "fas fa-sort",
    "fas fa-envelope", "fas fa-envelope-open", "fas fa-comment", "fas fa-comments", "fas fa-phone", "fas fa-phone-alt", "fas fa-sms", "fas fa-headset", "fas fa-share-alt", "fas fa-paper-plane", "fas fa-comments-dollar", "fas fa-phone-slash", "fas fa-mail-bulk", "fas fa-reply", "fas fa-forward", "fas fa-envelope-square", "fas fa-blog", "fas fa-address-book", "fas fa-comments", "fas fa-comment-dots",

    // 101-500: Font Awesome ke aur bhi premium icons ka reference
    // Note: Yahan aap Font Awesome ki official library se koi bhi icon naam dal sakte hain
    "fas fa-star", "fas fa-heart", "fas fa-thumbs-up", "fas fa-thumbs-down", "fas fa-smile", "fas fa-meh", "fas fa-frown", "fas fa-laugh", "fas fa-surprise", "fas fa-tired", 
    "fas fa-car", "fas fa-bus", "fas fa-train", "fas fa-subway", "fas fa-bicycle", "fas fa-motorcycle", "fas fa-plane", "fas fa-ship", "fas fa-rocket", "fas fa-fighter-jet",
    "fas fa-apple-alt", "fas fa-lemon", "fas fa-pepper-hot", "fas fa-pizza-slice", "fas fa-hamburger", "fas fa-ice-cream", "fas fa-cookie", "fas fa-coffee", "fas fa-glass-martini", "fas fa-beer",
    "fas fa-graduation-cap", "fas fa-book", "fas fa-bookmark", "fas fa-pen-nib", "fas fa-highlighter", "fas fa-marker", "fas fa-chalkboard", "fas fa-school", "fas fa-university", "fas fa-laptop",
    // ... [Isi tarah aap FontAwesome ki website se naam copy karke yahan append kar sakte hain]

       // Government & Utility Icons
"fas fa-id-card",        // Aadhaar ke liye (Id Card)
"fas fa-fingerprint",    // Aadhaar/Biometric ke liye
"fas fa-address-card",   // PAN Card/Identity ke liye
"fas fa-university",     // Scholarship ke liye
"fas fa-graduation-cap", // Education/Scholarship
"fas fa-file-invoice",   // Forms ke liye
"fas fa-folder-open",    // Folders
"fas fa-file-alt",       // Documents
"fas fa-pen-nib",        // Form filling
"fas fa-stamp",          // Official/Government
"fas fa-landmark",       // Government portal
"fas fa-scroll",         // Scholarship/Legal forms
"fas fa-user-graduate",  // Student/Scholarship
"fas fa-file-signature", // Application forms
"fas fa-book-reader",    // Scholarship details
"fas fa-id-badge",       // ID Proof
"fas fa-copy",           // Records
"fas fa-archive",        // Storage
"fas fa-paperclip",      // Attachments
"fas fa-file-pdf"        // PDF Forms
     
];

        icons.forEach(icon => {
            const div = document.createElement('div');
            div.className = "icon-grid-item";
            div.innerHTML = `<i class="${icon}"></i>`;
            div.onclick = (e) => { 
                e.stopPropagation(); 
                // पेरेंट का नाम अपडेट करें
                const parent = popover.parentElement;
                parent.querySelector('span').innerHTML = `<i class="${icon}"></i> Selected`; 
                popover.classList.remove('popover-visible'); 
            };
            popover.appendChild(div);
        });
    });
}
  


function compileColorSelectionPickers() {
    // 40+ Premium Professional Colors
const colors = [
    {name: "Crimson", hex: "#DC143C"}, {name: "Ocean", hex: "#0077BE"}, {name: "Emerald", hex: "#50C878"},
    {name: "Amethyst", hex: "#9966CC"}, {name: "Midnight", hex: "#191970"}, {name: "Sun", hex: "#FFD700"},
    {name: "Carrot", hex: "#ED9121"}, {name: "Concrete", hex: "#F2F2F2"}, {name: "Peter River", hex: "#3498DB"},
    {name: "Belize Hole", hex: "#2980B9"}, {name: "Wisteria", hex: "#8E44AD"}, {name: "Nephritis", hex: "#27AE60"},
    {name: "Orange", hex: "#FFA500"}, {name: "Pumpkin", hex: "#D35400"}, {name: "Pomegranate", hex: "#C0392B"},
    {name: "Silver", hex: "#C0C0C0"}, {name: "Asbestos", hex: "#7F8C8D"}, {name: "Dark Blue", hex: "#00008B"},
    {name: "Slate Blue", hex: "#6A5ACD"}, {name: "Tomato", hex: "#FF6347"}, {name: "Dodger Blue", hex: "#1E90FF"},
    {name: "Lime Green", hex: "#32CD32"}, {name: "Medium Orchid", hex: "#BA55D3"}, {name: "Steel Blue", hex: "#4682B4"},
    {name: "Fire Brick", hex: "#B22222"}, {name: "Dark Slate Gray", hex: "#2F4F4F"}, {name: "Peru", hex: "#CD853F"},
    {name: "Cadet Blue", hex: "#5F9EA0"}, {name: "Medium Sea Green", hex: "#3CB371"}, {name: "Hot Pink", hex: "#FF69B4"},
    {name: "Dark Olive Green", hex: "#556B2F"}, {name: "Sienna", hex: "#A0522D"}, {name: "Midnight Blue", hex: "#191970"},
    {name: "Royal Purple", hex: "#7851A9"}, {name: "Gold", hex: "#FFD700"}, {name: "Teal", hex: "#008080"},
    {name: "Indigo", hex: "#4B0082"}, {name: "Deep Pink", hex: "#FF1493"}, {name: "Cyan", hex: "#00FFFF"},
    {name: "Coral", hex: "#FF7F50"}, {name: "Dark Khaki", hex: "#BDB76B"}, {name: "Forest Green", hex: "#228B22"},
    {name: "Light Sea Green", hex: "#20B2AA"}, {name: "Maroon", hex: "#800000"}, {name: "Navy", hex: "#000080"},
    {name: "Olive", hex: "#808000"}, {name: "Purple", hex: "#800080"}, {name: "Violet", hex: "#EE82EE"},
    {name: "Dark Orchid", hex: "#9932CC"}, {name: "Salmon", hex: "#FA8072"}, {name: "Dark Orange", hex: "#FF8C00"},
    {name: "Spring Green", hex: "#00FF7F"}, {name: "Turquoise", hex: "#40E0D0"}, {name: "Medium Violet Red", hex: "#C71585"}
];


    document.querySelectorAll('.color-dropdown-popover').forEach(popover => {
        if (popover.innerHTML.trim() !== '') return;
        
        colors.forEach(c => {
            const div = document.createElement('div');
            div.className = "color-chip-row";
            div.innerHTML = `<span class="circular-glow-dot" style="background-color: ${c.hex}"></span> ${c.name}`;
            
            div.onclick = (e) => { 
                e.stopPropagation(); 
                // पेरेंट का लेबल अपडेट करें
                popover.parentElement.querySelector('span').innerHTML = 
                    `<span class="circular-glow-dot" style="background-color:${c.hex}"></span> ${c.name}`;
                popover.classList.remove('popover-visible'); 
            };
            popover.appendChild(div);
        });
    });
}




async function executeNoticeBoardUpdateFeed(btn) {
    // 1. Validation: Sirf notice board wali field check karein
    if (!validateFormFields(['globalNoticeBoardFeedInput'])) {
        console.log("Validation Failed: Notice field is required.");
        return; 
    }

    const input = document.getElementById('globalNoticeBoardFeedInput');
    
    // 2. UI Loading State (Premium Feel)
    const icon = btn.querySelector('i');
    const originalClass = icon.className;
    icon.className = 'fas fa-spinner fa-spin'; // fa-spin automatic animation ke liye
    btn.disabled = true;

    try {
        // 3. Data Update
        appData.notice = input.value;
        await db.collection("data").doc("matrix_config").set(appData, { merge: true });
        
        // 4. Success UI Update
        loadNotice();
        alert("Notice Updated Successfully!");
    } catch (error) {
        console.error("Error updating notice:", error);
        alert("Failed to update notice.");
    } finally {
        // 5. Reset UI State
        icon.className = originalClass;
        btn.disabled = false;
    }
}

function validateInputs(fields) {
    let isValid = true;
    
    for (let fieldId of fields) {
        let element = document.getElementById(fieldId);
        
        // पुरानी एरर क्लास हटाएँ
        element.classList.remove('input-error');
        
        if (!element || element.value.trim() === "") {
            // एरर दिखाएँ
            element.classList.add('input-error');
            element.placeholder = "This field is required!";
            element.focus();
            isValid = false;
        }
    }
    return isValid;
}

function setupEditMode(key, idx) {
    const item = appData[key][idx];
    console.log("Editing:", key, "at index:", idx);

    // 1. MAIN FOLDERS
    if (key === 'folders') {
        switchActiveFormPanel('panelLayout', document.getElementById('tabBtnLayout'));
        document.getElementById('mainFolderEditIndex').value = idx;
        document.getElementById('mainFolderNameInput').value = item.name;
        
        // आइकन और कलर अपडेट करें
        document.getElementById('mainFolderIconTriggerLabel').innerHTML = `<i class="${item.icon}"></i> Selected`;
        document.getElementById('mainFolderColorTriggerLabel').innerHTML = `<span class="circular-glow-dot" style="background-color:${item.color}"></span> ${item.color}`;
        
        document.getElementById('mainFolderSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Update Folder';
        document.getElementById('mainFolderCancelBtn').style.display = "inline-flex";
        document.getElementById('mainFolderFormTitle').scrollIntoView({ behavior: 'smooth' });
    } 
    // 2. SUB-PORTALS
    else if (key === 'subs') {
        switchActiveFormPanel('panelLayout', document.getElementById('tabBtnLayout'));
        document.getElementById('subPortalEditIndex').value = idx;
        document.getElementById('subPortalParentSelect').value = item.parent;
        document.getElementById('subPortalNameInput').value = item.name;
        
        // आइकन और कलर अपडेट करें
        document.getElementById('subPortalIconTriggerLabel').innerHTML = `<i class="${item.icon}"></i> Selected`;
        document.getElementById('subPortalColorTriggerLabel').innerHTML = `<span class="circular-glow-dot" style="background-color:${item.color}"></span> ${item.color}`;
        
        document.getElementById('subPortalSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Update Sub-Portal';
        document.getElementById('subPortalCancelBtn').style.display = "inline-flex";
        document.getElementById('subPortalFormTitle').scrollIntoView({ behavior: 'smooth' });
    } 
    // 3. SIDE-LINKS
    else if (key === 'sideLinks') {
        switchActiveFormPanel('panelLayout', document.getElementById('tabBtnLayout')); 
        document.getElementById('sideLinkEditIndex').value = idx;
        document.getElementById('sideLinkParentSelect').value = item.folder;
        document.getElementById('sideLinkLabelInput').value = item.label;
        document.getElementById('sideLinkUrlInput').value = item.url;
        
        // आइकन और कलर अपडेट करें
        document.getElementById('sideLinkIconTriggerLabel').innerHTML = `<i class="${item.icon}"></i> Selected`;
        document.getElementById('sideLinkColorTriggerLabel').innerHTML = `<span class="circular-glow-dot" style="background-color:${item.color}"></span> ${item.color}`;
        
        document.getElementById('sideLinkSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Update Link';
        document.getElementById('sideLinkCancelBtn').style.display = "inline-flex";
        document.getElementById('sideLinkFormTitle').scrollIntoView({ behavior: 'smooth' });
    } 
    // 4. CARDS
  // 4. CARDS (Updated with Dynamic Link Rendering)
    else if (key === 'cards') {
        switchActiveFormPanel('panelCards', document.getElementById('tabBtnCards'));
        document.getElementById('cardEditModeTrackerId').value = idx;
        document.getElementById('cardMainFolderContextSelector').value = item.folder;
        
        // Sub-Portal update karne ke liye dropdown refresh karna zaroori hai
        updateSubDropdownForCards(); 
        document.getElementById('cardSubPortalContextSelector').value = item.sub;
        
        document.getElementById('cardTitleHeaderInput').value = item.title;
        document.getElementById('cardUrlPathInput').value = item.url;
        document.getElementById('cardDescriptionTextSummaryInput').value = item.desc || "";
        
        // --- MULTIPLE LINKS LOGIC ---
        const linkContainer = document.getElementById('linkContainer');
        linkContainer.innerHTML = ''; // Pehle purane links saaf karein
        
        if (item.links && Array.isArray(item.links)) {
            item.links.forEach(link => {
                addMoreLinks(); // Naya link group row create karein
                
                // Sabse last bane hue group ko select karke data fill karein
                const groups = document.querySelectorAll('.link-group');
                const lastGroup = groups[groups.length - 1];
                
                if (lastGroup) {
                    lastGroup.querySelector('.link-title').value = link.title || "";
                    lastGroup.querySelector('.link-desc').value = link.desc || "";
                    lastGroup.querySelector('.link-url').value = link.url || "";
                }
            });
        }
        // ----------------------------

        // आइकन और कलर अपडेट करें
        document.getElementById('workspaceCardIconTriggerLabel').innerHTML = `<i class="${item.icon}"></i> Selected`;
        document.getElementById('workspaceCardColorTriggerLabel').innerHTML = `<span class="circular-glow-dot" style="background-color:${item.color}"></span> ${item.color}`;
        
        document.getElementById('cardFormSubmitTriggerBtn').innerHTML = '<i class="fas fa-save"></i> Update Card';
        document.getElementById('cardFormCancelTriggerBtn').style.display = "inline-flex";
        document.getElementById('cardFormTitleText').scrollIntoView({ behavior: 'smooth' });
        // setupEditMode ke cards block mein ye add karein
    document.getElementById('cardImageUrlInput').value = item.imageUrl || ""; 
    document.getElementById('cardImagePreview').src = item.imageUrl || 'default-icon.png';
    }
}

// बाहर क्लिक करने पर पॉपओवर बंद करने का फंक्शन
document.addEventListener('click', function(event) {
    const isClickInsidePopover = event.target.closest('.icon-dropdown-popover') || 
                                 event.target.closest('.color-dropdown-popover') ||
                                 event.target.closest('.premium-color-trigger-field');

    if (!isClickInsidePopover) {
        document.querySelectorAll('.icon-dropdown-popover, .color-dropdown-popover').forEach(p => {
            p.classList.remove('popover-visible');
        });
    }
});



window.onload = async () => {
    // 1. सबसे पहले आपका पुराना रेंडरिंग और डेटा लोडिंग का काम
    try {
        const doc = await db.collection("data").doc("matrix_config").get();
        if (doc.exists) { 
            appData = doc.data(); 
        }
    } catch (e) { 
        console.error("Firebase load error:", e); 
    }
    
    // ये आपके मुख्य कार्ड्स और साइडबार को रेंडर करते हैं
    runDatabaseStateSynchronization(); 

    // 2. अब आपका नया नोटिफिकेशन फंक्शन यहाँ कॉल करें
    loadNotice();
};

// नोटिफिकेशन लोड करने वाला फंक्शन (इसे ऐसे ही रहने दें)
async function loadNotice() {
    // यहाँ अपनी नई ID का उपयोग करें जो हमने अभी तय की थी
    const noticeBar = document.getElementById('premium-notice-display-zone');
    const noticeSpan = document.getElementById('system-notice-text-content');
    
    if (!noticeBar || !noticeSpan) return; // अगर आईडी नहीं मिली तो रुकें

    if (appData.notice && appData.notice.trim() !== "") {
        noticeSpan.innerText = appData.notice;
        noticeBar.style.display = 'flex'; 
    }
}
// (Note: compile functions for icons/colors keep as they were, they work fine)




function resetSubPortalForm() {
    document.getElementById('subPortalNameInput').value = "";
    document.getElementById('subPortalEditIndex').value = "-1";
    document.getElementById('subPortalSubmitBtn').innerHTML = '<i class="fas fa-level-down-alt"></i> Create Sub-Portal';
    document.getElementById('subPortalCancelBtn').style.display = "none";
}

function resetSideLinkForm() {
    document.getElementById('sideLinkLabelInput').value = "";
    document.getElementById('sideLinkUrlInput').value = "";
    document.getElementById('sideLinkEditIndex').value = "-1";
    document.getElementById('sideLinkSubmitBtn').innerHTML = '<i class="fas fa-link"></i> Add Deep-Link';
    document.getElementById('sideLinkCancelBtn').style.display = "none";
}

function clearCardFormInputsToInsertState() {
    document.getElementById('cardTitleHeaderInput').value = "";
    document.getElementById('cardUrlPathInput').value = "";
    document.getElementById('cardDescriptionTextSummaryInput').value = "";
    document.getElementById('cardEditModeTrackerId').value = "-1";
    document.getElementById('cardFormSubmitTriggerBtn').innerHTML = '<i class="fas fa-save"></i> Create Card';
    document.getElementById('cardFormCancelTriggerBtn').style.display = "none";
    document.getElementById('linkContainer').innerHTML = '';
    document.getElementById('cardImageUrlInput').value = "";
    document.getElementById('cardImagePreview').src = 'default-icon.png'; // Reset preview
}


async function executeSideLinkAddition() {
    if (!validateFormFields(['sideLinkParentSelect', 'sideLinkSubSelect', 'sideLinkLabelInput', 'sideLinkUrlInput'])) return;
    // 1. सुरक्षित तरीके से ID ढूंढें
    const parentElem = document.getElementById('sideLinkParentSelect');
    const subElem = document.getElementById('sideLinkSubSelect');
    const labelElem = document.getElementById('sideLinkLabelInput');
    const urlElem = document.getElementById('sideLinkUrlInput');
    const editIndexElem = document.getElementById('sideLinkEditIndex');

    // 2. अगर कोई भी एलिमेंट गायब है तो यहाँ अलर्ट देगा (इससे एरर का पता चल जाएगा)
    if (!parentElem || !subElem || !labelElem || !urlElem || !editIndexElem) {
        alert("Error: Form elements not found! Check HTML IDs.");
        return;
    }

    const editIndex = parseInt(editIndexElem.value);
    const icon = document.querySelector('#sideLinkIconTriggerLabel i')?.className || "fas fa-link";
    const color = document.querySelector('#sideLinkColorTriggerLabel .circular-glow-dot')?.style.backgroundColor || "#FF78AC";
    
    const data = {
        folder: parentElem.value,
        sub: subElem.value, // यही लाइन क्रैश कर रही थी अगर subElem नहीं मिला
        label: labelElem.value,
        url: urlElem.value,
        icon: icon, 
        color: color
    };

    if (!data.label) return alert("Label Required");

    if (editIndex !== -1) {
        appData.sideLinks[editIndex] = data;
    } else {
        appData.sideLinks.push(data);
    }
    
    await syncData('sideLinks');
    resetSideLinkForm();
}
// यह फंक्शन ड्रॉपडाउन को कंट्रोल करता है (इसे जोड़ना अनिवार्य है)
function updateSubDropdownForSideLinks() {
    const parentSelect = document.getElementById('sideLinkParentSelect');
    const subDropdown = document.getElementById('sideLinkSubSelect'); // सही ID का उपयोग करें
    
    if (!parentSelect || !subDropdown) return;

    const selectedFolder = parentSelect.value;
    
    subDropdown.innerHTML = '<option value="">Select Sub-Portal</option>';
    
    if (appData.subs) {
        const filtered = appData.subs.filter(sub => sub.parent === selectedFolder);
        filtered.forEach(sub => {
            subDropdown.innerHTML += `<option value="${sub.name}">${sub.name}</option>`;
        });
    }
}


function updateSubDropdownForCards() {
    const parentSelect = document.getElementById('cardMainFolderContextSelector');
    const subDropdown = document.getElementById('cardSubPortalContextSelector'); // नई ID
    
    if (!parentSelect || !subDropdown) return;

    const mainFolder = parentSelect.value;
    
    // लिस्ट साफ़ करें
    subDropdown.innerHTML = '<option value="">Select Sub-Portal</option>';
    
    if (!mainFolder) {
        subDropdown.disabled = true;
        return;
    }
    
    subDropdown.disabled = false;
    
    // फिल्टरिंग लॉजिक
    if (appData.subs) {
        const filteredSubs = appData.subs.filter(sub => sub.parent === mainFolder);
        
        if (filteredSubs.length > 0) {
            filteredSubs.forEach(sub => {
                subDropdown.innerHTML += `<option value="${sub.name}">${sub.name}</option>`;
            });
        } else {
            subDropdown.innerHTML = '<option value="">No Sub-Portals Found</option>';
        }
    }
}

function validateFormFields(fieldIds, isCustomPicker = false) {
    let isValid = true;
    
    fieldIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;

        element.classList.remove('input-error');
        const existingMsg = element.parentNode.querySelector('.error-msg');
        if (existingMsg) existingMsg.remove();
        
        let isEmpty = false;
        
        if (isCustomPicker) {
            // FIX: Span text ko extract karein
            const spanElement = element.querySelector('span');
            // Hum .includes() hatakar exact string check karenge
            const labelText = spanElement ? spanElement.innerText.trim() : "";
            
            // "Select Icon" या "Select Color" अगर है, तो ही Error दिखाएं
            if (labelText === "" || labelText.includes("Select")) {
                isEmpty = true;
            }
        } else {
            if (!element.value || element.value.trim() === "") {
                isEmpty = true;
            }
        }

        if (isEmpty) {
            element.classList.add('input-error');
            const msg = document.createElement('div');
            msg.className = 'error-msg';
            msg.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 5px;';
            msg.innerText = 'This field is required';
            element.parentNode.appendChild(msg);
            isValid = false;
        }
    });
    
    return isValid;
}



async function updateAdminPin() {
    const newPin = document.getElementById('newPinInput').value; // HTML में अपना input ID दें
    if (newPin.length !== 4) return alert("PIN must be 4 digits!");

    appData.admin_pin = newPin; // PIN को डेटा में अपडेट किया
    await db.collection("data").doc("matrix_config").set(appData, { merge: true });
    alert("PIN Updated Successfully!");
}


async function verifyPin() {
    const enteredPin = document.getElementById('pinInput').value;
    
    // Check if appData.admin_pin exists
    if (!appData.admin_pin) {
        alert("PIN not set in database. Please set it via Firebase!");
        return;
    }

    if (enteredPin === appData.admin_pin) {
        // Success animation
        document.getElementById('pinModal').style.opacity = '0';
        setTimeout(() => document.getElementById('pinModal').style.display = 'none', 500);
    } else {
        // Error feedback
        const card = document.querySelector('.pin-card');
        card.style.animation = 'premium-shake 0.4s';
        document.getElementById('pinInput').value = "";
        setTimeout(() => card.style.animation = '', 500);
    }
}


document.querySelectorAll('.pin-digit').forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1) {
            if (index < 3) document.querySelectorAll('.pin-digit')[index + 1].focus();
        }
        checkPin(); // PIN check karega
    });
});

async function checkPin() {
    let inputs = document.querySelectorAll('.pin-digit');
    let pin = Array.from(inputs).map(i => i.value).join('');
    
    if (pin.length === 4) {
        let hashedInput = CryptoJS.MD5(pin).toString(); 
        
        if (hashedInput === appData.secure_hash) {
            document.getElementById('pinModal').style.display = 'none';
        } else {
            // Premium Feedback Sequence
            const card = document.querySelector('.pin-card');
            const statusMsg = document.getElementById('statusMessage');
            
            // 1. Inputs ko red glow aur shake dein
            inputs.forEach(i => i.classList.add('input-error'));
            
            // 2. Status message show karein
            statusMsg.style.opacity = "1";
            
            // 3. 2 seconds baad reset karein
            setTimeout(() => {
                inputs.forEach(i => {
                    i.classList.remove('input-error');
                    i.value = "";
                });
                statusMsg.style.opacity = "0";
                inputs[0].focus();
            }, 2000);
        }
    }
}


async function handlePinUpdate() {
    const newPin = document.getElementById('newPinInput').value;
    
    // Validation
    if (newPin.length !== 4) {
        alert("PIN must be exactly 4 digits!");
        return;
    }

    // MD5 Hash mein convert karein
    const newHash = CryptoJS.MD5(newPin).toString();

    // Firebase Update
    try {
        appData.secure_hash = newHash; // Firebase mein update
        await db.collection("data").doc("matrix_config").set(appData, { merge: true });
        
        alert("Success: PIN Updated Successfully!");
        document.getElementById('newPinInput').value = ""; // Input clear karein
    } catch (error) {
        console.error("Error updating PIN:", error);
        alert("Failed to update PIN. Check console.");
    }
}





function addMoreLinks() {
    const div = document.createElement('div');
    div.className = "link-group";
    // Style mein thoda adjustment kiya hai taaki delete button sahi dikhe
    div.style = "display:flex; gap:10px; margin-top:10px; align-items:center;";
    
    div.innerHTML = `
        <input type="text" placeholder="Title" class="link-title" style="flex:1; padding:8px; border-radius:5px; border:1px solid #ccc;">
        <input type="text" placeholder="Desc" class="link-desc" style="flex:1; padding:8px; border-radius:5px; border:1px solid #ccc;">
        <input type="text" placeholder="URL" class="link-url" style="flex:1; padding:8px; border-radius:5px; border:1px solid #ccc;">
        
        <!-- Delete Button -->
        <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; color:#ef4444; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    document.getElementById('linkContainer').appendChild(div);
}


function saveCardToDatabase() {
    // 1. Validation check (Title khali na ho)
    const titleVal = document.getElementById('titleInput').value;
    if (!titleVal) {
        alert("Guru Jee, kam se kam Card Title toh likhiye!");
        return;
    }

    // 2. Saare Links aur Descriptions collect karein
    const linksData = [];
    document.querySelectorAll('.link-group').forEach(group => {
        const title = group.querySelector('.link-title').value;
        const desc = group.querySelector('.link-desc').value;
        const url = group.querySelector('.link-url').value;
        
        // Agar title aur url dono hain, tabhi array mein push karein
        if (title && url) {
            linksData.push({
                title: title,
                desc: desc,
                url: url
            });
        }
    });

    // 3. Card Object taiyaar karein
    const newCard = {
        title: titleVal,
        desc: document.getElementById('descInput').value,
        icon: document.getElementById('iconInput').value,
        color: document.getElementById('colorInput').value,
        sub: document.getElementById('subInput').value,
        links: linksData // Naye feature ke links yahan save ho rahe hain
    };

    // 4. Firebase Save
    db.collection('data').doc('matrix_config').update({
        cards: firebase.firestore.FieldValue.arrayUnion(newCard)
    })
    .then(() => {
        alert("Card successfully saved with " + linksData.length + " links!");
        
        // Optional: Form reset karein taaki agla card aasani se ban sake
        document.getElementById('titleInput').value = '';
        document.getElementById('descInput').value = '';
        document.getElementById('linkContainer').innerHTML = ''; // Links ka div saaf
    })
    .catch((error) => {
        console.error("Error saving card: ", error);
        alert("Kuch gadbad ho gayi, check console!");
    });
}


function editCard(cardId) {
    // 1. Firebase se data fetch karein
    const cardRef = ref(db, 'cards/' + cardId);
    get(cardRef).then((snapshot) => {
        const cardData = snapshot.val();
        
        // ... (Baaki fields fill karein jaisa aap abhi kar rahe hain)

        // 2. IMPORTANT: Multiple Links ko handle karein
        const linksContainer = document.getElementById('linksContainer'); // Jo container aapne banaya hai
        linksContainer.innerHTML = ''; // Pehle purana data saaf karein

        if (cardData.links && Array.isArray(cardData.links)) {
            cardData.links.forEach((link) => {
                addLinkField(link.name, link.url); // Ye function naya field banayega
            });
        }
    });
}

function addLinkField(name = '', url = '') {
    const container = document.getElementById('linksContainer');
    const div = document.createElement('div');
    div.className = 'link-input-group';
    div.innerHTML = `
        <input type="text" placeholder="Link Name" value="${name}" class="link-name">
        <input type="text" placeholder="URL" value="${url}" class="link-url">
        <button type="button" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(div);
}



// ratin card ka pdf link add krne ke liye ye link banaya gaya hai 

    // Page load hote hi admin list load karna
    window.addEventListener('DOMContentLoaded', loadAdminDriveList);

    async function loadAdminDriveList() {
        const listContainer = document.getElementById('adminDrivePdfList');
        listContainer.innerHTML = '<p class="text-xs text-slate-400">Loading...</p>';

        try {
            const snapshot = await db.collection('drive_pdfs').get();
            listContainer.innerHTML = '';
            
            if (snapshot.empty) {
                listContainer.innerHTML = '<p class="text-xs text-slate-400">Koi bhi PDF link added nahi hai.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                listContainer.innerHTML += `
                    <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <div>
                            <span class="font-bold text-slate-800 block">${data.title}</span>
                            <span class="text-slate-400 truncate max-w-[200px] block">${data.driveLink}</span>
                        </div>
                        <button onclick="deleteDrivePdf('${doc.id}')" class="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded-lg font-bold transition">Delete</button>
                    </div>
                `;
            });
        } catch (e) {
            console.error("Error:", e);
        }
    }

    // Firestore database mein title aur link save karna
    async function saveDrivePdfToDb() {
        const title = document.getElementById('pdfTitleInput').value.trim();
        const driveLink = document.getElementById('pdfDriveLinkInput').value.trim();
        const statusText = document.getElementById('adminStatusText');

        if (!title || !driveLink) {
            alert("Kripya PDF ka naam aur link dono bharein!");
            return;
        }

        statusText.innerText = "Saving...";

        try {
            await db.collection('drive_pdfs').add({
                title: title,
                driveLink: driveLink,
                createdAt: new Date()
            });

            statusText.innerText = "Success! Link successfully save ho gaya hai.";
            document.getElementById('pdfTitleInput').value = "";
            document.getElementById('pdfDriveLinkInput').value = "";
            loadAdminDriveList();
            alert("Naya PDF link add ho chuka hai!");
        } catch (error) {
            statusText.innerText = "Error saving link.";
            console.error(error);
        }
    }

    // Delete function
    async function deleteDrivePdf(docId) {
        if (!confirm("Kya aap is link ko delete karna chahte hain?")) return;
        try {
            await db.collection('drive_pdfs').doc(docId).delete();
            alert("Deleted successfully!");
            loadAdminDriveList();
        } catch (error) {
            alert("Error deleting.");
            console.error(error);
        }
    }
