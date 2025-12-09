// ==========================================
// 1. CONFIG & INIT
// ==========================================
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
    isAdmin: false,
    categories: [
        "Car", "SUV / Crossover", "Van", "Pickup", "Lorry / Truck", "Bus / Coach",
        "Motorcycle", "Scooter / Moped", "Three-wheeler", "Tractor / Agricultural",
        "Construction / Heavy equipment", "Trailer", "RV / Camper", 
        "ATV / UTV", "Special-purpose", "Marine"
    ]
};

// UI Helpers
const ui = {
    showLoader: (show, text = "Processing...") => {
        const el = document.getElementById('loader');
        document.getElementById('loaderText').innerText = text;
        show ? el.classList.remove('hidden') : el.classList.add('hidden');
    },
    toast: (msg, type = 'success') => {
        const div = document.createElement('div');
        div.className = `toast ${type}`;
        div.innerText = msg;
        document.getElementById('toastContainer').appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },
    showView: (id) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },
    switchTab: (id) => {
        document.querySelectorAll('.dash-tab').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        
        const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick').includes(id));
        if(btn) btn.classList.add('active');

        if(state.user) {
            if(id === 'tabMyVehicles') app.loadMyVehicles();
            if(id === 'tabConnect') app.loadConnect();
            if(id === 'tabProfile') app.loadProfile();
            if(id === 'tabWebsite') app.loadWebsiteSettings();
        }
    },
    closeModal: () => document.getElementById('modalOverlay').classList.add('hidden'),
    
    // *** CRITICAL FIX: RESET DASHBOARD ***
    resetDashboard: () => {
        console.log("Resetting Dashboard...");
        // Profile
        document.getElementById('profPhone').value = '';
        document.getElementById('profWhatsapp').value = '';
        document.getElementById('profAddress').value = '';
        document.getElementById('dashAvatar').innerHTML = '<i class="fa-solid fa-user"></i>';
        document.getElementById('dashEmail').innerText = 'User';
        
        // Add Vehicle
        document.getElementById('formAddVehicle').reset();
        document.getElementById('vPreview').innerHTML = '';
        
        // Website
        document.getElementById('webName').value = '';
        document.getElementById('webHeroTitle').value = '';
        document.getElementById('webHeroSub').value = '';
        document.getElementById('webAbout').value = '';
        document.getElementById('webWhy').value = '';
        document.getElementById('webFb').value = '';
        document.getElementById('mySiteLink').innerText = 'Generating...';
        
        // Lists
        document.getElementById('myVehiclesList').innerHTML = '';
        
        // State
        state.user = null;
        state.isAdmin = false;
        document.getElementById('navAdmin').classList.add('hidden');
    }
};

const compressImage = async (file) => {
    if (file.size <= 1024 * 1024) return file;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const maxWidth = 1200;
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            let quality = 0.8;
            let blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
            while (blob.size > 100 * 1024 && quality > 0.2) {
                quality -= 0.1;
                blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
            }
            resolve(blob);
        };
        img.onerror = reject;
    });
};

// ==========================================
// 2. MAIN APP LOGIC
// ==========================================
const app = {
    init: () => {
        const sel = document.getElementById('vCat');
        state.categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.innerText = c;
            sel.appendChild(opt);
        });

        // AUTH LISTENER
        auth.onAuthStateChanged(user => {
            if (user) {
                state.user = user;
                document.getElementById('dashEmail').innerText = user.email;
                ui.showView('viewDashboard');
                document.getElementById('btnLoginNav').classList.add('hidden');
                document.getElementById('btnLogoutNav').classList.remove('hidden');
                
                if(user.email === 'admin@vehiclebuilder.com') {
                    state.isAdmin = true;
                    document.getElementById('navAdmin').classList.remove('hidden');
                }
                app.loadProfile(); // Load NEW user data
            } else {
                // LOGOUT DETECTED -> RESET EVERYTHING
                ui.resetDashboard();
                ui.showView('viewLanding');
                document.getElementById('btnLoginNav').classList.remove('hidden');
                document.getElementById('btnLogoutNav').classList.add('hidden');
            }
        });

        app.setupEventListeners();
        
        const params = new URLSearchParams(window.location.search);
        const sellerId = params.get('seller');
        if(sellerId) {
            document.getElementById('platformApp').classList.add('hidden');
            document.getElementById('generatedSite').classList.remove('hidden');
            siteRenderer.load(sellerId);
        }
    },

    setupEventListeners: () => {
        document.getElementById('btnLoginNav').onclick = () => ui.showView('viewAuth');
        document.getElementById('btnLogoutNav').onclick = () => auth.signOut();
        
        document.getElementById('btnLogin').onclick = async () => {
            const e = document.getElementById('authEmail').value;
            const p = document.getElementById('authPass').value;
            try {
                ui.showLoader(true, "Logging in...");
                await auth.signInWithEmailAndPassword(e, p);
                ui.showLoader(false);
            } catch(err) {
                ui.showLoader(false);
                ui.toast(err.message, 'error');
            }
        };

        document.getElementById('btnSignup').onclick = async () => {
            const e = document.getElementById('authEmail').value;
            const p = document.getElementById('authPass').value;
            try {
                ui.showLoader(true, "Creating Account...");
                const cred = await auth.createUserWithEmailAndPassword(e, p);
                await db.collection('users').doc(cred.user.uid).set({
                    email: e, createdAt: new Date()
                });
                ui.showLoader(false);
                ui.toast("Account Created!");
            } catch(err) {
                ui.showLoader(false);
                ui.toast(err.message, 'error');
            }
        };

        document.getElementById('saveProfile').onclick = async () => {
            ui.showLoader(true, "Saving Profile...");
            try {
                let photoUrl = null;
                const file = document.getElementById('profPhoto').files[0];
                if(file) {
                    const blob = await compressImage(file);
                    const ref = storage.ref(`profiles/${state.user.uid}`);
                    await ref.put(blob);
                    photoUrl = await ref.getDownloadURL();
                }
                
                const data = {
                    phone: document.getElementById('profPhone').value,
                    whatsapp: document.getElementById('profWhatsapp').value,
                    address: document.getElementById('profAddress').value
                };
                if(photoUrl) data.photo = photoUrl;

                await db.collection('users').doc(state.user.uid).set(data, {merge: true});
                ui.toast("Profile Saved!");
                if(photoUrl) document.getElementById('dashAvatar').innerHTML = `<img src="${photoUrl}">`;
            } catch(e) { ui.toast(e.message, 'error'); }
            ui.showLoader(false);
        };

        document.getElementById('vPhotos').addEventListener('change', (e) => {
             const box = document.getElementById('vPreview');
             box.innerHTML = '';
             Array.from(e.target.files).slice(0,10).forEach(file => {
                 const img = document.createElement('img');
                 img.src = URL.createObjectURL(file);
                 box.appendChild(img);
             });
        });

        document.getElementById('formAddVehicle').onsubmit = async (e) => {
            e.preventDefault();
            ui.showLoader(true, "Compressing & Uploading...");
            try {
                const files = document.getElementById('vPhotos').files;
                const imgUrls = [];
                for(let i=0; i < Math.min(files.length, 10); i++) {
                    const blob = await compressImage(files[i]);
                    const ref = storage.ref(`vehicles/${state.user.uid}/${Date.now()}_${i}`);
                    await ref.put(blob);
                    imgUrls.push(await ref.getDownloadURL());
                }

                await db.collection('vehicles').add({
                    uid: state.user.uid,
                    category: document.getElementById('vCat').value,
                    brand: document.getElementById('vBrand').value,
                    model: document.getElementById('vModel').value,
                    trim: document.getElementById('vTrim').value,
                    year: document.getElementById('vYear').value,
                    condition: document.getElementById('vCond').value,
                    trans: document.getElementById('vTrans').value,
                    fuel: document.getElementById('vFuel').value,
                    price: document.getElementById('vPrice').value,
                    mileage: document.getElementById('vMileage').value,
                    desc: document.getElementById('vDesc').value,
                    youtube: document.getElementById('vYoutube').value,
                    images: imgUrls,
                    published: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                document.getElementById('formAddVehicle').reset();
                document.getElementById('vPreview').innerHTML = '';
                ui.toast("Vehicle Published!");
                ui.switchTab('tabMyVehicles');
            } catch(err) { ui.toast(err.message, 'error'); }
            ui.showLoader(false);
        };

        document.getElementById('saveWebsite').onclick = async () => {
            ui.showLoader(true);
            try {
                const data = {
                    saleName: document.getElementById('webName').value,
                    navStyle: document.getElementById('webNavStyle').value,
                    heroTitle: document.getElementById('webHeroTitle').value,
                    heroSub: document.getElementById('webHeroSub').value,
                    about: document.getElementById('webAbout').value,
                    why: document.getElementById('webWhy').value,
                    fb: document.getElementById('webFb').value
                };
                await db.collection('sites').doc(state.user.uid).set(data, {merge: true});
                ui.toast("Website Settings Saved!");
            } catch(e) { ui.toast(e.message, 'error'); }
            ui.showLoader(false);
        };
    },

    loadProfile: async () => {
        if(!state.user) return;
        const doc = await db.collection('users').doc(state.user.uid).get();
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('profPhone').value = d.phone || '';
            document.getElementById('profWhatsapp').value = d.whatsapp || '';
            document.getElementById('profAddress').value = d.address || '';
            if(d.photo) document.getElementById('dashAvatar').innerHTML = `<img src="${d.photo}">`;
        } else {
            // New user, ensure fields are empty (Double check)
            document.getElementById('profPhone').value = '';
            document.getElementById('profWhatsapp').value = '';
            document.getElementById('profAddress').value = '';
            document.getElementById('dashAvatar').innerHTML = '<i class="fa-solid fa-user"></i>';
        }
    },

    loadMyVehicles: async () => {
        if(!state.user) return;
        const list = document.getElementById('myVehiclesList');
        list.innerHTML = '<p>Loading...</p>';
        const snap = await db.collection('vehicles').where('uid', '==', state.user.uid).get();
        list.innerHTML = '';
        if(snap.empty) {
            list.innerHTML = '<p>No vehicles found. Add one!</p>';
            return;
        }
        snap.forEach(doc => {
            const v = doc.data();
            const el = document.createElement('div');
            el.className = 'v-card';
            el.innerHTML = `
                <img src="${v.images && v.images.length ? v.images[0] : 'https://via.placeholder.com/300'}" loading="lazy">
                <div class="v-info">
                    <h4>${v.brand} ${v.model}</h4>
                    <p class="v-price">Rs. ${v.price}</p>
                    <div class="v-actions">
                        <button class="btn btn-primary btn-sm" onclick="app.deleteVehicle('${doc.id}')">Delete</button>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
    },

    deleteVehicle: async (id) => {
        if(!confirm("Are you sure?")) return;
        ui.showLoader(true);
        await db.collection('vehicles').doc(id).delete();
        app.loadMyVehicles();
        ui.showLoader(false);
    },

    loadWebsiteSettings: async () => {
        if(!state.user) return;
        const url = `${window.location.origin}${window.location.pathname}?seller=${state.user.uid}`;
        document.getElementById('mySiteLink').innerText = url;
        document.getElementById('mySiteLink').href = url;
        
        const doc = await db.collection('sites').doc(state.user.uid).get();
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('webName').value = d.saleName || '';
            document.getElementById('webNavStyle').value = d.navStyle || '1';
            document.getElementById('webHeroTitle').value = d.heroTitle || '';
            document.getElementById('webHeroSub').value = d.heroSub || '';
            document.getElementById('webAbout').value = d.about || '';
            document.getElementById('webWhy').value = d.why || '';
            document.getElementById('webFb').value = d.fb || '';
        } else {
            // New user clear
            document.getElementById('webName').value = '';
            document.getElementById('webHeroTitle').value = '';
            document.getElementById('webHeroSub').value = '';
            document.getElementById('webAbout').value = '';
            document.getElementById('webWhy').value = '';
            document.getElementById('webFb').value = '';
        }
    },

    loadConnect: async () => {
        const grid = document.getElementById('sellersGrid');
        grid.innerHTML = 'Loading...';
        const snap = await db.collection('sites').get();
        grid.innerHTML = '';
        snap.forEach(doc => {
            const s = doc.data();
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h3>${s.saleName || 'Car Sale'}</h3>
                <button class="btn btn-outline mt-2" onclick="window.open('?seller=${doc.id}', '_blank')">Visit Site</button>
            `;
            grid.appendChild(div);
        });
    }
};

// ==========================================
// 3. GENERATED SITE LOGIC
// ==========================================
const siteRenderer = {
    load: async (uid) => {
        ui.showLoader(true, "Loading Website...");
        try {
            const [siteDoc, userDoc, vSnap] = await Promise.all([
                db.collection('sites').doc(uid).get(),
                db.collection('users').doc(uid).get(),
                db.collection('vehicles').where('uid', '==', uid).where('published', '==', true).get()
            ]);

            if(!siteDoc.exists) throw new Error("Seller website not set up.");
            const s = siteDoc.data();
            const u = userDoc.data();

            const header = document.getElementById('genHeader');
            const menu = `
                <div style="display:flex; gap:20px;">
                    <a href="#genVehicles" style="text-decoration:none; color:#333; font-weight:600">Inventory</a>
                    <a href="#genAbout" style="text-decoration:none; color:#333; font-weight:600">About</a>
                    <a href="#genContact" style="text-decoration:none; color:#333; font-weight:600">Contact</a>
                </div>
            `;
            
            if(s.navStyle === '2') {
                header.innerHTML = `<div class="navbar" style="justify-content:space-between"><h2>${s.saleName}</h2>${menu}</div>`;
            } else {
                header.innerHTML = `<div class="navbar" style="flex-direction:column"><h2>${s.saleName}</h2>${menu}</div>`;
            }

            const hero = document.getElementById('genHero');
            hero.innerHTML = `<h1>${s.heroTitle || 'Welcome'}</h1><p>${s.heroSub || 'Best Deals in Town'}</p>`;

            const grid = document.getElementById('genVehicleGrid');
            const cats = new Set();
            vSnap.forEach(doc => {
                const v = doc.data();
                cats.add(v.category);
                const card = document.createElement('div');
                card.className = 'v-card';
                card.dataset.cat = v.category;
                card.innerHTML = `
                    <img src="${v.images[0]}" onclick="siteRenderer.openModal('${doc.id}')">
                    <div class="v-info">
                        <h4>${v.brand} ${v.model}</h4>
                        <p class="v-price">Rs. ${v.price}</p>
                    </div>
                `;
                grid.appendChild(card);
            });

            const filters = document.getElementById('genCatFilter');
            filters.innerHTML = `<div class="chip active" onclick="siteRenderer.filter('all')">All</div>`;
            cats.forEach(c => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.innerText = c;
                chip.onclick = (e) => siteRenderer.filter(c, e);
                filters.appendChild(chip);
            });

            document.getElementById('genAboutContent').innerText = s.about || 'We are a trusted seller.';
            const whyDiv = document.getElementById('genWhyGrid');
            const reasons = (s.why || "Trusted\nBest Prices\nQuality").split('\n');
            whyDiv.innerHTML = ''; // Clear prev
            reasons.forEach(r => {
                if(r.trim()){
                    const d = document.createElement('div');
                    d.className = 'feat-card';
                    d.innerHTML = `<h3>${r}</h3>`;
                    whyDiv.appendChild(d);
                }
            });

            document.getElementById('genContactInfo').innerHTML = `
                <p><i class="fa-solid fa-phone"></i> ${u.phone || ''}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${u.address || ''}</p>
            `;
            if(u.whatsapp) {
                const wa = document.getElementById('floatWhatsapp');
                wa.href = `https://wa.me/${u.whatsapp}`;
                wa.classList.remove('hidden');
            }

            window.onscroll = () => {
                const scrollP = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
                
                if(s.fb && scrollP > 50 && !sessionStorage.getItem('fbShown')) {
                    document.getElementById('fbModal').classList.remove('hidden');
                    document.getElementById('fbLinkArea').innerHTML = `<a href="${s.fb}" target="_blank" class="btn btn-primary">Open Page</a>`;
                    sessionStorage.setItem('fbShown', 'true');
                }

                if(scrollP > 30 && !sessionStorage.getItem('adShown')) {
                    document.getElementById('adModal').classList.remove('hidden');
                    document.getElementById('adContentArea').innerHTML = `<h3 class="text-center">Sponsored Ad Space</h3><div style="background:#eee; height:150px; margin-top:10px;"></div>`;
                    sessionStorage.setItem('adShown', 'true');
                }
            };

        } catch(e) {
            document.body.innerHTML = `<h2 class="text-center mt-2">Error: ${e.message}</h2>`;
        }
        ui.showLoader(false);
    },

    filter: (cat, e) => {
        if(e) {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
        }
        document.querySelectorAll('#genVehicleGrid .v-card').forEach(card => {
            card.style.display = (cat === 'all' || card.dataset.cat === cat) ? 'block' : 'none';
        });
    },

    openModal: async (vid) => {
        ui.showLoader(true);
        const doc = await db.collection('vehicles').doc(vid).get();
        const v = doc.data();
        ui.showLoader(false);

        const modal = document.getElementById('modalOverlay');
        modal.classList.remove('hidden');
        document.getElementById('modalBody').innerHTML = `
            <h2>${v.brand} ${v.model} (${v.year})</h2>
            <img src="${v.images[0]}" style="width:100%; border-radius:8px; margin:10px 0;">
            <div class="grid-2">
                <p><strong>Price:</strong> Rs. ${v.price}</p>
                <p><strong>Mileage:</strong> ${v.mileage} km</p>
                <p><strong>Fuel:</strong> ${v.fuel}</p>
                <p><strong>Trans:</strong> ${v.trans}</p>
            </div>
            <p class="mt-2">${v.desc}</p>
            ${v.youtube ? `<a href="${v.youtube}" target="_blank" class="btn btn-primary mt-2 full-width text-center">Watch Video</a>` : ''}
        `;
    }
};

document.addEventListener('DOMContentLoaded', app.init);
