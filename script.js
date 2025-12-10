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

// UI HELPERS
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
            if(id === 'tabConnect') app.loadFeed();
            if(id === 'tabProfile') app.loadProfile();
            if(id === 'tabWebsite') app.loadWebsiteSettings();
            if(id === 'tabBuyerBrowse') app.buyerFilter('vehicles');
        }
    },
    closeModal: () => document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden')),
    
    resetDashboard: () => {
        // CLEANUP FOR NEW USER
        const safeVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        safeVal('profPhone', ''); safeVal('profWhatsapp', ''); safeVal('profAddress', ''); safeVal('profCity', '');
        document.getElementById('dashAvatar').innerHTML = '<i class="fa-solid fa-user"></i>';
        document.getElementById('dashEmail').innerText = 'User';
        const form = document.getElementById('formAddVehicle'); if(form) form.reset();
        document.getElementById('vPhotoStaging').innerHTML = ''; state.vehicleImages = [];
        document.getElementById('websiteEditor')?.classList.add('hidden');
        document.getElementById('websiteLockScreen')?.classList.remove('hidden');
        state.user = null; state.profileComplete = false;
    },

    renderSidebar: (role) => {
        const nav = document.getElementById('dynamicSidebar');
        let html = `<button onclick="ui.switchTab('tabProfile')" class="nav-item active"><i class="fa-solid fa-id-card"></i> Profile</button>`;
        if(role === 'seller') html += `<button onclick="ui.switchTab('tabAddVehicle')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Vehicle</button><button onclick="ui.switchTab('tabMyVehicles')" class="nav-item"><i class="fa-solid fa-list"></i> My Vehicles</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'parts') html += `<button onclick="ui.switchTab('tabAddPart')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Product</button><button onclick="ui.switchTab('tabMyParts')" class="nav-item"><i class="fa-solid fa-box"></i> My Products</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'service' || role === 'finance') html += `<button onclick="ui.switchTab('tabAddService')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Service</button><button onclick="ui.switchTab('tabMyServices')" class="nav-item"><i class="fa-solid fa-list-check"></i> My Services</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'buyer') html += `<button onclick="ui.switchTab('tabBuyerBrowse')" class="nav-item"><i class="fa-solid fa-search"></i> Browse</button>`;
        
        html += `<button onclick="ui.switchTab('tabDirectory')" class="nav-item"><i class="fa-solid fa-address-book"></i> Directory</button>`;
        html += `<button onclick="ui.switchTab('tabConnect')" class="nav-item"><i class="fa-solid fa-share-nodes"></i> Connect (Feed)</button>`;
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
            if(!phone || !wa || !addr || !city) return ui.toast("All fields required (including City)", "error");
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
                if(photoUrl) document.getElementById('dashAvatar').innerHTML = `<img src="${photoUrl}">`;
                ui.toast("Profile Saved! Dashboard Unlocked.");
                document.getElementById('profPhone').value = phone; document.getElementById('profWhatsapp').value = wa;
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

        // VEHICLE
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

        // FULL EDIT
        document.getElementById('formEditVehicle').onsubmit = async (e) => {
            e.preventDefault(); const id = document.getElementById('editVId').value;
            ui.showLoader(true);
            try {
                await db.collection('vehicles').doc(id).update({
                    category: document.getElementById('editVCat').value, brand: document.getElementById('editVBrand').value, model: document.getElementById('editVModel').value, trim: document.getElementById('editVTrim').value, year: document.getElementById('editVYear').value, condition: document.getElementById('editVCond').value, trans: document.getElementById('editVTrans').value, fuel: document.getElementById('editVFuel').value, price: document.getElementById('editVPrice').value, mileage: document.getElementById('editVMileage').value, body: document.getElementById('editVBody').value, engine: document.getElementById('editVEngine').value, book: document.getElementById('editVBook').value, finance: document.getElementById('editVFinance').value, desc: document.getElementById('editVDesc').value
                });
                ui.toast("Updated"); document.getElementById('editVehicleModal').classList.add('hidden'); app.loadMyData('vehicles', 'myVehiclesList');
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

        // WEBSITE BUILDER
        document.getElementById('btnUnlockWebsite').onclick = async () => {
            const name = document.getElementById('initSaleName').value.trim(); if(!name) return ui.toast("Enter a name", "error");
            const userDoc = await db.collection('users').doc(state.user.uid).get();
            if(!userDoc.data().city) return ui.toast("Update City in Profile first!", "error");
            const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${userDoc.data().city.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            document.getElementById('webName').value = name;
            document.getElementById('websiteLockScreen').classList.add('hidden'); document.getElementById('websiteEditor').classList.remove('hidden');
            document.getElementById('mySiteLink').innerText = `${window.location.origin}${window.location.pathname}#/${slug}`;
            document.getElementById('mySiteLink').href = `${window.location.origin}${window.location.pathname}#/${slug}`;
        };

        document.getElementById('saveWebsite').onclick = async () => {
            ui.showLoader(true);
            try {
                const userDoc = await db.collection('users').doc(state.user.uid).get();
                const slug = `${document.getElementById('webName').value.toLowerCase().replace(/[^a-z0-9]/g, '')}-${userDoc.data().city.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                const data = { saleName: document.getElementById('webName').value, slug: slug, role: state.role, city: userDoc.data().city, about: document.getElementById('webAbout').value, why: document.getElementById('webWhy').value, fb: document.getElementById('webFb').value };
                await db.collection('sites').doc(state.user.uid).set(data, {merge: true}); ui.toast("Published!");
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

        // SOCIAL FEED POST
        document.getElementById('formPostFeed').onsubmit = async (e) => {
            e.preventDefault(); ui.showLoader(true);
            try {
                let imgUrl = null; const file = document.getElementById('feedImage').files[0];
                if(file) { const blob = await compressImage(file); const ref = storage.ref(`posts/${Date.now()}`); await ref.put(blob); imgUrl = await ref.getDownloadURL(); }
                await db.collection('posts').add({
                    uid: state.user.uid, text: document.getElementById('feedText').value, image: imgUrl, createdAt: firebase.firestore.FieldValue.serverTimestamp(), role: state.role
                });
                document.getElementById('formPostFeed').reset(); ui.toast("Posted!"); app.loadFeed();
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };
    },

    renderPhotoStaging: () => {
        const box = document.getElementById('vPhotoStaging'); box.innerHTML = '';
        state.vehicleImages.forEach((file, index) => { box.innerHTML += `<div class="img-stage-item"><img src="${URL.createObjectURL(file)}"><div class="img-remove-btn" onclick="app.removeStagedPhoto(${index})">x</div></div>`; });
    },
    removeStagedPhoto: (index) => { state.vehicleImages.splice(index, 1); app.renderPhotoStaging(); },

    loadProfile: async () => { const doc = await db.collection('users').doc(state.user.uid).get(); if(doc.exists) { const d = doc.data(); document.getElementById('profPhone').value = d.phone || ''; document.getElementById('profWhatsapp').value = d.whatsapp || ''; document.getElementById('profAddress').value = d.address || ''; document.getElementById('profCity').value = d.city || ''; } },

    loadMyData: async (collection, listId) => {
        const list = document.getElementById(listId); list.innerHTML = 'Loading...';
        const snap = await db.collection(collection).where('uid', '==', state.user.uid).get();
        state.inventory = []; snap.forEach(doc => state.inventory.push({id: doc.id, ...doc.data()}));
        app.renderVehicleList(state.inventory);
    },

    renderVehicleList: (items) => {
        const list = document.getElementById('myVehiclesList'); list.innerHTML = '';
        if(items.length === 0) { list.innerHTML = '<p>No items found.</p>'; return; }
        items.forEach(d => {
            const badge = d.published ? '<span class="status-indicator status-published">Published</span>' : '<span class="status-indicator status-hidden">Hidden</span>';
            const img = d.images && d.images.length ? d.images[0] : 'https://via.placeholder.com/300';
            list.innerHTML += `<div class="v-card">${badge}<img src="${img}"><div class="v-info"><h4>${d.brand} ${d.model}</h4><p class="v-price">Rs. ${d.price}</p><div class="v-actions"><button class="btn btn-primary btn-sm" onclick="app.openEditModal('${d.id}')">Edit</button><button class="btn btn-outline btn-sm" onclick="app.togglePublish('vehicles', '${d.id}', ${d.published})">${d.published ? 'Hide' : 'Show'}</button><button class="btn btn-danger btn-sm" onclick="app.deleteItem('vehicles', '${d.id}')">Del</button></div></div></div>`;
        });
    },

    searchVehicles: () => {
        const term = document.getElementById('searchV').value.toLowerCase();
        const filtered = state.inventory.filter(v => (v.brand && v.brand.toLowerCase().includes(term)) || (v.model && v.model.toLowerCase().includes(term)));
        app.renderVehicleList(filtered);
    },

    openEditModal: async (id) => {
        const doc = await db.collection('vehicles').doc(id).get(); const d = doc.data();
        document.getElementById('editVId').value = id;
        document.getElementById('editVCat').value = d.category; document.getElementById('editVBrand').value = d.brand; document.getElementById('editVModel').value = d.model; document.getElementById('editVTrim').value = d.trim || ''; document.getElementById('editVYear').value = d.year; document.getElementById('editVCond').value = d.condition || ''; document.getElementById('editVTrans').value = d.trans; document.getElementById('editVFuel').value = d.fuel; document.getElementById('editVPrice').value = d.price; document.getElementById('editVMileage').value = d.mileage; document.getElementById('editVBody').value = d.body || ''; document.getElementById('editVEngine').value = d.engine || ''; document.getElementById('editVBook').value = d.book || 'Original Book'; document.getElementById('editVFinance').value = d.finance || 'no'; document.getElementById('editVDesc').value = d.desc; document.getElementById('editVYoutube').value = d.youtube ? `https://youtu.be/${d.youtube}` : '';
        document.getElementById('editVehicleModal').classList.remove('hidden');
    },

    togglePublish: async (col, id, status) => { ui.showLoader(true); await db.collection(col).doc(id).update({published: !status}); app.loadMyData(col, 'myVehiclesList'); ui.showLoader(false); },
    deleteItem: async (col, id) => { if(!confirm("Are you sure?")) return; ui.showLoader(true); await db.collection(col).doc(id).delete(); app.loadMyData(col, 'myVehiclesList'); ui.showLoader(false); },

    loadWebsiteSettings: async () => { const doc = await db.collection('sites').doc(state.user.uid).get(); if(doc.exists && doc.data().saleName) { const d = doc.data(); document.getElementById('websiteLockScreen').classList.add('hidden'); document.getElementById('websiteEditor').classList.remove('hidden'); document.getElementById('webName').value = d.saleName; if(d.slug) { const link = `${window.location.origin}${window.location.pathname}#/${d.slug}`; document.getElementById('mySiteLink').innerText = link; document.getElementById('mySiteLink').href = link; } } },
    
    // DIRECTORY
    loadDirectory: async () => {
        const grid = document.getElementById('sellersGrid'); grid.innerHTML = 'Loading...';
        const snap = await db.collection('sites').orderBy('saleName').limit(50).get();
        state.allSites = []; snap.forEach(doc => { const d = doc.data(); if(d.saleName && d.slug) state.allSites.push(d); });
        app.filterConnect();
    },
    connectFilter: (role) => { app.currentConnectRole = role; app.filterConnect(); },
    filterConnect: () => {
        const search = document.getElementById('connectSearch').value.toLowerCase(); const city = document.getElementById('connectCity').value.toLowerCase();
        let filtered = state.allSites;
        if(app.currentConnectRole && app.currentConnectRole !== 'all') filtered = filtered.filter(s => s.role === app.currentConnectRole);
        if(search) filtered = filtered.filter(s => s.saleName.toLowerCase().includes(search));
        if(city) filtered = filtered.filter(s => s.city && s.city.toLowerCase().includes(city));
        
        const grid = document.getElementById('sellersGrid'); grid.innerHTML = '';
        filtered.forEach(s => {
            const logo = s.logo || 'https://via.placeholder.com/80';
            const link = `${window.location.origin}${window.location.pathname}#/${s.slug}`;
            grid.innerHTML += `<div class="biz-card"><div class="biz-banner"></div><div class="biz-content"><img src="${logo}" class="biz-logo"><h3>${s.saleName}</h3><div class="biz-meta"><span><i class="fa-solid fa-location-dot"></i> ${s.city||'Sri Lanka'}</span><span class="badge">${s.role}</span></div><div class="biz-actions"><a href="${link}" target="_blank" class="btn btn-primary btn-sm full-width">Visit Page</a></div></div></div>`;
        });
    },

    // SOCIAL FEED
    loadFeed: async () => {
        const div = document.getElementById('feedStream'); div.innerHTML = '<p class="text-center">Loading updates...</p>';
        const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(20).get();
        div.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            const date = p.createdAt ? new Date(p.createdAt.toDate()).toLocaleDateString() : '';
            const imgHtml = p.image ? `<img src="${p.image}" class="feed-img">` : '';
            div.innerHTML += `<div class="card"><div class="feed-header"><div class="avatar-circle" style="width:40px;height:40px;font-size:1rem;"><i class="fa-solid fa-user"></i></div><div><strong>Seller Update</strong><br><small class="text-secondary">${date}</small></div></div><p>${p.text}</p>${imgHtml}</div>`;
        });
    },

    buyerFilter: async (type) => { /* Same as before */ }
};

// SITE RENDERER (SUPER AUTOMARKET)
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
            document.getElementById('genHeroTitle').innerText = s.heroTitle || s.saleName;
            document.getElementById('genHeroSub').innerText = s.heroSub || '';
            document.getElementById('genContactAddress').innerText = u.address;
            document.getElementById('genContactPhone').innerText = u.phone;
            
            if(u.whatsapp) { document.getElementById('floatWhatsapp').href = `https://wa.me/${u.whatsapp.replace('+','')}`; document.getElementById('floatWhatsapp').classList.remove('hidden'); }

            let col = 'vehicles'; if(u.role === 'parts') col = 'parts'; if(u.role === 'service') col = 'services';
            const items = await db.collection(col).where('uid', '==', uid).where('published', '==', true).get();
            const grid = document.getElementById('genGrid'); grid.innerHTML = '';
            items.forEach(doc => {
                const d = doc.data();
                const card = document.createElement('div'); card.className = 'vehicle-card';
                card.onclick = () => siteRenderer.openDetailModal(d, u.whatsapp);
                card.innerHTML = `<img src="${d.images[0]}" loading="lazy"><h4>${d.brand} ${d.model}</h4><p>Rs. ${d.price}</p>`;
                grid.appendChild(card);
            });
        } catch(e) { document.body.innerHTML = `<h1>${e.message}</h1>`; }
        ui.showLoader(false);
    },

    openDetailModal: (d, waNumber) => {
        const modal = document.getElementById('siteVehicleModal');
        const content = document.getElementById('siteModalContent');
        let slides = d.images.map((img, i) => `<img src="${img}" class="slide-img ${i===0?'active':''}" onclick="siteRenderer.openLightbox('${img}')">`).join('');
        let youtubeEmbed = d.youtube ? `<div class="mt-4"><iframe width="100%" height="300" src="https://www.youtube.com/embed/${d.youtube}" frameborder="0" allowfullscreen></iframe></div>` : '';

        content.innerHTML = `<div class="slider-container">${slides}<button class="slider-btn prev-btn" onclick="siteRenderer.moveSlide(-1)">&#10094;</button><button class="slider-btn next-btn" onclick="siteRenderer.moveSlide(1)">&#10095;</button></div><div class="modal-info"><h2>${d.brand} ${d.model}</h2><p class="text-primary font-bold text-lg">Rs. ${d.price}</p><div class="grid-2 mt-4"><p><strong>Mileage:</strong> ${d.mileage} km</p><p><strong>Fuel:</strong> ${d.fuel}</p></div><div class="mt-4 p-4 bg-light rounded" style="color:black;">${d.desc}</div>${youtubeEmbed}<a href="https://wa.me/${waNumber.replace('+','')}?text=Hi, I am interested in ${d.brand}" target="_blank" class="btn btn-success full-width mt-4"><i class="fa-brands fa-whatsapp"></i> Chat Seller</a></div>`;
        modal.classList.remove('hidden'); siteRenderer.currentSlide = 0; siteRenderer.totalSlides = d.images.length;
    },

    moveSlide: (dir) => {
        const imgs = document.querySelectorAll('.slide-img'); imgs[siteRenderer.currentSlide].style.display = 'none';
        siteRenderer.currentSlide = (siteRenderer.currentSlide + dir + siteRenderer.totalSlides) % siteRenderer.totalSlides;
        imgs[siteRenderer.currentSlide].style.display = 'block';
    },
    openLightbox: (src) => { document.getElementById('lightboxImg').src = src; document.getElementById('lightboxModal').classList.remove('hidden'); }
};

document.addEventListener('DOMContentLoaded', app.init);
