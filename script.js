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
    
    resetDashboard: () => {
        document.getElementById('profPhone').value = '';
        document.getElementById('profWhatsapp').value = '';
        document.getElementById('profAddress').value = '';
        document.getElementById('dashAvatar').innerHTML = '<i class="fa-solid fa-user"></i>';
        document.getElementById('dashEmail').innerText = 'User';
        document.getElementById('formAddVehicle').reset();
        document.getElementById('vPreview').innerHTML = '';
        
        // Website Reset
        document.getElementById('websiteEditor').classList.add('hidden');
        document.getElementById('websiteLockScreen').classList.remove('hidden');
        document.getElementById('initSaleName').value = '';
        
        document.getElementById('myVehiclesList').innerHTML = '';
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
                app.loadProfile();
            } else {
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
                ui.showLoader(true);
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
                ui.showLoader(true);
                const cred = await auth.createUserWithEmailAndPassword(e, p);
                await db.collection('users').doc(cred.user.uid).set({ email: e, createdAt: new Date() });
                ui.showLoader(false);
                ui.toast("Account Created!");
            } catch(err) {
                ui.showLoader(false);
                ui.toast(err.message, 'error');
            }
        };

        document.getElementById('saveProfile').onclick = async () => {
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
            ui.showLoader(true, "Publishing...");
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

        // WEBSITE UNLOCK & SAVE (IMPROVED)
        document.getElementById('btnUnlockWebsite').onclick = () => {
            const name = document.getElementById('initSaleName').value.trim();
            if(!name) return ui.toast("Enter a name!", "error");
            
            // Auto-Fill Content
            document.getElementById('webName').value = name;
            document.getElementById('webHeroTitle').value = `Welcome to ${name}`;
            document.getElementById('webHeroSub').value = "Your Trusted Partner for Quality Vehicles";
            document.getElementById('webAbout').value = `${name} is a premier vehicle dealership dedicated to providing high-quality vehicles at the best market rates. We believe in transparency, trust, and customer satisfaction.`;
            document.getElementById('webWhy').value = "Verified Documents\nBest Market Price\nExcellent Customer Support\nWide Range of Selection";
            
            document.getElementById('websiteLockScreen').classList.add('hidden');
            document.getElementById('websiteEditor').classList.remove('hidden');
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
                
                // Handle Logo upload
                const logoFile = document.getElementById('webLogo').files[0];
                if(logoFile) {
                    const blob = await compressImage(logoFile);
                    const ref = storage.ref(`sites/${state.user.uid}/logo`);
                    await ref.put(blob);
                    data.logo = await ref.getDownloadURL();
                }
                
                await db.collection('sites').doc(state.user.uid).set(data, {merge: true});
                ui.toast("Website Published!");
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
                    <div style="display:flex; justify-content:space-between">
                        <button class="btn btn-primary btn-xs" onclick="app.deleteVehicle('${doc.id}')">Delete</button>
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
        if(doc.exists && doc.data().saleName) {
            const d = doc.data();
            document.getElementById('websiteLockScreen').classList.add('hidden');
            document.getElementById('websiteEditor').classList.remove('hidden');
            
            document.getElementById('webName').value = d.saleName || '';
            document.getElementById('webNavStyle').value = d.navStyle || '1';
            document.getElementById('webHeroTitle').value = d.heroTitle || '';
            document.getElementById('webHeroSub').value = d.heroSub || '';
            document.getElementById('webAbout').value = d.about || '';
            document.getElementById('webWhy').value = d.why || '';
            document.getElementById('webFb').value = d.fb || '';
        } else {
            // Locked
            document.getElementById('websiteLockScreen').classList.remove('hidden');
            document.getElementById('websiteEditor').classList.add('hidden');
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
                const div = document.createElement('div');
                div.className = 'card';
                div.innerHTML = `
                    <h3>${s.saleName}</h3>
                    <button class="btn btn-outline mt-4 full-width" onclick="window.open('?seller=${doc.id}', '_blank')">Visit Site</button>
                `;
                grid.appendChild(div);
            }
        });
    }
};

// ==========================================
// 3. GENERATED SUPER SITE LOGIC
// ==========================================
const siteRenderer = {
    load: async (uid) => {
        ui.showLoader(true, "Building Experience...");
        try {
            const [siteDoc, userDoc, vSnap] = await Promise.all([
                db.collection('sites').doc(uid).get(),
                db.collection('users').doc(uid).get(),
                db.collection('vehicles').where('uid', '==', uid).where('published', '==', true).get()
            ]);

            if(!siteDoc.exists) throw new Error("Site not ready.");
            const s = siteDoc.data();
            const u = userDoc.data();

            // 1. Navigation Logic
            const header = document.getElementById('genHeader');
            const logoHtml = s.logo 
                ? `<img src="${s.logo}" class="gen-logo-img">` 
                : `<div class="gen-logo-icon"><i class="fa-solid fa-car"></i></div>`;
            
            const brandHtml = `<a href="#" class="gen-brand">${logoHtml} <span>${s.saleName}</span></a>`;
            const menuHtml = `
                <nav class="gen-menu">
                    <a href="#genVehicles">Inventory</a>
                    <a href="#genAbout">About</a>
                    <a href="#genWhy">Why Us</a>
                    <a href="#genContact">Contact</a>
                </nav>
            `;
            
            header.className = s.navStyle === '2' ? 'gen-navbar left' : 'gen-navbar centered';
            header.innerHTML = s.navStyle === '2' ? `${brandHtml}${menuHtml}` : `${brandHtml}${menuHtml}`;

            // 2. Hero
            document.getElementById('genHeroTitle').innerText = s.heroTitle || `Welcome to ${s.saleName}`;
            document.getElementById('genHeroSub').innerText = s.heroSub || 'Premium Vehicles';

            // 3. Smart Vehicles & Categories
            const grid = document.getElementById('genVehicleGrid');
            const cats = new Set();
            vSnap.forEach(doc => {
                const v = doc.data();
                cats.add(v.category);
                const card = document.createElement('div');
                card.className = 'v-card';
                card.dataset.cat = v.category;
                card.onclick = () => siteRenderer.openModal(doc.id);
                card.innerHTML = `
                    <img src="${v.images[0]}" loading="lazy">
                    <div class="v-info">
                        <h4>${v.brand} ${v.model}</h4>
                        <p class="v-price">Rs. ${v.price}</p>
                        <p class="text-sm text-secondary">${v.mileage} km | ${v.fuel}</p>
                    </div>
                `;
                grid.appendChild(card);
            });

            // Filter Chips (Only show existing categories)
            const filters = document.getElementById('genCatFilter');
            filters.innerHTML = `<div class="chip active" onclick="siteRenderer.filter('all')">All</div>`;
            cats.forEach(c => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.innerText = c;
                chip.onclick = (e) => siteRenderer.filter(c, e);
                filters.appendChild(chip);
            });

            // 4. Content
            document.getElementById('genAboutContent').innerHTML = `<p>${s.about}</p>`;
            
            const whyGrid = document.getElementById('genWhyGrid');
            const reasons = (s.why || "").split('\n');
            whyGrid.innerHTML = '';
            reasons.forEach(r => {
                if(r.trim()) {
                    const icon = siteRenderer.getIconForReason(r);
                    const div = document.createElement('div');
                    div.className = 'feat-card';
                    div.innerHTML = `<i class="${icon}"></i><h3>${r}</h3>`;
                    whyGrid.appendChild(div);
                }
            });

            // 5. Contact
            document.getElementById('genContactInfo').innerHTML = `
                <h3>Visit Us</h3>
                <p><i class="fa-solid fa-phone"></i> ${u.phone || 'N/A'}</p>
                <p><i class="fa-brands fa-whatsapp"></i> ${u.whatsapp || 'N/A'}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${u.address || 'N/A'}</p>
                <p style="margin-top:20px; font-size:0.9rem;">&copy; ${new Date().getFullYear()} ${s.saleName}. Powered by VehicleBuilder.</p>
            `;
            if(u.whatsapp) {
                const wa = document.getElementById('floatWhatsapp');
                wa.href = `https://wa.me/${u.whatsapp}`;
                wa.classList.remove('hidden');
            }

            // 6. Scroll Animations & Modals
            siteRenderer.initAnimations();
            window.addEventListener('scroll', () => {
                 const scrollP = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
                 if(s.fb && scrollP > 50 && !sessionStorage.getItem('fbShown')) {
                     document.getElementById('fbModal').classList.remove('hidden');
                     document.getElementById('fbLinkArea').innerHTML = `<a href="${s.fb}" target="_blank" class="btn btn-primary">Visit Page</a>`;
                     sessionStorage.setItem('fbShown', 'true');
                 }
            });

        } catch(e) {
            document.body.innerHTML = `<h2 class="text-center mt-4">Website Loading... (Or Setup Incomplete)</h2>`;
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
        `;
    },

    getIconForReason: (text) => {
        const t = text.toLowerCase();
        if(t.includes('price')) return 'fa-solid fa-tag';
        if(t.includes('trusted') || t.includes('verified')) return 'fa-solid fa-shield-halved';
        if(t.includes('customer') || t.includes('support')) return 'fa-solid fa-headset';
        return 'fa-solid fa-check-circle';
    },

    initAnimations: () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.scroll-anim').forEach(el => observer.observe(el));
    }
};

document.addEventListener('DOMContentLoaded', app.init);
