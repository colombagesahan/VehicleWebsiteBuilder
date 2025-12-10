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
        // PROFILE LOCK
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
                    
                    if(user.email === 'admin@vehiclebuilder.com') document.getElementById('navAdmin')?.classList.remove('hidden'); 
                    
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
                const data = { saleName: document.getElementById('webName').value, slug: slug, role: state.role, city: userDoc.data().city, about: document.getElementById('webAbout').value, why: document.getElementById('webWhy').value, fb: document.getElementById('webFb').value, navStyle: document.getElementById('webNavStyle').value };
                const logoFile = document.getElementById('webLogo').files[0]; if(logoFile) { const blob = await compressImage(logoFile); const ref = storage.ref(`sites/${state.user.uid}/logo`); await ref.put(blob); data.logo = await ref.getDownloadURL(); }
                await db.collection('sites').doc(state.user.uid).set(data, {merge: true}); ui.toast("Published!");
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

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

        // MESSAGE LIMIT CHECK
        document.getElementById('btnSendMsg').onclick = () => {
            const today = new Date().toDateString();
            const count = parseInt(localStorage.getItem(`msg_count_${today}`)) || 0;
            if(count >= 10) return ui.toast("Daily limit of 10 messages reached.", "error");
            
            const targetPhone = document.getElementById('msgTargetPhone').value;
            const text = document.getElementById('msgText').value;
            const url = `https://wa.me/${targetPhone.replace('+','')}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
            localStorage.setItem(`msg_count_${today}`, count + 1);
            document.getElementById('msgCountDisplay').innerText = 10 - (count + 1);
            document.getElementById('msgModal').classList.add('hidden');
        };

        document.getElementById('btnSubmitAd').onclick = async () => {
            const file = document.getElementById('adImage').files[0]; const receipt = document.getElementById('adReceipt').files[0];
            const url = document.getElementById('adUrl').value;
            if(!file || !receipt || !url) return ui.toast("All fields required", "error");
            ui.showLoader(true);
            try {
                const imgBlob = await compressImage(file); const recBlob = await compressImage(receipt);
                const imgRef = storage.ref(`ads/${state.user.uid}_img`); await imgRef.put(imgBlob);
                const recRef = storage.ref(`ads/${state.user.uid}_rec`); await recRef.put(recBlob);
                await db.collection('ads').add({ uid: state.user.uid, image: await imgRef.getDownloadURL(), receipt: await recRef.getDownloadURL(), url: url, target: document.getElementById('adTarget').value, status: 'pending', clicks: 0, createdAt: new Date() });
                ui.toast("Ad Submitted for Review!"); app.loadMyAds();
            } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
        };
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
                document.getElementById('profileNotice').classList.add('hidden');
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

    openEditModal: async (id) => {
        const doc = await db.collection('vehicles').doc(id).get(); const d = doc.data();
        document.getElementById('editVId').value = id;
        document.getElementById('editVCat').value = d.category; document.getElementById('editVBrand').value = d.brand; document.getElementById('editVModel').value = d.model; document.getElementById('editVTrim').value = d.trim || ''; document.getElementById('editVYear').value = d.year; document.getElementById('editVCond').value = d.condition || ''; document.getElementById('editVTrans').value = d.trans; document.getElementById('editVFuel').value = d.fuel; document.getElementById('editVPrice').value = d.price; document.getElementById('editVMileage').value = d.mileage; document.getElementById('editVBody').value = d.body || ''; document.getElementById('editVEngine').value = d.engine || ''; document.getElementById('editVBook').value = d.book || 'Original Book'; document.getElementById('editVFinance').value = d.finance || 'no'; document.getElementById('editVDesc').value = d.desc; document.getElementById('editVYoutube').value = d.youtube ? `https://youtu.be/${d.youtube}` : '';
        document.getElementById('editVehicleModal').classList.remove('hidden');
    },

    togglePublish: async (col, id, status) => { ui.showLoader(true); await db.collection(col).doc(id).update({published: !status}); app.loadMyData(col, 'myVehiclesList'); ui.showLoader(false); },
    deleteItem: async (col, id) => { if(!confirm("Are you sure?")) return; ui.showLoader(true); await db.collection(col).doc(id).delete(); app.loadMyData(col, 'myVehiclesList'); ui.showLoader(false); },
    loadWebsiteSettings: async () => { const doc = await db.collection('sites').doc(state.user.uid).get(); if(doc.exists && doc.data().saleName) { const d = doc.data(); document.getElementById('websiteLockScreen').classList.add('hidden'); document.getElementById('websiteEditor').classList.remove('hidden'); document.getElementById('webName').value = d.saleName; if(d.slug) { const link = `${window.location.origin}${window.location.pathname}#/${d.slug}`; document.getElementById('mySiteLink').innerText = link; document.getElementById('mySiteLink').href = link; } } },
    loadDirectory: async () => { const grid = document.getElementById('sellersGrid'); grid.innerHTML = 'Loading...'; const snap = await db.collection('sites').orderBy('saleName').limit(50).get(); state.allSites = []; snap.forEach(doc => { const d = doc.data(); if(d.saleName && d.slug) state.allSites.push({id: doc.id, ...d}); }); app.filterConnect(); },
    connectFilter: (role) => { app.currentConnectRole = role; app.filterConnect(); },
    filterConnect: () => { const search = document.getElementById('connectSearch').value.toLowerCase(); const city = document.getElementById('connectCity').value.toLowerCase(); let filtered = state.allSites; if(app.currentConnectRole && app.currentConnectRole !== 'all') filtered = filtered.filter(s => s.role === app.currentConnectRole); if(search) filtered = filtered.filter(s => s.saleName.toLowerCase().includes(search)); if(city) filtered = filtered.filter(s => s.city && s.city.toLowerCase().includes(city)); const grid = document.getElementById('sellersGrid'); grid.innerHTML = ''; filtered.forEach(s => { const logo = s.logo || 'https://via.placeholder.com/80'; const link = `${window.location.origin}${window.location.pathname}#/${s.slug}`; grid.innerHTML += `<div class="biz-card"><div class="biz-banner"></div><div class="biz-content"><img src="${logo}" class="biz-logo"><h3>${s.saleName}</h3><div class="biz-meta"><span><i class="fa-solid fa-location-dot"></i> ${s.city||'Sri Lanka'}</span><span class="badge">${s.role}</span></div><div class="biz-actions"><a href="${link}" target="_blank" class="btn btn-primary btn-sm full-width">Visit Page</a></div></div></div>`; }); },
    loadConnectSection: async () => { const doc = await db.collection('users').doc(state.user.uid).get(); if(!doc.data().socialName) { document.getElementById('socialLockScreen').classList.remove('hidden'); document.getElementById('socialFeedArea').classList.add('hidden'); } else { document.getElementById('socialLockScreen').classList.add('hidden'); document.getElementById('socialFeedArea').classList.remove('hidden'); app.loadFeed(); } },
    loadFeed: async () => { const div = document.getElementById('feedStream'); div.innerHTML = '<p class="text-center">Loading updates...</p>'; const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(20).get(); div.innerHTML = ''; snap.forEach(doc => { const p = doc.data(); const date = p.createdAt ? new Date(p.createdAt.toDate()).toLocaleDateString() : ''; const imgHtml = p.image ? `<img src="${p.image}" class="feed-img">` : ''; div.innerHTML += `<div class="feed-card"><div class="feed-header"><img src="${p.avatar}" class="feed-avatar"><div><strong>${p.author}</strong><br><small class="text-secondary">${date}</small></div></div><p>${p.text}</p>${imgHtml}</div>`; }); },
    showFeed: () => { document.getElementById('feedStream').classList.remove('hidden'); document.getElementById('peopleStream').classList.add('hidden'); document.getElementById('postCreator').classList.remove('hidden'); },
    showPeople: async () => {
        document.getElementById('feedStream').classList.add('hidden'); document.getElementById('postCreator').classList.add('hidden');
        const grid = document.getElementById('peopleStream'); grid.classList.remove('hidden'); grid.innerHTML = 'Loading...';
        const snap = await db.collection('users').where('socialName', '!=', null).limit(20).get();
        grid.innerHTML = '';
        snap.forEach(doc => {
            const u = doc.data();
            if(u.role === 'buyer') return; 
            grid.innerHTML += `<div class="biz-card" style="padding:10px;text-align:center;"><img src="${u.socialPhoto}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin:0 auto 10px;border:2px solid #2563eb;"><h4>${u.socialName}</h4><span class="online-dot" style="margin-bottom:10px;"></span> Online<button class="btn btn-success btn-sm full-width" onclick="app.openMsgModal('${u.phone}')">Message</button></div>`;
        });
    },
    openMsgModal: (phone) => { document.getElementById('msgTargetPhone').value = phone; document.getElementById('msgModal').classList.remove('hidden'); },
    loadMyAds: async () => { const div = document.getElementById('myAdsList'); div.innerHTML = 'Loading...'; const snap = await db.collection('ads').where('uid', '==', state.user.uid).get(); div.innerHTML = ''; snap.forEach(doc => { const a = doc.data(); const badge = a.status === 'active' ? '<span class="badge" style="background:green;color:white">Active</span>' : '<span class="badge">Pending</span>'; div.innerHTML += `<div class="card" style="padding:10px;">${badge} <strong>Target: ${a.target}</strong> <br> Clicks: ${a.clicks || 0}</div>`; }); },
    loadAdminAds: async () => { const div = document.getElementById('adminAdList'); div.innerHTML = 'Loading Pending Ads...'; const snap = await db.collection('ads').where('status', '==', 'pending').get(); div.innerHTML = ''; snap.forEach(doc => { const a = doc.data(); div.innerHTML += `<div class="biz-card"><img src="${a.receipt}" style="width:100%;height:150px;object-fit:cover"><div class="biz-content"><p>User: ${a.uid}</p><button class="btn btn-success btn-sm" onclick="app.approveAd('${doc.id}')">Approve</button></div></div>`; }); },
    approveAd: async (id) => { await db.collection('ads').doc(id).update({status: 'active'}); ui.toast("Ad Approved"); app.loadAdminAds(); },
    buyerFilter: async (type) => { /* Same as before */ }
};

const siteRenderer = {
    loadBySlug: async (slug) => {
        ui.showLoader(true, "Building Experience...");
        try {
            const sitesSnap = await db.collection('sites').where('slug', '==', slug).limit(1).get();
            if(sitesSnap.empty) throw new Error("Page not found");
            const uid = sitesSnap.docs[0].id; const s = sitesSnap.docs[0].data();
            const uDoc = await db.collection('users').doc(uid).get(); const u = uDoc.data();

            document.getElementById('genSiteName').innerText = s.saleName; document.getElementById('genSiteCity').innerText = u.city || 'Sri Lanka'; document.getElementById('genHeroTitle').innerText = s.heroTitle || s.saleName; document.getElementById('genHeroSub').innerText = s.heroSub || ''; document.getElementById('genContactAddress').innerText = u.address; document.getElementById('genContactPhone').innerText = u.phone;
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
        const modal = document.getElementById('siteVehicleModal'); const content = document.getElementById('siteModalContent');
        let slides = d.images.map((img, i) => `<img src="${img}" class="slide-img ${i===0?'active':''}" onclick="siteRenderer.openLightbox('${img}')">`).join('');
        let youtubeEmbed = d.youtube ? `<div class="mt-4"><iframe width="100%" height="300" src="https://www.youtube.com/embed/${d.youtube}" frameborder="0" allowfullscreen></iframe></div>` : '';
        content.innerHTML = `<div class="slider-container">${slides}<button class="slider-btn prev-btn" onclick="siteRenderer.moveSlide(-1)">&#10094;</button><button class="slider-btn next-btn" onclick="siteRenderer.moveSlide(1)">&#10095;</button></div><div class="modal-info"><h2>${d.brand} ${d.model} (${d.year})</h2><p class="text-primary font-bold text-lg">Rs. ${d.price}</p><div class="grid-2 mt-4"><p><strong>Mileage:</strong> ${d.mileage} km</p><p><strong>Fuel:</strong> ${d.fuel}</p></div><div class="mt-4 p-4 bg-light rounded" style="color:black;">${d.desc}</div>${youtubeEmbed}<a href="https://wa.me/${waNumber.replace('+','')}?text=Hi, I am interested in ${d.brand} ${d.model}" target="_blank" class="btn btn-success full-width mt-4"><i class="fa-brands fa-whatsapp"></i> Chat Seller</a></div>`;
        modal.classList.remove('hidden'); siteRenderer.currentSlide = 0; siteRenderer.totalSlides = d.images.length;
    },
    moveSlide: (dir) => { const imgs = document.querySelectorAll('.slide-img'); imgs[siteRenderer.currentSlide].style.display = 'none'; siteRenderer.currentSlide = (siteRenderer.currentSlide + dir + siteRenderer.totalSlides) % siteRenderer.totalSlides; imgs[siteRenderer.currentSlide].style.display = 'block'; },
    openLightbox: (src) => { document.getElementById('lightboxImg').src = src; document.getElementById('lightboxModal').classList.remove('hidden'); },
    filterGenGrid: () => { const q = document.getElementById('genSearch').value.toLowerCase(); document.querySelectorAll('#genGrid .vehicle-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? '' : 'none'); }
};

document.addEventListener('DOMContentLoaded', app.init);
