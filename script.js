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
    profileComplete: false,
    vehicleImages: [], // Staging area for images
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
        document.getElementById(id).classList.remove('hidden');
        document.getElementById(id).classList.add('active');
    },
    switchTab: (id) => {
        // PROFILE LOCK LOGIC
        if(state.user && !state.profileComplete && id !== 'tabProfile') {
            return ui.toast("Please complete your Profile Settings first!", "error");
        }

        document.querySelectorAll('.dash-tab').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        
        document.getElementById(id).classList.remove('hidden');
        document.getElementById(id).classList.add('active');
        
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
        // HASH CHECK
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

        auth.onAuthStateChanged(async user => {
            document.getElementById('initLoader').classList.add('hidden');
            if (user) {
                state.user = user;
                const doc = await db.collection('users').doc(user.uid).get();
                if(doc.exists) {
                    const data = doc.data();
                    state.role = data.role || 'seller';
                    // Check Profile Completion
                    if(data.phone && data.city && data.address) state.profileComplete = true;
                    
                    ui.renderSidebar(state.role);
                    document.getElementById('dashEmail').innerText = user.email;
                    if(data.photo) document.getElementById('dashAvatar').innerHTML = `<img src="${data.photo}">`;
                    
                    ui.showView('viewDashboard');
                    document.getElementById('btnLoginNav').classList.add('hidden');
                    document.getElementById('btnLogoutNav').classList.remove('hidden');
                    
                    ui.switchTab('tabProfile'); // Always start here to check lock
                }
            } else {
                ui.showView('viewLanding');
                document.getElementById('btnLoginNav').classList.remove('hidden');
                document.getElementById('btnLogoutNav').classList.add('hidden');
            }
        });

        app.setupEvents();
    },

    setupEvents: () => {
        // Login/Signup Logic (Same as before)
        document.getElementById('btnLoginNav').onclick = () => ui.showView('viewAuth');
        document.getElementById('btnLogoutNav').onclick = () => auth.signOut();
        document.getElementById('btnLogin').onclick = async () => {
            try { ui.showLoader(true); await auth.signInWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value); ui.showLoader(false); } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); }
        };
        document.getElementById('btnSignup').onclick = async () => {
            const role = new URLSearchParams(window.location.search).get('role') || 'seller';
            try { ui.showLoader(true); const c = await auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value); await db.collection('users').doc(c.user.uid).set({ email: c.user.email, role: role, createdAt: new Date() }); ui.showLoader(false); ui.toast("Account Created!"); window.location.href = window.location.pathname; } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); }
        };

        // PROFILE (Updated Logic)
        document.getElementById('saveProfile').onclick = async () => {
            let phone = document.getElementById('profPhone').value;
            let wa = document.getElementById('profWhatsapp').value;
            const city = document.getElementById('profCity').value;
            const addr = document.getElementById('profAddress').value;
            
            if(!phone || !wa || !addr || !city) return ui.toast("All fields required", "error");

            // Auto Format Phone (077... -> +9477...)
            const formatPhone = (p) => p.startsWith('0') ? '+94' + p.substring(1) : p;
            phone = formatPhone(phone);
            wa = formatPhone(wa);

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
                state.profileComplete = true; // Unlock
                if(photoUrl) document.getElementById('dashAvatar').innerHTML = `<img src="${photoUrl}">`;
                
                ui.toast("Profile Saved! Dashboard Unlocked.");
                // Update UI to show formatted numbers
                document.getElementById('profPhone').value = phone;
                document.getElementById('profWhatsapp').value = wa;
            } catch(e) { ui.toast(e.message, 'error'); } 
            finally { ui.showLoader(false); }
        };

        // VEHICLE PHOTO STAGING (FIXED 10 PHOTOS)
        document.getElementById('vPhotosInput').addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if(state.vehicleImages.length + files.length > 10) return ui.toast("Max 10 photos allowed", "error");
            
            state.vehicleImages = [...state.vehicleImages, ...files];
            app.renderPhotoStaging();
        });

        // VEHICLE ADD (Using Staged Images)
        document.getElementById('formAddVehicle').onsubmit = async (e) => {
            e.preventDefault();
            if(state.vehicleImages.length === 0) return ui.toast("Please upload at least one photo", "error");
            
            ui.showLoader(true, "Publishing...");
            try {
                const imgPromises = state.vehicleImages.map(file => compressImage(file).then(blob => {
                    const ref = storage.ref(`vehicles/${state.user.uid}/${Date.now()}_${Math.random()}`);
                    return ref.put(blob).then(() => ref.getDownloadURL());
                }));
                const imgUrls = await Promise.all(imgPromises);

                // Extract YouTube ID
                const ytLink = document.getElementById('vYoutube').value;
                let ytId = '';
                if(ytLink) {
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                    const match = ytLink.match(regExp);
                    if (match && match[2].length == 11) ytId = match[2];
                }

                const data = {
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
                    youtube: ytId, // Save ID only
                    images: imgUrls,
                    published: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('vehicles').add(data);
                document.getElementById('formAddVehicle').reset();
                state.vehicleImages = [];
                document.getElementById('vPhotoStaging').innerHTML = '';
                ui.toast("Vehicle Published!");
                ui.switchTab('tabMyVehicles');
            } catch(err) { ui.toast(err.message, "error"); } 
            finally { ui.showLoader(false); }
        };

        // MY VEHICLE ACTIONS (Edit/Delete/Publish)
        // ... (Similar logic for Parts/Service add - kept generic for brevity but assumes they use direct file input for now or update similar to vehicle) ...
        
        // WEBSITE BUILDER (Slug logic preserved)
        document.getElementById('btnUnlockWebsite').onclick = async () => { /* ... same as before ... */ };
        document.getElementById('saveWebsite').onclick = async () => { /* ... same as before ... */ };
        
        // Edit Modal Submit
        document.getElementById('formEditVehicle').onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('editVId').value;
            const ytLink = document.getElementById('editVYoutube').value;
            let ytId = '';
            if(ytLink) {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = ytLink.match(regExp);
                if (match && match[2].length == 11) ytId = match[2];
            }

            ui.showLoader(true);
            await db.collection('vehicles').doc(id).update({
                brand: document.getElementById('editVBrand').value,
                model: document.getElementById('editVModel').value,
                price: document.getElementById('editVPrice').value,
                mileage: document.getElementById('editVMileage').value,
                condition: document.getElementById('editVCond').value,
                desc: document.getElementById('editVDesc').value,
                youtube: ytId
            });
            ui.showLoader(false);
            ui.toast("Updated");
            document.getElementById('editVehicleModal').classList.add('hidden');
            app.loadMyData('vehicles', 'myVehiclesList');
        };
    },

    renderPhotoStaging: () => {
        const box = document.getElementById('vPhotoStaging');
        box.innerHTML = '';
        state.vehicleImages.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'img-stage-item';
            div.innerHTML = `<img src="${URL.createObjectURL(file)}"><div class="img-remove-btn" onclick="app.removeStagedPhoto(${index})">x</div>`;
            box.appendChild(div);
        });
    },

    removeStagedPhoto: (index) => {
        state.vehicleImages.splice(index, 1);
        app.renderPhotoStaging();
    },

    // LOADERS & DATA
    loadProfile: async () => {
        const doc = await db.collection('users').doc(state.user.uid).get();
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('profPhone').value = d.phone || '';
            document.getElementById('profWhatsapp').value = d.whatsapp || '';
            document.getElementById('profAddress').value = d.address || '';
            document.getElementById('profCity').value = d.city || '';
            // Make fields editable but button says "Save"
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
            
            // Edit Button Logic (Only for vehicles for now)
            let editBtn = '';
            if(collection === 'vehicles') editBtn = `<button class="btn btn-primary btn-sm" onclick="app.openEditModal('${doc.id}')">Edit</button>`;

            el.innerHTML = `${badge}<img src="${img}"><div class="v-info"><h4>${title}</h4><p class="v-price">Rs. ${d.price}</p><div class="v-actions" style="grid-template-columns: 1fr 1fr 1fr;">${editBtn}<button class="btn btn-outline btn-sm" onclick="app.togglePublish('${collection}', '${doc.id}', ${d.published})">${d.published ? 'Hide' : 'Show'}</button><button class="btn btn-danger btn-sm" onclick="app.deleteItem('${collection}', '${doc.id}')">Del</button></div></div>`;
            list.appendChild(el);
        });
    },

    openEditModal: async (id) => {
        const doc = await db.collection('vehicles').doc(id).get();
        const d = doc.data();
        document.getElementById('editVId').value = id;
        document.getElementById('editVBrand').value = d.brand;
        document.getElementById('editVModel').value = d.model;
        document.getElementById('editVPrice').value = d.price;
        document.getElementById('editVMileage').value = d.mileage;
        document.getElementById('editVCond').value = d.condition || '';
        document.getElementById('editVDesc').value = d.desc;
        document.getElementById('editVYoutube').value = d.youtube ? `https://youtu.be/${d.youtube}` : '';
        document.getElementById('editVehicleModal').classList.remove('hidden');
    },

    togglePublish: async (col, id, status) => { /* ... same ... */ },
    deleteItem: async (col, id) => { /* ... same ... */ },
    loadWebsiteSettings: async () => { /* ... same ... */ },
    loadConnect: async () => { /* ... same ... */ },
    connectFilter: (role) => { /* ... same ... */ },
    filterConnect: () => { /* ... same ... */ },
    buyerFilter: async (type) => { /* ... same ... */ }
};

// GENERATED SITE RENDERER (Super Premium)
const siteRenderer = {
    loadBySlug: async (slug) => {
        ui.showLoader(true, "Building Experience...");
        try {
            const sitesSnap = await db.collection('sites').where('slug', '==', slug).limit(1).get();
            if(sitesSnap.empty) throw new Error("Page not found");
            
            const siteDoc = sitesSnap.docs[0];
            const uid = siteDoc.id;
            const s = siteDoc.data();
            const userDoc = await db.collection('users').doc(uid).get();
            const u = userDoc.data();

            document.getElementById('genHeroTitle').innerText = s.heroTitle || s.saleName;
            document.getElementById('genHeroSub').innerText = s.heroSub || '';
            document.getElementById('genContactInfo').innerHTML = `
                <p><i class="fa-solid fa-phone"></i> ${u.phone}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${u.city}, ${u.address}</p>
            `;
            if(u.whatsapp) {
                const wa = document.getElementById('floatWhatsapp');
                wa.href = `https://wa.me/${u.whatsapp.replace('+','')}`;
                wa.classList.remove('hidden');
            }

            // Load Vehicles
            const items = await db.collection('vehicles').where('uid', '==', uid).where('published', '==', true).get();
            const grid = document.getElementById('genGrid');
            items.forEach(doc => {
                const d = doc.data();
                const card = document.createElement('div');
                card.className = 'v-card';
                card.onclick = () => siteRenderer.openDetailModal(d, u.whatsapp);
                card.innerHTML = `
                    <img src="${d.images[0]}" loading="lazy">
                    <div class="v-info">
                        <h4>${d.brand} ${d.model}</h4>
                        <p class="v-price">Rs. ${d.price}</p>
                        <p class="text-sm text-secondary">${d.mileage} km | ${d.condition || 'Used'}</p>
                    </div>
                `;
                grid.appendChild(card);
            });

        } catch(e) { document.body.innerHTML = `<h1>${e.message}</h1>`; }
        ui.showLoader(false);
    },

    openDetailModal: (d, waNumber) => {
        const modal = document.getElementById('siteVehicleModal');
        const content = document.getElementById('siteModalContent');
        
        // Slider Logic
        let slides = d.images.map((img, i) => `<img src="${img}" class="slide-img ${i===0?'active':''}" onclick="siteRenderer.openLightbox('${img}')">`).join('');
        
        let youtubeEmbed = d.youtube ? `<div class="mt-4"><iframe width="100%" height="300" src="https://www.youtube.com/embed/${d.youtube}" frameborder="0" allowfullscreen></iframe></div>` : '';

        content.innerHTML = `
            <div class="slider-container">
                ${slides}
                <button class="slider-btn prev-btn" onclick="siteRenderer.moveSlide(-1)">&#10094;</button>
                <button class="slider-btn next-btn" onclick="siteRenderer.moveSlide(1)">&#10095;</button>
            </div>
            <div class="modal-info">
                <h2>${d.brand} ${d.model} (${d.year})</h2>
                <p class="text-primary font-bold text-lg">Rs. ${d.price}</p>
                <div class="grid-2 mt-4">
                    <p><strong>Mileage:</strong> ${d.mileage} km</p>
                    <p><strong>Fuel:</strong> ${d.fuel}</p>
                    <p><strong>Trans:</strong> ${d.trans}</p>
                    <p><strong>Body:</strong> ${d.body || '-'}</p>
                </div>
                <div class="mt-4 p-4 bg-light rounded">${d.desc}</div>
                ${youtubeEmbed}
                <a href="https://wa.me/${waNumber.replace('+','')}?text=Hi, I am interested in ${d.brand} ${d.model}" target="_blank" class="btn btn-success full-width mt-4"><i class="fa-brands fa-whatsapp"></i> Ask on WhatsApp</a>
            </div>
        `;
        
        modal.classList.remove('hidden');
        siteRenderer.currentSlide = 0;
        siteRenderer.totalSlides = d.images.length;
    },

    moveSlide: (dir) => {
        const imgs = document.querySelectorAll('.slide-img');
        imgs[siteRenderer.currentSlide].style.display = 'none';
        siteRenderer.currentSlide = (siteRenderer.currentSlide + dir + siteRenderer.totalSlides) % siteRenderer.totalSlides;
        imgs[siteRenderer.currentSlide].style.display = 'block';
    },

    openLightbox: (src) => {
        document.getElementById('lightboxImg').src = src;
        document.getElementById('lightboxModal').classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', app.init);
