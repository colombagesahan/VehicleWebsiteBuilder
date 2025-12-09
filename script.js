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
    user: null,
    role: null, // seller, parts, service, finance, buyer
    dataList: [], // For search
    categories: ["Car", "SUV", "Van", "Pickup", "Lorry", "Bus", "Motorcycle", "Scooter", "Three-wheeler", "Tractor", "Construction", "Trailer", "RV", "ATV", "Special", "Marine"]
};

// UI HELPERS
window.ui = {
    showLoader: (show, text="Processing...") => {
        const el = document.getElementById('loader');
        if(!el) return;
        document.getElementById('loaderText').innerText = text;
        show ? el.classList.remove('hidden') : el.classList.add('hidden');
    },
    toast: (msg, type='success') => {
        const div = document.createElement('div');
        div.className = `toast ${type}`;
        div.innerText = msg;
        document.getElementById('toastContainer').appendChild(div);
        setTimeout(()=>div.remove(), 4000);
    },
    showView: (id) => {
        document.querySelectorAll('.view').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });
        const target = document.getElementById(id);
        if(target) { target.classList.remove('hidden'); target.classList.add('active'); }
    },
    switchTab: (id) => {
        document.querySelectorAll('.dash-tab').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        
        const tab = document.getElementById(id);
        if(tab) { tab.classList.remove('hidden'); tab.classList.add('active'); }
        
        // Highlight Sidebar Button
        const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick')?.includes(id));
        if(btn) btn.classList.add('active');

        // Load Data based on Tab
        if(state.user) {
            if(id === 'tabMyVehicles') app.loadMyData('vehicles', 'myVehiclesList');
            if(id === 'tabMyParts') app.loadMyData('parts', 'myPartsList');
            if(id === 'tabMyServices') app.loadMyData('services', 'myServicesList');
            if(id === 'tabConnect') app.loadConnect();
            if(id === 'tabProfile') app.loadProfile();
            if(id === 'tabWebsite') app.loadWebsiteSettings();
            if(id === 'tabBuyerBrowse') app.buyerFilter('vehicles');
        }
    },
    closeModal: () => {
        document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
    },
    
    // DYNAMIC SIDEBAR RENDERER
    renderSidebar: (role) => {
        const nav = document.getElementById('dynamicSidebar');
        let html = `<button onclick="ui.switchTab('tabProfile')" class="nav-item active"><i class="fa-solid fa-id-card"></i> Profile</button>`;
        
        if(role === 'seller') {
            html += `<button onclick="ui.switchTab('tabAddVehicle')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Vehicle</button>
                     <button onclick="ui.switchTab('tabMyVehicles')" class="nav-item"><i class="fa-solid fa-list"></i> My Vehicles</button>
                     <button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-globe"></i> My Website</button>`;
        } else if(role === 'parts') {
            html += `<button onclick="ui.switchTab('tabAddPart')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Product</button>
                     <button onclick="ui.switchTab('tabMyParts')" class="nav-item"><i class="fa-solid fa-box-open"></i> My Products</button>
                     <button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-globe"></i> My Website</button>`;
        } else if(role === 'service' || role === 'finance') {
            html += `<button onclick="ui.switchTab('tabAddService')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Service</button>
                     <button onclick="ui.switchTab('tabMyServices')" class="nav-item"><i class="fa-solid fa-list-check"></i> My Services</button>
                     <button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-globe"></i> My Website</button>`;
        } else if(role === 'buyer') {
            html += `<button onclick="ui.switchTab('tabBuyerBrowse')" class="nav-item"><i class="fa-solid fa-search"></i> Browse</button>`;
        }
        
        html += `<button onclick="ui.switchTab('tabConnect')" class="nav-item"><i class="fa-solid fa-users"></i> Connect</button>`;
        nav.innerHTML = html;
        document.getElementById('dashRole').innerText = role ? role.toUpperCase() : 'USER';
    }
};

const compressImage = async (file) => {
    if (file.size <= 1024 * 1024) return file;
    return new Promise((resolve) => {
        const img = new Image(); img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 1200 / img.width);
            canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8)));
        };
    });
};

const app = {
    init: () => {
        const sel = document.getElementById('vCat');
        if(sel && sel.options.length === 0) state.categories.forEach(c => sel.appendChild(new Option(c, c)));

        auth.onAuthStateChanged(async user => {
            document.getElementById('initLoader').classList.add('hidden');
            if (user) {
                state.user = user;
                // Fetch Role
                const doc = await db.collection('users').doc(user.uid).get();
                if(doc.exists) {
                    state.role = doc.data().role || 'seller'; // Default if undefined
                    ui.renderSidebar(state.role);
                    document.getElementById('dashEmail').innerText = user.email;
                    ui.showView('viewDashboard');
                    document.getElementById('btnLoginNav').classList.add('hidden');
                    document.getElementById('btnLogoutNav').classList.remove('hidden');
                    
                    if(state.role === 'buyer') ui.switchTab('tabBuyerBrowse');
                    else ui.switchTab('tabProfile');
                } else {
                    // Fallback if user exists in Auth but not DB (rare)
                    state.role = 'seller';
                    ui.renderSidebar('seller');
                    ui.showView('viewDashboard');
                }
            } else {
                ui.showView('viewLanding');
                document.getElementById('btnLoginNav').classList.remove('hidden');
                document.getElementById('btnLogoutNav').classList.add('hidden');
            }
        });

        app.setupEvents();
        
        // URL Param for Role (from home.html)
        const params = new URLSearchParams(window.location.search);
        const urlRole = params.get('role');
        if(urlRole) {
            document.getElementById('landingTitle').innerText = `Join as ${urlRole.toUpperCase()}`;
            ui.showView('viewAuth');
        }
        
        // Generated Site Mode
        const sellerId = params.get('seller');
        if(sellerId) {
            document.getElementById('initLoader').classList.add('hidden');
            document.getElementById('platformApp').classList.add('hidden');
            document.getElementById('generatedSite').classList.remove('hidden');
            siteRenderer.load(sellerId);
        }
    },

    setupEvents: () => {
        document.getElementById('btnLoginNav').onclick = () => ui.showView('viewAuth');
        document.getElementById('btnLogoutNav').onclick = () => auth.signOut();

        document.getElementById('btnLogin').onclick = async () => {
            try {
                ui.showLoader(true);
                await auth.signInWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value);
                ui.showLoader(false);
            } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); }
        };

        document.getElementById('btnSignup').onclick = async () => {
            const params = new URLSearchParams(window.location.search);
            const role = params.get('role') || 'seller'; // Default
            try {
                ui.showLoader(true);
                const cred = await auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value);
                // Save Role
                await db.collection('users').doc(cred.user.uid).set({ email: cred.user.email, role: role, createdAt: new Date() });
                ui.showLoader(false);
                ui.toast("Account Created!");
                window.location.href = window.location.pathname; // Refresh
            } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); }
        };

        // PROFILE
        document.getElementById('saveProfile').onclick = async () => {
            const phone = document.getElementById('profPhone').value;
            const wa = document.getElementById('profWhatsapp').value;
            const addr = document.getElementById('profAddress').value;
            if(!phone || !wa || !addr) return ui.toast("All fields required", "error");

            ui.showLoader(true, "Saving...");
            try {
                let photoUrl = null;
                const file = document.getElementById('profPhoto').files[0];
                if(file) {
                    const blob = await compressImage(file);
                    const ref = storage.ref(`profiles/${state.user.uid}`);
                    await ref.put(blob);
                    photoUrl = await ref.getDownloadURL();
                }
                const data = { phone, whatsapp: wa, address: addr };
                if(photoUrl) data.photo = photoUrl;
                await db.collection('users').doc(state.user.uid).set(data, {merge: true});
                ui.toast("Saved!");
            } catch(e) {
                ui.toast(e.message, 'error');
            } finally {
                ui.showLoader(false);
            }
        };

        // GENERIC ADD HANDLER (FIXED WITH TRY/CATCH)
        const handleAdd = (formId, collection, prefix) => {
            document.getElementById(formId).onsubmit = async (e) => {
                e.preventDefault();
                ui.showLoader(true);
                try {
                    const files = document.getElementById(`${prefix}Photos`).files;
                    const imgUrls = [];
                    for(let i=0; i<Math.min(files.length, 10); i++) {
                        const blob = await compressImage(files[i]);
                        const ref = storage.ref(`${collection}/${state.user.uid}/${Date.now()}_${i}`);
                        await ref.put(blob);
                        imgUrls.push(await ref.getDownloadURL());
                    }

                    const data = {
                        uid: state.user.uid,
                        images: imgUrls,
                        published: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    // Collect all inputs with this prefix
                    document.querySelectorAll(`#${formId} input:not([type=file]), #${formId} select, #${formId} textarea`).forEach(input => {
                        data[input.id.replace(prefix, '').toLowerCase()] = input.value;
                    });

                    await db.collection(collection).add(data);
                    document.getElementById(formId).reset();
                    ui.toast("Published successfully!");
                } catch(err) {
                    console.error(err);
                    ui.toast(err.message, "error");
                } finally {
                    ui.showLoader(false);
                }
            };
        };

        // Init handlers
        handleAdd('formAddVehicle', 'vehicles', 'v');
        handleAdd('formAddPart', 'parts', 'p');
        handleAdd('formAddService', 'services', 's');

        // WEBSITE BUILDER
        document.getElementById('btnUnlockWebsite').onclick = () => {
            const name = document.getElementById('initSaleName').value;
            if(!name) return;
            document.getElementById('webName').value = name;
            document.getElementById('websiteLockScreen').classList.add('hidden');
            document.getElementById('websiteEditor').classList.remove('hidden');
        };

        document.getElementById('saveWebsite').onclick = async () => {
            ui.showLoader(true);
            try {
                const data = {
                    saleName: document.getElementById('webName').value,
                    heroTitle: document.getElementById('webHeroTitle').value,
                    heroSub: document.getElementById('webHeroSub').value,
                    about: document.getElementById('webAbout').value,
                    why: document.getElementById('webWhy').value,
                    fb: document.getElementById('webFb').value,
                    navStyle: document.getElementById('webNavStyle').value
                };
                await db.collection('sites').doc(state.user.uid).set(data, {merge: true});
                ui.toast("Website Published!");
            } catch(e) {
                ui.toast(e.message, 'error');
            } finally {
                ui.showLoader(false);
            }
        };
    },

    loadProfile: async () => {
        const doc = await db.collection('users').doc(state.user.uid).get();
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('profPhone').value = d.phone || '';
            document.getElementById('profWhatsapp').value = d.whatsapp || '';
            document.getElementById('profAddress').value = d.address || '';
        }
    },

    loadMyData: async (collection, listId) => {
        const list = document.getElementById(listId);
        list.innerHTML = 'Loading...';
        const snap = await db.collection(collection).where('uid', '==', state.user.uid).get();
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const el = document.createElement('div');
            el.className = 'v-card';
            // Determine Title (Vehicle vs Part vs Service)
            let title = '';
            if(d.brand) title = `${d.brand} ${d.model || ''}`;
            else if(d.name) title = d.name;
            
            const badge = d.published ? '<span class="status-indicator status-published">Published</span>' : '<span class="status-indicator status-hidden">Hidden</span>';
            const img = d.images && d.images.length ? d.images[0] : 'https://via.placeholder.com/300';

            el.innerHTML = `
                ${badge}
                <img src="${img}" loading="lazy">
                <div class="v-info">
                    <h4>${title}</h4>
                    <p class="v-price">Rs. ${d.price || 'N/A'}</p>
                    <div class="v-actions" style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                        <button class="btn btn-outline btn-sm" onclick="app.togglePublish('${collection}', '${doc.id}', ${d.published})">${d.published ? 'Hide' : 'Show'}</button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteItem('${collection}', '${doc.id}')">Delete</button>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
    },

    togglePublish: async (col, id, status) => {
        ui.showLoader(true);
        try {
            await db.collection(col).doc(id).update({published: !status});
            if(col === 'vehicles') app.loadMyData('vehicles', 'myVehiclesList');
            if(col === 'parts') app.loadMyData('parts', 'myPartsList');
            if(col === 'services') app.loadMyData('services', 'myServicesList');
        } catch(e) {
            ui.toast(e.message, 'error');
        } finally {
            ui.showLoader(false);
        }
    },

    deleteItem: async (col, id) => {
        if(!confirm("Delete this item?")) return;
        ui.showLoader(true);
        try {
            await db.collection(col).doc(id).delete();
            if(col === 'vehicles') app.loadMyData('vehicles', 'myVehiclesList');
            if(col === 'parts') app.loadMyData('parts', 'myPartsList');
            if(col === 'services') app.loadMyData('services', 'myServicesList');
        } catch(e) {
            ui.toast(e.message, 'error');
        } finally {
            ui.showLoader(false);
        }
    },

    loadWebsiteSettings: async () => {
        const url = `${window.location.origin}${window.location.pathname}?seller=${state.user.uid}`;
        document.getElementById('mySiteLink').href = url;
        const doc = await db.collection('sites').doc(state.user.uid).get();
        if(doc.exists && doc.data().saleName) {
            const d = doc.data();
            document.getElementById('websiteLockScreen').classList.add('hidden');
            document.getElementById('websiteEditor').classList.remove('hidden');
            document.getElementById('webName').value = d.saleName;
            document.getElementById('webHeroTitle').value = d.heroTitle || '';
            document.getElementById('webAbout').value = d.about || '';
        }
    },
    
    loadConnect: async () => {
        const grid = document.getElementById('sellersGrid');
        grid.innerHTML = 'Loading...';
        const snap = await db.collection('sites').get();
        grid.innerHTML = '';
        snap.forEach(doc => {
            const s = doc.data();
            if(s.saleName) {
                grid.innerHTML += `<div class="card"><h3>${s.saleName}</h3><button class="btn btn-outline full-width mt-2" onclick="window.open('?seller=${doc.id}','_blank')">Visit</button></div>`;
            }
        });
    },

    // BUYER BROWSE
    buyerFilter: async (type) => {
        const grid = document.getElementById('buyerGrid');
        grid.innerHTML = 'Loading...';
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        
        let collection = type; 
        if(type === 'finance') collection = 'services'; 

        const snap = await db.collection(collection).where('published', '==', true).limit(50).get();
        grid.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            let title = d.brand ? `${d.brand} ${d.model}` : (d.name || 'Item');
            const img = d.images && d.images.length ? d.images[0] : 'https://via.placeholder.com/300';
            
            grid.innerHTML += `
                <div class="v-card" onclick="window.open('?seller=${d.uid}', '_blank')">
                    <img src="${img}" loading="lazy">
                    <div class="v-info"><h4>${title}</h4><p class="v-price">Rs. ${d.price || ''}</p></div>
                </div>`;
        });
    }
};

// GENERATED SITE RENDERER
const siteRenderer = {
    load: async (uid) => {
        ui.showLoader(true, "Loading Site...");
        try {
            const [site, user] = await Promise.all([
                db.collection('sites').doc(uid).get(),
                db.collection('users').doc(uid).get()
            ]);
            if(!site.exists) throw new Error("Site not found");
            const s = site.data(); const u = user.data();
            
            document.getElementById('genHeroTitle').innerText = s.heroTitle || s.saleName;
            document.getElementById('genContactInfo').innerHTML = `<p>${u.phone}</p><p>${u.address}</p>`;
            
            // Determine Collection
            let col = 'vehicles';
            if(u.role === 'parts') col = 'parts';
            if(u.role === 'service' || u.role === 'finance') col = 'services';
            
            const items = await db.collection(col).where('uid', '==', uid).where('published', '==', true).get();
            const grid = document.getElementById('genGrid');
            items.forEach(doc => {
                const d = doc.data();
                const title = d.brand ? `${d.brand} ${d.model}` : (d.name || d.title);
                grid.innerHTML += `<div class="v-card"><img src="${d.images[0]}"><div class="v-info"><h4>${title}</h4><p class="v-price">Rs. ${d.price}</p></div></div>`;
            });
            
        } catch(e) { document.body.innerHTML = `<h1>${e.message}</h1>`; }
        ui.showLoader(false);
    }
};

document.addEventListener('DOMContentLoaded', app.init);
