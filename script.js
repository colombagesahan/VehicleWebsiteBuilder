const firebaseConfig = {
  apiKey: "AIzaSyBUjzMFao9BS3uXBOW3qYrLVqHaGn8qIk4", 
  authDomain: "onlineshop-30cd1.firebaseapp.com",
  projectId: "onlineshop-30cd1",
  storageBucket: "onlineshop-30cd1.firebasestorage.app",
  messagingSenderId: "818252574868",
  appId: "1:818252574868:web:8dd36825db589a886cc481"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const state = {
    user: null, role: null, profileComplete: false, vehicleImages: [], inventory: [], 
    categories: ["Car", "SUV", "Van", "Pickup", "Lorry", "Bus", "Motorcycle", "Scooter", "Three-wheeler", "Tractor", "Construction", "Trailer", "RV", "ATV", "Special", "Marine"]
};

window.ui = {
    showLoader: (show, text="Processing...") => {
        const el = document.getElementById('loader');
        if(el) { document.getElementById('loaderText').innerText = text; show ? el.classList.remove('hidden') : el.classList.add('hidden'); }
    },
    toast: (msg, type='success') => {
        const div = document.createElement('div'); div.className = `toast ${type}`; div.innerText = msg;
        document.getElementById('toastContainer').appendChild(div); setTimeout(()=>div.remove(), 4000);
    },
    showView: (id) => {
        document.querySelectorAll('.view').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });
        document.getElementById(id).classList.remove('hidden'); document.getElementById(id).classList.add('active');
    },
    switchTab: (id) => {
        if(state.user && !state.profileComplete && id !== 'tabProfile') return ui.toast("Please complete your Profile Settings first!", "error");
        document.querySelectorAll('.dash-tab').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.getElementById(id).classList.remove('hidden'); document.getElementById(id).classList.add('active');
        const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick')?.includes(id));
        if(btn) btn.classList.add('active');

        if(state.user) {
            if(id === 'tabMyVehicles') app.loadMyData('vehicles', 'myVehiclesList');
            if(id === 'tabMyParts') app.loadMyData('parts', 'myPartsList');
            if(id === 'tabMyServices') app.loadMyData('services', 'myServicesList');
            if(id === 'tabDirectory') app.loadDirectory();
            if(id === 'tabConnect') app.loadConnectSection();
            if(id === 'tabProfile') app.loadProfile();
            if(id === 'tabWebsite') app.loadWebsiteSettings();
            if(id === 'tabBuyerBrowse') app.buyerFilter('vehicles');
            if(id === 'tabPromote') app.loadMyAds();
            if(id === 'tabAdmin') app.loadAdminAds();
        }
    },
    closeModal: () => document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden')),
    
    // GHOST DATA FIX: Reset everything on logout
    resetDashboard: () => {
        const safeVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        safeVal('profPhone', ''); safeVal('profWhatsapp', ''); safeVal('profAddress', ''); safeVal('profCity', '');
        document.getElementById('profFields').disabled = false;
        document.getElementById('profileNotice').classList.remove('hidden');
        document.getElementById('editProfileBtn').classList.add('hidden');
        document.getElementById('saveProfile').classList.remove('hidden');
        document.getElementById('dashAvatar').innerHTML = '<i class="fa-solid fa-user"></i>';
        document.getElementById('dashEmail').innerText = 'User';
        const form = document.getElementById('formAddVehicle'); if(form) form.reset();
        document.getElementById('vPhotoStaging').innerHTML = ''; state.vehicleImages = [];
        // Website Builder Reset
        document.getElementById('websiteEditor')?.classList.add('hidden');
        document.getElementById('websiteLockScreen')?.classList.remove('hidden');
        safeVal('initSaleName', '');
        safeVal('webName', '');
        document.getElementById('mySiteLink').innerText = '...';
        state.user = null; state.profileComplete = false; state.inventory = [];
    },

    renderSidebar: (role) => {
        const nav = document.getElementById('dynamicSidebar');
        let html = `<button onclick="ui.switchTab('tabProfile')" class="nav-item active"><i class="fa-solid fa-id-card"></i> Profile</button>`;
        if(role === 'seller') html += `<button onclick="ui.switchTab('tabAddVehicle')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Vehicle</button><button onclick="ui.switchTab('tabMyVehicles')" class="nav-item"><i class="fa-solid fa-list"></i> My Vehicles</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'parts') html += `<button onclick="ui.switchTab('tabAddPart')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Product</button><button onclick="ui.switchTab('tabMyParts')" class="nav-item"><i class="fa-solid fa-box"></i> My Products</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'service' || role === 'finance') html += `<button onclick="ui.switchTab('tabAddService')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Service</button><button onclick="ui.switchTab('tabMyServices')" class="nav-item"><i class="fa-solid fa-list-check"></i> My Services</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'buyer') html += `<button onclick="ui.switchTab('tabBuyerBrowse')" class="nav-item"><i class="fa-solid fa-search"></i> Browse</button>`;
        
        html += `<button onclick="ui.switchTab('tabDirectory')" class="nav-item"><i class="fa-solid fa-address-book"></i> Directory</button>`;
        html += `<button onclick="ui.switchTab('tabConnect')" class="nav-item"><i class="fa-solid fa-share-nodes"></i> Connect</button>`;
        html += `<button onclick="ui.switchTab('tabPromote')" class="nav-item"><i class="fa-solid fa-bullhorn"></i> Promote</button>`;
        nav.innerHTML = html;
        document.getElementById('dashRole').innerText = role ? role.toUpperCase() : 'USER';
    }
};

const compressImage = async (file) => {
    if (file.size <= 1024 * 1024) return file;
    return new Promise((resolve) => {
        const img = new Image(); img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const canvas = document.createElement('canvas'); const scale = Math.min(1, 1200 / img.width);
            canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8)));
        };
    });
};

const app = {
    init: () => {
        if(window.location.hash.startsWith('#/')) {
            const slug = window.location.hash.substring(2);
            document.getElementById('initLoader').classList.add('hidden');
            document.getElementById('platformApp').classList.add('hidden');
            document.getElementById('generatedSite').classList.remove('hidden');
            siteRenderer.loadBySlug(slug);
            return;
        }

        const sel = document.getElementById('vCat');
        if(sel && sel.options.length === 0) state.categories.forEach(c => sel.appendChild(new Option(c, c)));
        const editSel = document.getElementById('editVCat');
        if(editSel && editSel.options.length === 0) state.categories.forEach(c => editSel.appendChild(new Option(c, c)));

        auth.onAuthStateChanged(async user => {
            document.getElementById('initLoader').classList.add('hidden');
            if (user) {
                state.user = user;
                const doc = await db.collection('users').doc(user.uid).get();
                if(doc.exists) {
                    const data = doc.data();
                    state.role = data.role || 'seller';
                    if(data.phone && data.city && data.address) state.profileComplete = true;
                    ui.renderSidebar(state.role);
                    document.getElementById('dashEmail').innerText = user.email;
                    if(data.photo) document.getElementById('dashAvatar').innerHTML = `<img src="${data.photo}">`;
                    ui.showView('viewDashboard');
                    document.getElementById('btnLoginNav').classList.add('hidden');
                    document.getElementById('btnLogoutNav').classList.remove('hidden');
                    ui.switchTab('tabProfile'); 
                }
            } else {
                ui.resetDashboard();
                ui.showView('viewLanding');
                document.getElementById('btnLoginNav').classList.remove('hidden');
                document.getElementById('btnLogoutNav').classList.add('hidden');
            }
        });

        app.setupEvents();
    },

    setupEvents: () => {
        document.getElementById('btnLoginNav').onclick = () => ui.showView('viewAuth');
        document.getElementById('btnLogoutNav').onclick = () => auth.signOut();
        document.getElementById('btnLogin').onclick = async () => { try { ui.showLoader(true); await auth.signInWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value); ui.showLoader(false); } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); } };
        document.getElementById('btnSignup').onclick = async () => { const role = new URLSearchParams(window.location.search).get('role') || 'seller'; try { ui.showLoader(true); const c = await auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value); await db.collection('users').doc(c.user.uid).set({ email: c.user.email, role: role, createdAt: new Date() }); ui.showLoader(false); ui.toast("Account Created!"); window.location.href = window.location.pathname; } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); } };

        document.getElementById('saveProfile').onclick = async () => {
            let phone = document.getElementById('profPhone').value;
            let wa = document.getElementById('profWhatsapp').value;
            const city = document.getElementById('profCity').value;
            const addr = document.getElementById('profAddress').value;
            if(!phone || !wa || !addr || !city) return ui.toast("All fields required", "error");
            
            const formatPhone = (p) => { let n = p.trim(); if(n.startsWith('0')) n = '+94' + n.substring(1); else if(!n.startsWith('+')) n = '+94' + n; return n; };
            phone = formatPhone(phone); wa = formatPhone(wa);

            ui.showLoader(true, "Saving...");
            try {
                let photoUrl = null;
                const file = document.getElementById('profPhoto').files[0];
                if(file) { const blob = await compressImage(file); const ref = storage.ref(`profiles/${state.user.uid}`); await ref.put(blob); photoUrl = await ref.getDownloadURL(); }
                const data = { phone, whatsapp: wa, address: addr, city: city };
                if(photoUrl) data.photo = photoUrl;
                await db.collection('users').doc(state.user.uid).set(data, {merge: true});
                state.profileComplete = true; 
                app.loadProfile(); 
                ui.toast("Profile Saved! Dashboard Unlocked.");
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

        document.getElementById('editProfileBtn').onclick = () => {
            document.getElementById('profFields').disabled = false;
            document.getElementById('saveProfile').classList.remove('hidden');
            document.getElementById('editProfileBtn').classList.add('hidden');
        };

        // VEHICLE ADD
        document.getElementById('vPhotosInput').addEventListener('change', (e) => { const files = Array.from(e.target.files); if(state.vehicleImages.length + files.length > 10) return ui.toast("Max 10 photos", "error"); state.vehicleImages = [...state.vehicleImages, ...files]; app.renderPhotoStaging(); });
        document.getElementById('formAddVehicle').onsubmit = async (e) => {
            e.preventDefault(); if(state.vehicleImages.length === 0) return ui.toast("Upload at least one photo", "error");
            ui.showLoader(true, "Publishing...");
            try {
                const imgPromises = state.vehicleImages.map(file => compressImage(file).then(blob => { const ref = storage.ref(`vehicles/${state.user.uid}/${Date.now()}_${Math.random()}`); return ref.put(blob).then(() => ref.getDownloadURL()); }));
                const imgUrls = await Promise.all(imgPromises);
                const ytLink = document.getElementById('vYoutube').value; let ytId = ''; if(ytLink) { const match = ytLink.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); if (match && match[2].length == 11) ytId = match[2]; }
                const data = { uid: state.user.uid, category: document.getElementById('vCat').value, brand: document.getElementById('vBrand').value, model: document.getElementById('vModel').value, trim: document.getElementById('vTrim').value, year: document.getElementById('vYear').value, condition: document.getElementById('vCond').value, trans: document.getElementById('vTrans').value, fuel: document.getElementById('vFuel').value, price: document.getElementById('vPrice').value, mileage: document.getElementById('vMileage').value, body: document.getElementById('vBody').value, engine: document.getElementById('vEngine').value, book: document.getElementById('vBook').value, finance: document.getElementById('vFinance').value, desc: document.getElementById('vDesc').value, youtube: ytId, images: imgUrls, published: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
                await db.collection('vehicles').add(data); document.getElementById('formAddVehicle').reset(); state.vehicleImages = []; document.getElementById('vPhotoStaging').innerHTML = ''; ui.toast("Published!"); ui.switchTab('tabMyVehicles');
            } catch(err) { ui.toast(err.message, "error"); } finally { ui.showLoader(false); }
        };

        // EDIT VEHICLE
        document.getElementById('formEditVehicle').onsubmit = async (e) => {
            e.preventDefault(); const id = document.getElementById('editVId').value;
            const ytLink = document.getElementById('editVYoutube').value;
            let ytId = ''; if(ytLink) { const match = ytLink.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); if (match && match[2].length == 11) ytId = match[2]; }
            ui.showLoader(true);
            try {
                await db.collection('vehicles').doc(id).update({
                    category: document.getElementById('editVCat').value, brand: document.getElementById('editVBrand').value, model: document.getElementById('editVModel').value, trim: document.getElementById('editVTrim').value, year: document.getElementById('editVYear').value, condition: document.getElementById('editVCond').value, trans: document.getElementById('editVTrans').value, fuel: document.getElementById('editVFuel').value, price: document.getElementById('editVPrice').value, mileage: document.getElementById('editVMileage').value, body: document.getElementById('editVBody').value, engine: document.getElementById('editVEngine').value, book: document.getElementById('editVBook').value, finance: document.getElementById('editVFinance').value, desc: document.getElementById('editVDesc').value, youtube: ytId
                });
                ui.toast("Updated"); document.getElementById('editVehicleModal').classList.add('hidden'); app.loadMyData('vehicles', 'myVehiclesList');
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

        // WEBSITE BUILDER (AUTO MODE)
        document.getElementById('btnUnlockWebsite').onclick = async () => {
            const name = document.getElementById('initSaleName').value.trim(); if(!name) return ui.toast("Enter a name", "error");
            const userDoc = await db.collection('users').doc(state.user.uid).get();
            if(!userDoc.data().city) return ui.toast("Update City in Profile first!", "error");
            const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${userDoc.data().city.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            
            // Auto-Save the name and slug immediately
            await db.collection('sites').doc(state.user.uid).set({
                saleName: name, slug: slug, role: state.role, city: userDoc.data().city
            }, {merge: true});

            document.getElementById('webName').value = name;
            document.getElementById('websiteLockScreen').classList.add('hidden'); document.getElementById('websiteEditor').classList.remove('hidden');
            document.getElementById('mySiteLink').innerText = `${window.location.origin}${window.location.pathname}#/${slug}`;
            document.getElementById('mySiteLink').href = `${window.location.origin}${window.location.pathname}#/${slug}`;
        };

        document.getElementById('saveWebsite').onclick = async () => {
            ui.showLoader(true);
            try {
                // Update just the name if changed, slug remains same to avoid breaking links
                await db.collection('sites').doc(state.user.uid).update({ saleName: document.getElementById('webName').value });
                ui.toast("Updated!");
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

        // SOCIAL LOCK & FEED
        document.getElementById('btnUnlockSocial').onclick = async () => {
            const name = document.getElementById('socialRealName').value; const file = document.getElementById('socialRealPhoto').files[0];
            if(!name || !file) return ui.toast("Real Name and Photo Required", "error");
            ui.showLoader(true);
            try {
                const blob = await compressImage(file); const ref = storage.ref(`social/${state.user.uid}`); await ref.put(blob); const url = await ref.getDownloadURL();
                await db.collection('users').doc(state.user.uid).update({ socialName: name, socialPhoto: url });
                app.loadConnectSection();
            } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
        };

        document.getElementById('formPostFeed').onsubmit = async (e) => {
            e.preventDefault(); ui.showLoader(true);
            try {
                let imgUrl = null; const file = document.getElementById('feedImage').files[0];
                if(file) { const blob = await compressImage(file); const ref = storage.ref(`posts/${Date.now()}`); await ref.put(blob); imgUrl = await ref.getDownloadURL(); }
                const userDoc = await db.collection('users').doc(state.user.uid).get();
                await db.collection('posts').add({ uid: state.user.uid, author: userDoc.data().socialName, avatar: userDoc.data().socialPhoto, text: document.getElementById('feedText').value, image: imgUrl, createdAt: firebase.firestore.FieldValue.serverTimestamp(), role: state.role });
                document.getElementById('formPostFeed').reset(); ui.toast("Posted!"); app.loadFeed();
            } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
        };

        // INTERNAL MESSAGING
        document.getElementById('chatForm').onsubmit = async (e) => {
            e.preventDefault();
            const targetUid = document.getElementById('chatTargetUid').value;
            const msg = document.getElementById('chatMessage').value;
            if(!msg) return;
            const chatId = [state.user.uid, targetUid].sort().join('_');
            await db.collection('chats').doc(chatId).collection('messages').add({
                text: msg, sender: state.user.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('chatMessage').value = '';
        };

        // PROMOTE & ADMIN ADS
        document.getElementById('btnSubmitAd').onclick = async () => { /* ... same as before ... */ };
    },

    renderPhotoStaging: () => { const box = document.getElementById('vPhotoStaging'); box.innerHTML = ''; state.vehicleImages.forEach((file, index) => { box.innerHTML += `<div class="img-stage-item"><img src="${URL.createObjectURL(file)}"><div class="img-remove-btn" onclick="app.removeStagedPhoto(${index})">x</div></div>`; }); },
    removeStagedPhoto: (index) => { state.vehicleImages.splice(index, 1); app.renderPhotoStaging(); },

    loadProfile: async () => {
        const doc = await db.collection('users').doc(state.user.uid).get();
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('profPhone').value = d.phone || ''; document.getElementById('profWhatsapp').value = d.whatsapp || ''; document.getElementById('profAddress').value = d.address || ''; document.getElementById('profCity').value = d.city || '';
            if(state.profileComplete) {
                document.getElementById('profFields').disabled = true;
                document.getElementById('profileNotice').classList.add('hidden'); // REMOVE NOTICE
                document.getElementById('saveProfile').classList.add('hidden');
                document.getElementById('editProfileBtn').classList.remove('hidden');
                if(d.photo) document.getElementById('dashAvatar').innerHTML = `<img src="${d.photo}">`;
            }
        }
    },

    loadMyData: async (collection, listId) => {
        const list = document.getElementById(listId); list.innerHTML = 'Loading...';
        const snap = await db.collection(collection).where('uid', '==', state.user.uid).get();
        state.inventory = []; snap.forEach(doc => state.inventory.push({id: doc.id, ...doc.data()}));
        app.renderVehicleList(state.inventory);
    },

    renderVehicleList: (items) => {
        const list = document.getElementById('myVehiclesList'); list.innerHTML = '';
        const tipBox = document.getElementById('inventoryTip');
        
        // Dynamic Tip Logic
        const hasHidden = items.some(i => i.published === false);
        const hasPublished = items.some(i => i.published === true);
        
        if(hasPublished) {
            tipBox.innerHTML = `<i class="fa-solid fa-lightbulb text-primary"></i> <strong>Tip:</strong> Use the "Hide" button to remove vehicles from your page without deleting them.`;
        } else if(hasHidden) {
            tipBox.innerHTML = `<i class="fa-solid fa-lightbulb text-primary"></i> <strong>Tip:</strong> Use the "Show" button to display your vehicle on your page again.`;
        } else {
            tipBox.innerHTML = '';
        }

        if(items.length === 0) { list.innerHTML = '<p>No items found.</p>'; return; }
        items.forEach(d => {
            const badge = d.published ? '<span class="status-indicator status-published">Published</span>' : '<span class="status-indicator status-hidden">Hidden</span>';
            const img = d.images && d.images.length ? d.images[0] : 'https://via.placeholder.com/300';
            list.innerHTML += `<div class="v-card">${badge}<img src="${img}"><div class="v-info"><h4>${d.brand} ${d.model}</h4><p class="v-price">Rs. ${d.price}</p><div class="v-actions"><button class="btn btn-primary btn-sm" onclick="app.openEditModal('${d.id}')">Edit</button><button class="btn btn-outline btn-sm" onclick="app.togglePublish('vehicles', '${d.id}', ${d.published})">${d.published ? 'Hide' : 'Show'}</button><button class="btn btn-danger btn-sm" onclick="app.deleteItem('vehicles', '${d.id}')">Delete</button></div></div></div>`;
        });
    },

    searchVehicles: () => {
        const term = document.getElementById('searchV').value.toLowerCase();
        const filtered = state.inventory.filter(v => (v.brand && v.brand.toLowerCase().includes(term)) || (v.model && v.model.toLowerCase().includes(term)));
        app.renderVehicleList(filtered);
    },

    openEditModal: async (id) => { /* Same as before */ },
    togglePublish: async (col, id, status) => { ui.showLoader(true); await db.collection(col).doc(id).update({published: !status}); app.loadMyData(col, 'myVehiclesList'); ui.showLoader(false); },
    deleteItem: async (col, id) => { if(!confirm("Are you sure?")) return; ui.showLoader(true); await db.collection(col).doc(id).delete(); app.loadMyData(col, 'myVehiclesList'); ui.showLoader(false); },

    loadWebsiteSettings: async () => {
        const doc = await db.collection('sites').doc(state.user.uid).get();
        if(doc.exists && doc.data().slug) {
            const d = doc.data();
            document.getElementById('websiteLockScreen').classList.add('hidden');
            document.getElementById('websiteEditor').classList.remove('hidden');
            document.getElementById('webName').value = d.saleName;
            const link = `${window.location.origin}${window.location.pathname}#/${d.slug}`;
            document.getElementById('mySiteLink').innerText = link;
            document.getElementById('mySiteLink').href = link;
        } else {
            document.getElementById('websiteLockScreen').classList.remove('hidden');
            document.getElementById('websiteEditor').classList.add('hidden');
        }
    },
    
    // DIRECTORY
    loadDirectory: async () => {
        const grid = document.getElementById('sellersGrid'); grid.innerHTML = 'Loading...';
        const snap = await db.collection('sites').orderBy('saleName').limit(50).get();
        state.allSites = []; snap.forEach(doc => { const d = doc.data(); if(d.saleName && d.slug) state.allSites.push({id: doc.id, ...d}); });
        app.filterConnect();
    },
    connectFilter: (role) => { app.currentConnectRole = role; app.filterConnect(); },
    filterConnect: () => { /* Same as before */ },

    // CONNECT SECTION
    loadConnectSection: async () => {
        const doc = await db.collection('users').doc(state.user.uid).get();
        if(!doc.data().socialName) {
            document.getElementById('socialLockScreen').classList.remove('hidden');
            document.getElementById('socialFeedArea').classList.add('hidden');
        } else {
            document.getElementById('socialLockScreen').classList.add('hidden');
            document.getElementById('socialFeedArea').classList.remove('hidden');
            app.loadFeed();
        }
    },
    
    showPeople: async () => {
        document.getElementById('feedStream').classList.add('hidden'); document.getElementById('postCreator').classList.add('hidden');
        const grid = document.getElementById('peopleStream'); grid.classList.remove('hidden'); grid.innerHTML = 'Loading...';
        const snap = await db.collection('users').where('socialName', '!=', null).limit(20).get();
        grid.innerHTML = '';
        snap.forEach(doc => {
            const u = doc.data();
            if(u.role === 'buyer' || doc.id === state.user.uid) return;
            const link = `${window.location.origin}${window.location.pathname}#/${u.city ? u.city : ''}`; // simplified link logic
            grid.innerHTML += `<div class="biz-card" style="padding:10px;text-align:center;"><div class="online-dot" style="position:absolute;top:10px;right:10px;"></div><img src="${u.socialPhoto}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin:0 auto 10px;border:2px solid #2563eb;"><h4>${u.socialName}</h4><button class="btn btn-success btn-sm full-width mt-2" onclick="app.openChat('${doc.id}', '${u.socialName}')">Message</button></div>`;
        });
    },

    openChat: (targetUid, name) => {
        document.getElementById('chatTargetUid').value = targetUid;
        document.getElementById('chatUserName').innerText = name;
        document.getElementById('chatModal').classList.remove('hidden');
        // Load messages logic here (simplified for brevity)
    },

    // ... (Buyer Filter & Admin Ads logic same as before) ...
};

// AUTO MARKET RENDERER
const siteRenderer = {
    loadBySlug: async (slug) => {
        ui.showLoader(true, "Loading Page...");
        try {
            const sitesSnap = await db.collection('sites').where('slug', '==', slug).limit(1).get();
            if(sitesSnap.empty) throw new Error("Page not found");
            const uid = sitesSnap.docs[0].id; const s = sitesSnap.docs[0].data();
            const uDoc = await db.collection('users').doc(uid).get(); const u = uDoc.data();

            document.getElementById('genSiteName').innerText = s.saleName;
            document.getElementById('genSiteCity').innerText = u.city || 'Sri Lanka';
            document.getElementById('genHeroTitle').innerText = s.saleName;
            document.getElementById('genHeroSub').innerText = "Buy · Sell · Trade";
            document.getElementById('genContactAddress').innerText = u.address;
            document.getElementById('genContactPhone').innerText = u.phone;
            
            if(u.whatsapp) { document.getElementById('floatWhatsapp').href = `https://wa.me/${u.whatsapp.replace('+','')}`; document.getElementById('floatWhatsapp').classList.remove('hidden'); }

            const items = await db.collection('vehicles').where('uid', '==', uid).where('published', '==', true).get();
            const grid = document.getElementById('genGrid'); grid.innerHTML = '';
            items.forEach(doc => {
                const d = doc.data();
                const card = document.createElement('div'); card.className = 'vehicle-card';
                card.onclick = () => siteRenderer.openDetailModal(d, u.whatsapp);
                card.innerHTML = `<img src="${d.images[0]}" loading="lazy"><h4>${d.brand} ${d.model}</h4><p>Rs. ${d.price}</p><p style="font-size:0.8rem; color:#888;">${d.mileage} km</p>`;
                grid.appendChild(card);
            });
        } catch(e) { document.body.innerHTML = `<h1>${e.message}</h1>`; }
        ui.showLoader(false);
    },
    openDetailModal: (d, waNumber) => { /* Same as before */ },
    moveSlide: (dir) => { /* Same as before */ },
    openLightbox: (src) => { document.getElementById('lightboxImg').src = src; document.getElementById('lightboxModal').classList.remove('hidden'); }
};

document.addEventListener('DOMContentLoaded', app.init);
