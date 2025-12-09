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
    vehicleList: [], // Store for search
    categories: [
        "Car", "SUV / Crossover", "Van", "Pickup", "Lorry / Truck", "Bus / Coach",
        "Motorcycle", "Scooter / Moped", "Three-wheeler", "Tractor / Agricultural",
        "Construction / Heavy equipment", "Trailer", "RV / Camper", 
        "ATV / UTV", "Special-purpose vehicles", "Marine"
    ]
};

window.ui = {
    showLoader: (show, text = "Processing...") => {
        const el = document.getElementById('loader');
        if(!el) return;
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
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
            el.classList.add('hidden');
        });
        const target = document.getElementById(id);
        if(target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
    },
    switchTab: (id) => {
        document.querySelectorAll('.dash-tab').forEach(el => {
            el.classList.remove('active');
            el.classList.add('hidden');
        });
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        
        const tab = document.getElementById(id);
        if(tab) {
            tab.classList.remove('hidden');
            tab.classList.add('active');
        }
        
        const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick').includes(id));
        if(btn) btn.classList.add('active');

        if(state.user) {
            if(id === 'tabMyVehicles') app.loadMyVehicles();
            if(id === 'tabConnect') app.loadConnect();
            if(id === 'tabProfile') app.loadProfile();
            if(id === 'tabWebsite') app.loadWebsiteSettings();
        }
    },
    closeModal: () => {
        document.getElementById('modalOverlay').classList.add('hidden');
        document.getElementById('editVehicleModal').classList.add('hidden');
    },
    resetDashboard: () => {
        const safeVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        safeVal('profPhone', '');
        safeVal('profWhatsapp', '');
        safeVal('profAddress', '');
        const av = document.getElementById('dashAvatar');
        if(av) av.innerHTML = '<i class="fa-solid fa-user"></i>';
        document.getElementById('dashEmail').innerText = 'User';
        
        const form = document.getElementById('formAddVehicle');
        if(form) form.reset();
        document.getElementById('vPreview').innerHTML = '';
        
        document.getElementById('websiteEditor')?.classList.add('hidden');
        document.getElementById('websiteLockScreen')?.classList.remove('hidden');
        safeVal('initSaleName', '');
        
        document.getElementById('myVehiclesList').innerHTML = '';
        state.user = null;
        state.vehicleList = [];
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
            resolve(blob);
        };
        img.onerror = reject;
    });
};

const app = {
    init: () => {
        const sel = document.getElementById('vCat');
        if(sel && sel.options.length === 0) {
            state.categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.innerText = c;
                sel.appendChild(opt);
            });
        }

        auth.onAuthStateChanged(user => {
            document.getElementById('initLoader').classList.add('hidden');
            if (user) {
                state.user = user;
                document.getElementById('dashEmail').innerText = user.email;
                ui.showView('viewDashboard');
                document.getElementById('btnLoginNav').classList.add('hidden');
                document.getElementById('btnLogoutNav').classList.remove('hidden');
                
                if(user.email === 'admin@vehiclebuilder.com') {
                    state.isAdmin = true;
                    document.getElementById('navAdmin')?.classList.remove('hidden');
                }
                app.loadProfile();
                ui.switchTab('tabProfile');
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
            document.getElementById('initLoader').classList.add('hidden');
            document.getElementById('platformApp').classList.add('hidden');
            document.getElementById('generatedSite').classList.remove('hidden');
            siteRenderer.load(sellerId);
        }
    },

    setupEventListeners: () => {
        document.getElementById('btnLoginNav').onclick = () => ui.showView('viewAuth');
        document.getElementById('btnLogoutNav').onclick = () => auth.signOut();
        
        document.getElementById('btnLogin').onclick = async () => {
            try {
                ui.showLoader(true);
                await auth.signInWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value);
                ui.showLoader(false);
            } catch(err) { ui.showLoader(false); ui.toast(err.message, 'error'); }
        };

        document.getElementById('btnSignup').onclick = async () => {
            try {
                ui.showLoader(true);
                const cred = await auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value);
                await db.collection('users').doc(cred.user.uid).set({ email: cred.user.email, createdAt: new Date() });
                ui.showLoader(false);
                ui.toast("Account Created!");
            } catch(err) { ui.showLoader(false); ui.toast(err.message, 'error'); }
        };

        // PROFILE VALIDATION
        document.getElementById('saveProfile').onclick = async () => {
            const phone = document.getElementById('profPhone').value;
            const wa = document.getElementById('profWhatsapp').value;
            const addr = document.getElementById('profAddress').value;
            
            if(!phone || !wa || !addr) return ui.toast("All fields are REQUIRED.", "error");

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
                ui.toast("Profile Saved!");
                if(photoUrl) document.getElementById('dashAvatar').innerHTML = `<img src="${photoUrl}">`;
            } catch(e) { ui.toast(e.message, 'error'); }
            ui.showLoader(false);
        };

        // IMAGE PREVIEW
        document.getElementById('vPhotos').addEventListener('change', (e) => {
             const box = document.getElementById('vPreview');
             box.innerHTML = '';
             Array.from(e.target.files).slice(0,10).forEach(file => {
                 const img = document.createElement('img');
                 img.src = URL.createObjectURL(file);
                 box.appendChild(img);
             });
        });

        // SEARCH BAR LOGIC
        document.getElementById('searchV').addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = state.vehicleList.filter(v => 
                v.brand.toLowerCase().includes(term) || 
                v.model.toLowerCase().includes(term)
            );
            app.renderVehicleList(filtered);
        });

        // ADD VEHICLE (FIXED UPLOAD)
        document.getElementById('formAddVehicle').onsubmit = async (e) => {
            e.preventDefault();
            ui.showLoader(true, "Publishing...");
            try {
                const files = document.getElementById('vPhotos').files;
                const imgPromises = [];
                for(let i=0; i < Math.min(files.length, 10); i++) {
                    imgPromises.push(compressImage(files[i]).then(blob => {
                        const ref = storage.ref(`vehicles/${state.user.uid}/${Date.now()}_${i}`);
                        return ref.put(blob).then(() => ref.getDownloadURL());
                    }));
                }
                
                const imgUrls = await Promise.all(imgPromises);

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
                    published: true, // Default published
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                document.getElementById('formAddVehicle').reset();
                document.getElementById('vPreview').innerHTML = '';
                ui.toast("Vehicle Published!");
                ui.switchTab('tabMyVehicles');
            } catch(err) { ui.toast(err.message, 'error'); }
            ui.showLoader(false);
        };

        // EDIT VEHICLE FORM SUBMIT
        document.getElementById('formEditVehicle').onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('editVId').value;
            ui.showLoader(true, "Updating...");
            try {
                await db.collection('vehicles').doc(id).update({
                    brand: document.getElementById('editVBrand').value,
                    model: document.getElementById('editVModel').value,
                    price: document.getElementById('editVPrice').value,
                    mileage: document.getElementById('editVMileage').value,
                    desc: document.getElementById('editVDesc').value
                });
                ui.toast("Vehicle Updated!");
                document.getElementById('editVehicleModal').classList.add('hidden');
                app.loadMyVehicles();
            } catch(e) { ui.toast(e.message, 'error'); }
            ui.showLoader(false);
        };

        // WEBSITE UNLOCK
        document.getElementById('btnUnlockWebsite').onclick = () => {
            const name = document.getElementById('initSaleName').value.trim();
            if(!name) return ui.toast("Enter a name!", "error");
            document.getElementById('webName').value = name;
            document.getElementById('webHeroTitle').value = `Welcome to ${name}`;
            document.getElementById('webHeroSub').value = "Best Cars in Town";
            document.getElementById('webAbout').value = `${name} is your trusted partner.`;
            document.getElementById('webWhy').value = "Best Price\nVerified";
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
        
        state.vehicleList = [];
        snap.forEach(doc => state.vehicleList.push({id: doc.id, ...doc.data()}));
        
        app.renderVehicleList(state.vehicleList);
    },

    renderVehicleList: (vehicles) => {
        const list = document.getElementById('myVehiclesList');
        list.innerHTML = '';
        if(vehicles.length === 0) { list.innerHTML = '<p>No vehicles found.</p>'; return; }

        vehicles.forEach(v => {
            const el = document.createElement('div');
            el.className = 'v-card';
            const badge = v.published 
                ? '<span class="status-indicator status-published">Published</span>' 
                : '<span class="status-indicator status-hidden">Hidden</span>';
            
            el.innerHTML = `
                ${badge}
                <img src="${v.images && v.images.length ? v.images[0] : ''}" loading="lazy">
                <div class="v-info">
                    <h4>${v.brand} ${v.model}</h4>
                    <p class="v-price">Rs. ${v.price}</p>
                    <div class="v-actions">
                        <button class="btn btn-primary btn-sm" onclick="app.openEditModal('${v.id}')">Edit</button>
                        <button class="btn ${v.published ? 'btn-outline' : 'btn-success'} btn-sm" onclick="app.togglePublish('${v.id}', ${v.published})">
                            ${v.published ? 'Hide' : 'Publish'}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteVehicle('${v.id}')">Delete</button>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
    },

    openEditModal: (id) => {
        const v = state.vehicleList.find(i => i.id === id);
        if(!v) return;
        document.getElementById('editVId').value = id;
        document.getElementById('editVBrand').value = v.brand;
        document.getElementById('editVModel').value = v.model;
        document.getElementById('editVPrice').value = v.price;
        document.getElementById('editVMileage').value = v.mileage;
        document.getElementById('editVDesc').value = v.desc;
        document.getElementById('editVehicleModal').classList.remove('hidden');
    },

    togglePublish: async (id, currentStatus) => {
        ui.showLoader(true);
        await db.collection('vehicles').doc(id).update({ published: !currentStatus });
        app.loadMyVehicles(); // Reload to update badges
        ui.showLoader(false);
    },

    deleteVehicle: async (id) => {
        if(!confirm("Are you sure you want to delete this vehicle?")) return;
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
                div.innerHTML = `<h3>${s.saleName}</h3><button class="btn btn-outline mt-2 full-width" onclick="window.open('?seller=${doc.id}', '_blank')">Visit Site</button>`;
                grid.appendChild(div);
            }
        });
    }
};

const siteRenderer = {
    load: async (uid) => {
        ui.showLoader(true, "Building Website...");
        try {
            const [siteDoc, userDoc, vSnap] = await Promise.all([
                db.collection('sites').doc(uid).get(),
                db.collection('users').doc(uid).get(),
                db.collection('vehicles').where('uid', '==', uid).where('published', '==', true).get()
            ]);

            if(!siteDoc.exists) throw new Error("This seller has not setup their website.");
            const s = siteDoc.data();
            const u = userDoc.data();

            const header = document.getElementById('genHeader');
            const logoHtml = s.logo 
                ? `<img src="${s.logo}" class="gen-logo-img">` 
                : `<div class="gen-logo-icon"><i class="fa-solid fa-car"></i></div>`;
            
            header.className = s.navStyle === '2' ? 'gen-navbar left' : 'gen-navbar centered';
            header.innerHTML = `
                <a href="#" class="gen-brand">${logoHtml} <span>${s.saleName}</span></a>
                <nav class="gen-menu">
                    <a href="#genVehicles">Inventory</a>
                    <a href="#genAbout">About</a>
                    <a href="#genContact">Contact</a>
                </nav>
            `;

            document.getElementById('genHeroTitle').innerText = s.heroTitle || `Welcome to ${s.saleName}`;
            document.getElementById('genHeroSub').innerText = s.heroSub || '';

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

            document.getElementById('genAboutContent').innerText = s.about || '';
            const whyGrid = document.getElementById('genWhyGrid');
            const reasons = (s.why || "").split('\n');
            whyGrid.innerHTML = '';
            reasons.forEach(r => {
                if(r.trim()) {
                    const div = document.createElement('div');
                    div.className = 'feat-card';
                    div.innerHTML = `<i class="fa-solid fa-check-circle"></i><h3>${r}</h3>`;
                    whyGrid.appendChild(div);
                }
            });

            document.getElementById('genContactInfo').innerHTML = `
                <p><i class="fa-solid fa-phone"></i> ${u.phone || ''}</p>
                <p><i class="fa-brands fa-whatsapp"></i> ${u.whatsapp || ''}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${u.address || ''}</p>
            `;
            if(u.whatsapp) {
                const wa = document.getElementById('floatWhatsapp');
                wa.href = `https://wa.me/${u.whatsapp}`;
                wa.classList.remove('hidden');
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('visible'); });
            }, { threshold: 0.1 });
            document.querySelectorAll('.scroll-anim').forEach(el => observer.observe(el));

            window.addEventListener('scroll', () => {
                 const scrollP = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
                 if(s.fb && scrollP > 95 && !sessionStorage.getItem('fbShown')) {
                     document.getElementById('fbModal').classList.remove('hidden');
                     document.getElementById('fbLinkArea').innerHTML = `<a href="${s.fb}" target="_blank" class="btn btn-primary">Visit Page</a>`;
                     sessionStorage.setItem('fbShown', 'true');
                 }
                 if(scrollP > 30 && !sessionStorage.getItem('adShown')) {
                     document.getElementById('adModal').classList.remove('hidden');
                     document.getElementById('adContentArea').innerHTML = `<h3 class="text-center">Sponsored</h3><div style="background:#eee; height:150px; margin-top:10px; display:flex; align-items:center; justify-content:center;">Ad Space</div>`;
                     sessionStorage.setItem('adShown', 'true');
                 }
            });

        } catch(e) {
            document.body.innerHTML = `<div style="text-align:center; padding:50px;"><h2>${e.message}</h2></div>`;
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
            <h2>${v.brand} ${v.model}</h2>
            <img src="${v.images[0]}" style="width:100%; border-radius:8px; margin:10px 0;">
            <div class="grid-2">
                <p><strong>Price:</strong> Rs. ${v.price}</p>
                <p><strong>Mileage:</strong> ${v.mileage} km</p>
                <p><strong>Condition:</strong> ${v.condition || 'Used'}</p>
            </div>
            <p class="mt-2">${v.desc}</p>
        `;
    }
};

document.addEventListener('DOMContentLoaded', app.init);
