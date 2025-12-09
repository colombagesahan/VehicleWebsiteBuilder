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
    role: null, 
    categories: ["Car", "SUV", "Van", "Pickup", "Lorry", "Bus", "Motorcycle", "Scooter", "Three-wheeler", "Tractor", "Construction", "Trailer", "RV", "ATV", "Special", "Marine"],
    allSites: [] // Store for Connect filtering
};

// UI Helpers
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
        
        const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick')?.includes(id));
        if(btn) btn.classList.add('active');

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
    closeModal: () => document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden')),
    
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
        // HASH STRATEGY CHECK
        if(window.location.hash.startsWith('#/')) {
            const slug = window.location.hash.substring(2); // Remove #/
            document.getElementById('initLoader').classList.add('hidden');
            document.getElementById('platformApp').classList.add('hidden');
            document.getElementById('generatedSite').classList.remove('hidden');
            siteRenderer.loadBySlug(slug);
            return;
        }

        const sel = document.getElementById('vCat');
        if(sel && sel.options.length === 0) state.categories.forEach(c => sel.appendChild(new Option(c, c)));

        auth.onAuthStateChanged(async user => {
            document.getElementById('initLoader').classList.add('hidden');
            if (user) {
                state.user = user;
                const doc = await db.collection('users').doc(user.uid).get();
                if(doc.exists) {
                    state.role = doc.data().role || 'seller';
                    ui.renderSidebar(state.role);
                    document.getElementById('dashEmail').innerText = user.email;
                    ui.showView('viewDashboard');
                    document.getElementById('btnLoginNav').classList.add('hidden');
                    document.getElementById('btnLogoutNav').classList.remove('hidden');
                    
                    if(state.role === 'buyer') ui.switchTab('tabBuyerBrowse');
                    else ui.switchTab('tabProfile');
                }
            } else {
                ui.showView('viewLanding');
                document.getElementById('btnLoginNav').classList.remove('hidden');
                document.getElementById('btnLogoutNav').classList.add('hidden');
            }
        });

        app.setupEvents();
        
        const params = new URLSearchParams(window.location.search);
        const urlRole = params.get('role');
        if(urlRole) {
            document.getElementById('landingTitle').innerText = `Join as ${urlRole.toUpperCase()}`;
            ui.showView('viewAuth');
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
            const role = params.get('role') || 'seller';
            try {
                ui.showLoader(true);
                const cred = await auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value);
                await db.collection('users').doc(cred.user.uid).set({ email: cred.user.email, role: role, createdAt: new Date() });
                ui.showLoader(false);
                ui.toast("Account Created!");
                window.location.href = window.location.pathname; 
            } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); }
        };

        // SAVE PROFILE (WITH CITY)
        document.getElementById('saveProfile').onclick = async () => {
            const phone = document.getElementById('profPhone').value;
            const wa = document.getElementById('profWhatsapp').value;
            const city = document.getElementById('profCity').value;
            const addr = document.getElementById('profAddress').value;
            
            if(!phone || !wa || !addr || !city) return ui.toast("All fields (including City) required", "error");

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
                const data = { phone, whatsapp: wa, address: addr, city: city };
                if(photoUrl) data.photo = photoUrl;
                await db.collection('users').doc(state.user.uid).set(data, {merge: true});
                ui.toast("Profile Saved!");
            } catch(e) { ui.toast(e.message, 'error'); } 
            finally { ui.showLoader(false); }
        };

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
                    document.querySelectorAll(`#${formId} input:not([type=file]), #${formId} select, #${formId} textarea`).forEach(input => {
                        data[input.id.replace(prefix, '').toLowerCase()] = input.value;
                    });
                    await db.collection(collection).add(data);
                    document.getElementById(formId).reset();
                    ui.toast("Published successfully!");
                } catch(err) { ui.toast(err.message, "error"); } 
                finally { ui.showLoader(false); }
            };
        };

        handleAdd('formAddVehicle', 'vehicles', 'v');
        handleAdd('formAddPart', 'parts', 'p');
        handleAdd('formAddService', 'services', 's');

        // WEBSITE BUILDER (WITH SLUG LOGIC)
        document.getElementById('btnUnlockWebsite').onclick = async () => {
            const name = document.getElementById('initSaleName').value.trim();
            if(!name) return;
            
            // Generate Slug
            const userDoc = await db.collection('users').doc(state.user.uid).get();
            const city = userDoc.data().city || 'srilanka';
            const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
            const slug = `${cleanName}-${cleanCity}`;

            document.getElementById('webName').value = name;
            document.getElementById('websiteLockScreen').classList.add('hidden');
            document.getElementById('websiteEditor').classList.remove('hidden');
            document.getElementById('mySiteLink').innerText = `${window.location.origin}${window.location.pathname}#/${slug}`;
            document.getElementById('mySiteLink').href = `${window.location.origin}${window.location.pathname}#/${slug}`;
        };

        document.getElementById('saveWebsite').onclick = async () => {
            ui.showLoader(true);
            try {
                // Fetch user data again to ensure we have city
                const userDoc = await db.collection('users').doc(state.user.uid).get();
                const city = userDoc.data().city || 'srilanka';
                const name = document.getElementById('webName').value;
                const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
                const slug = `${cleanName}-${cleanCity}`;

                const data = {
                    saleName: name,
                    slug: slug, // Critical for Hash Strategy
                    role: state.role, // Critical for Connect Filtering
                    city: city, // Critical for Connect Filtering
                    heroTitle: document.getElementById('webHeroTitle').value,
                    heroSub: document.getElementById('webHeroSub').value,
                    about: document.getElementById('webAbout').value,
                    why: document.getElementById('webWhy').value,
                    fb: document.getElementById('webFb').value,
                    navStyle: document.getElementById('webNavStyle').value
                };
                
                // Handle Logo/Favicon
                const logoFile = document.getElementById('webLogo').files[0];
                if(logoFile) {
                    const blob = await compressImage(logoFile);
                    const ref = storage.ref(`sites/${state.user.uid}/logo`);
                    await ref.put(blob);
                    data.logo = await ref.getDownloadURL();
                }

                await db.collection('sites').doc(state.user.uid).set(data, {merge: true});
                
                const fullLink = `${window.location.origin}${window.location.pathname}#/${slug}`;
                document.getElementById('mySiteLink').innerText = fullLink;
                document.getElementById('mySiteLink').href = fullLink;
                ui.toast("Website Published!");
            } catch(e) { ui.toast(e.message, 'error'); } 
            finally { ui.showLoader(false); }
        };
        
        // Connect Filters
        document.getElementById('connectSearch').addEventListener('keyup', () => app.filterConnect());
        document.getElementById('connectCity').addEventListener('keyup', () => app.filterConnect());
    },

    loadProfile: async () => {
        const doc = await db.collection('users').doc(state.user.uid).get();
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('profPhone').value = d.phone || '';
            document.getElementById('profWhatsapp').value = d.whatsapp || '';
            document.getElementById('profAddress').value = d.address || '';
            document.getElementById('profCity').value = d.city || '';
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
            let title = d.brand ? `${d.brand} ${d.model}` : (d.name || 'Item');
            const badge = d.published ? '<span class="status-indicator status-published">Published</span>' : '<span class="status-indicator status-hidden">Hidden</span>';
            const img = d.images && d.images.length ? d.images[0] : 'https://via.placeholder.com/300';
            el.innerHTML = `${badge}<img src="${img}"><div class="v-info"><h4>${title}</h4><p class="v-price">Rs. ${d.price || ''}</p><div class="v-actions" style="margin-top:10px;"><button class="btn btn-outline btn-sm" onclick="app.togglePublish('${collection}', '${doc.id}', ${d.published})">${d.published ? 'Hide' : 'Show'}</button><button class="btn btn-danger btn-sm" onclick="app.deleteItem('${collection}', '${doc.id}')">Delete</button></div></div>`;
            list.appendChild(el);
        });
    },

    togglePublish: async (col, id, status) => {
        ui.showLoader(true);
        await db.collection(col).doc(id).update({published: !status});
        if(col === 'vehicles') app.loadMyData('vehicles', 'myVehiclesList');
        if(col === 'parts') app.loadMyData('parts', 'myPartsList');
        if(col === 'services') app.loadMyData('services', 'myServicesList');
        ui.showLoader(false);
    },

    deleteItem: async (col, id) => {
        if(!confirm("Delete?")) return;
        ui.showLoader(true);
        await db.collection(col).doc(id).delete();
        if(col === 'vehicles') app.loadMyData('vehicles', 'myVehiclesList');
        if(col === 'parts') app.loadMyData('parts', 'myPartsList');
        if(col === 'services') app.loadMyData('services', 'myServicesList');
        ui.showLoader(false);
    },

    loadWebsiteSettings: async () => {
        const doc = await db.collection('sites').doc(state.user.uid).get();
        if(doc.exists && doc.data().saleName) {
            const d = doc.data();
            document.getElementById('websiteLockScreen').classList.add('hidden');
            document.getElementById('websiteEditor').classList.remove('hidden');
            document.getElementById('webName').value = d.saleName;
            document.getElementById('webHeroTitle').value = d.heroTitle || '';
            document.getElementById('webAbout').value = d.about || '';
            if(d.slug) {
                const link = `${window.location.origin}${window.location.pathname}#/${d.slug}`;
                document.getElementById('mySiteLink').innerText = link;
                document.getElementById('mySiteLink').href = link;
            }
        }
    },
    
    // CONNECT LOGIC (Advanced)
    loadConnect: async () => {
        const grid = document.getElementById('sellersGrid');
        grid.innerHTML = 'Loading...';
        const snap = await db.collection('sites').limit(50).get();
        state.allSites = [];
        snap.forEach(doc => {
            const d = doc.data();
            if(d.saleName && d.slug) state.allSites.push({id: doc.id, ...d});
        });
        app.filterConnect();
    },

    connectFilter: (role) => {
        document.querySelectorAll('#tabConnect .chip').forEach(c => c.classList.remove('active'));
        app.currentConnectRole = role; // Store state
        app.filterConnect();
    },

    filterConnect: () => {
        const search = document.getElementById('connectSearch').value.toLowerCase();
        const city = document.getElementById('connectCity').value.toLowerCase();
        const grid = document.getElementById('sellersGrid');
        
        let filtered = state.allSites;
        if(app.currentConnectRole && app.currentConnectRole !== 'all') {
            filtered = filtered.filter(s => s.role === app.currentConnectRole);
        }
        if(search) filtered = filtered.filter(s => s.saleName.toLowerCase().includes(search));
        if(city) filtered = filtered.filter(s => s.city && s.city.toLowerCase().includes(city));

        grid.innerHTML = '';
        filtered.forEach(s => {
            const logo = s.logo || 'https://via.placeholder.com/70';
            const link = `${window.location.origin}${window.location.pathname}#/${s.slug}`;
            grid.innerHTML += `
                <div class="biz-card">
                    <div class="biz-banner"></div>
                    <div class="biz-content">
                        <img src="${logo}" class="biz-logo">
                        <h3>${s.saleName}</h3>
                        <div class="biz-meta">
                            <span><i class="fa-solid fa-location-dot"></i> ${s.city || 'Sri Lanka'}</span>
                            <span class="badge">${s.role || 'Seller'}</span>
                        </div>
                        <div class="biz-actions">
                            <a href="${link}" target="_blank" class="btn btn-primary btn-sm full-width">Visit</a>
                            <button class="btn btn-success btn-sm full-width"><i class="fa-brands fa-whatsapp"></i> Chat</button>
                        </div>
                    </div>
                </div>`;
        });
    },

    buyerFilter: async (type) => {
        const grid = document.getElementById('buyerGrid');
        grid.innerHTML = 'Loading...';
        let col = type === 'finance' ? 'services' : type;
        const snap = await db.collection(col).where('published', '==', true).limit(50).get();
        grid.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            let title = d.brand ? `${d.brand} ${d.model}` : (d.name || 'Item');
            grid.innerHTML += `<div class="v-card"><img src="${d.images[0]}"><div class="v-info"><h4>${title}</h4><p class="v-price">Rs. ${d.price}</p></div></div>`;
        });
    }
};

// RENDER PUBLIC SITE VIA SLUG
const siteRenderer = {
    loadBySlug: async (slug) => {
        ui.showLoader(true, "Loading Page...");
        try {
            const sitesSnap = await db.collection('sites').where('slug', '==', slug).limit(1).get();
            if(sitesSnap.empty) throw new Error("Page not found");
            
            const siteDoc = sitesSnap.docs[0];
            const uid = siteDoc.id;
            const s = siteDoc.data();
            
            const userDoc = await db.collection('users').doc(uid).get();
            const u = userDoc.data();

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

        } catch(e) { document.body.innerHTML = `<div style="text-align:center;margin-top:50px;"><h1>404 Not Found</h1></div>`; }
        ui.showLoader(false);
    },
    
    // Legacy support for ?seller=ID
    load: async (uid) => { /* Logic same as above but by ID */ }
};

document.addEventListener('DOMContentLoaded', app.init);
