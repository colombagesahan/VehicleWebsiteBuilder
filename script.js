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
    categories: ["Car", "SUV", "Van", "Pickup", "Lorry", "Bus", "Motorcycle", "Scooter", "Three-wheeler", "Tractor", "Construction", "Trailer", "RV", "ATV", "Special", "Marine"],
    buyerFilterType: 'vehicles',
    allSites: [],
    chats: []
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
        const tab = document.getElementById(id);
        if(tab) { tab.classList.remove('hidden'); tab.classList.add('active'); }
        
        const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick')?.includes(id));
        if(btn) btn.classList.add('active');

        if(state.user) {
            if(id === 'tabMyVehicles') app.loadMyData('vehicles', 'myVehiclesList');
            if(id === 'tabMyParts') app.loadMyData('parts', 'myPartsList');
            if(id === 'tabMyServices') app.loadMyData('services', 'myServicesList');
            if(id === 'tabMyRentals') app.loadMyData('rentals', 'myRentalsList');
            if(id === 'tabMyFinance') app.loadMyData('finance_packages', 'myFinanceList');
            if(id === 'tabMyInsurance') app.loadMyData('insurance_packages', 'myInsuranceList');
            if(id === 'tabUserGarage') app.loadUserGarage();
            
            if(id === 'tabDirectory') app.loadDirectory();
            if(id === 'tabConnect') app.loadConnectSection();
            if(id === 'tabProfile') app.loadProfile();
            if(id === 'tabWebsite') app.loadWebsiteSettings();
            if(id === 'tabBuyerBrowse') app.buyerFilter('vehicles');
            if(id === 'tabPromote') app.loadPromoteTab();
            if(id === 'tabBizMessages') app.loadBizMessages();
            if(id === 'tabAdmin') app.loadAdminDashboard();
        }
    },
    closeModal: () => document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden')),
    
    resetDashboard: () => {
        const safeVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        safeVal('profPhone', ''); safeVal('profWhatsapp', ''); safeVal('profAddress', ''); safeVal('profCity', ''); safeVal('profBank', '');
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
        safeVal('initSaleName', '');
        safeVal('webName', '');
        const link = document.getElementById('mySiteLink'); if(link) link.innerText = '...';
        state.user = null; state.profileComplete = false; state.inventory = [];
    },

    renderSidebar: (role) => {
        const nav = document.getElementById('dynamicSidebar');
        let html = `<button onclick="ui.switchTab('tabProfile')" class="nav-item active"><i class="fa-solid fa-id-card"></i> Profile</button>`;
        
        if(role === 'seller') {
            html += `<button onclick="ui.switchTab('tabAddVehicle')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Vehicle</button>`;
            html += `<button onclick="ui.switchTab('tabMyVehicles')" class="nav-item"><i class="fa-solid fa-list"></i> My Vehicles</button>`;
            html += `<button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        } 
        else if(role === 'parts') {
            html += `<button onclick="ui.switchTab('tabAddPart')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Part</button>`;
            html += `<button onclick="ui.switchTab('tabMyParts')" class="nav-item"><i class="fa-solid fa-box"></i> My Products</button>`;
            html += `<button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        } 
        else if(role === 'service') {
            html += `<button onclick="ui.switchTab('tabAddService')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Service</button>`;
            html += `<button onclick="ui.switchTab('tabMyServices')" class="nav-item"><i class="fa-solid fa-list-check"></i> My Services</button>`;
            html += `<button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        }
        else if(role === 'rental') {
            html += `<button onclick="ui.switchTab('tabAddRental')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Rental</button>`;
            html += `<button onclick="ui.switchTab('tabMyRentals')" class="nav-item"><i class="fa-solid fa-car-side"></i> My Fleet</button>`;
            html += `<button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        }
        else if(role === 'finance') {
            html += `<button onclick="ui.switchTab('tabAddFinance')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Package</button>`;
            html += `<button onclick="ui.switchTab('tabMyFinance')" class="nav-item"><i class="fa-solid fa-coins"></i> My Packages</button>`;
            html += `<button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        }
        else if(role === 'insurance') {
            html += `<button onclick="ui.switchTab('tabAddInsurance')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Policy</button>`;
            html += `<button onclick="ui.switchTab('tabMyInsurance')" class="nav-item"><i class="fa-solid fa-shield-halved"></i> My Policies</button>`;
            html += `<button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        }
        
        // COMMON TABS FOR ALL
        if(role === 'buyer') {
             html += `<button onclick="ui.switchTab('tabUserGarage')" class="nav-item"><i class="fa-solid fa-warehouse"></i> My Garage</button>`;
        }
        
        html += `<button onclick="ui.switchTab('tabBuyerBrowse')" class="nav-item"><i class="fa-solid fa-search"></i> Marketplace</button>`;
        html += `<button onclick="ui.switchTab('tabDirectory')" class="nav-item"><i class="fa-solid fa-address-book"></i> Directory</button>`;
        html += `<button onclick="ui.switchTab('tabBizMessages')" class="nav-item"><i class="fa-solid fa-envelope-open-text"></i> Biz Messages</button>`;
        html += `<button onclick="ui.switchTab('tabPromote')" class="nav-item"><i class="fa-solid fa-bullhorn"></i> Promote</button>`;
        html += `<button onclick="ui.switchTab('tabConnect')" class="nav-item"><i class="fa-solid fa-share-nodes"></i> Connect</button>`;

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
                    
                    if(user.email === 'colombagesahan@gmail.com' || user.email === 'colombagesahan@gmail.com') document.getElementById('tabAdmin')?.classList.remove('hidden'); 
                    
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
        document.getElementById('btnSignup').onclick = async () => { const role = new URLSearchParams(window.location.search).get('role') || 'seller'; try { ui.showLoader(true); const c = await auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value); await db.collection('users').doc(c.user.uid).set({ email: c.user.email, role: role, createdAt: new Date(), earnings: 0, credits: 0 }); ui.showLoader(false); ui.toast("Account Created!"); window.location.href = window.location.pathname; } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); } };

        // PROFILE SAVE
        document.getElementById('saveProfile').onclick = async () => {
            let phone = document.getElementById('profPhone').value;
            let wa = document.getElementById('profWhatsapp').value;
            const city = document.getElementById('profCity').value;
            const addr = document.getElementById('profAddress').value;
            const bank = document.getElementById('profBank').value;
            if(!phone || !wa || !addr || !city) return ui.toast("All fields required", "error");
            
            const formatPhone = (p) => { let n = p.trim(); if(n.startsWith('0')) n = '+94' + n.substring(1); else if(!n.startsWith('+')) n = '+94' + n; return n; };
            phone = formatPhone(phone); wa = formatPhone(wa);

            ui.showLoader(true, "Saving...");
            try {
                let photoUrl = null;
                const file = document.getElementById('profPhoto').files[0];
                if(file) { const blob = await compressImage(file); const ref = storage.ref(`profiles/${state.user.uid}`); await ref.put(blob); photoUrl = await ref.getDownloadURL(); }
                const data = { phone, whatsapp: wa, address: addr, city: city, bank: bank };
                if(photoUrl) data.photo = photoUrl;
                await db.collection('users').doc(state.user.uid).set(data, {merge: true});
                state.profileComplete = true; 
                app.loadProfile(); 
                ui.toast("Profile Saved!");
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

        document.getElementById('editProfileBtn').onclick = () => {
            document.getElementById('profFields').disabled = false;
            document.getElementById('saveProfile').classList.remove('hidden');
            document.getElementById('editProfileBtn').classList.add('hidden');
        };

        // --- ADD FUNCTIONS ---
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

        // PARTS, SERVICES, ETC.
        ['Part','Service','Rental','Finance','Insurance'].forEach(type => {
            const form = document.getElementById(`formAdd${type}`);
            if(form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    const fileInput = document.getElementById(`${type.toLowerCase().charAt(0)}Photos`);
                    const file = fileInput ? fileInput.files[0] : null;
                    if(!file && type !== 'Finance') return ui.toast("Photo required", "error"); 
                    ui.showLoader(true);
                    try {
                        let url = 'https://via.placeholder.com/300';
                        if(file) { const blob = await compressImage(file); const ref = storage.ref(`${type.toLowerCase()}s/${state.user.uid}/${Date.now()}`); await ref.put(blob); url = await ref.getDownloadURL(); }
                        
                        let data = { uid: state.user.uid, published: true, createdAt: firebase.firestore.FieldValue.serverTimestamp(), image: url };
                        // Populate specific fields based on ID conventions
                        const inputs = form.querySelectorAll('input:not([type=file]), select, textarea');
                        inputs.forEach(inp => {
                            const key = inp.id.substring(1).toLowerCase(); // remove prefix
                            if(key) data[key] = inp.value;
                        });

                        const colMap = { 'Part': 'parts', 'Service': 'services', 'Rental': 'rentals', 'Finance': 'finance_packages', 'Insurance': 'insurance_packages' };
                        await db.collection(colMap[type]).add(data);
                        form.reset(); ui.toast("Published!"); ui.switchTab(`tabMy${type === 'Part' ? 'Parts' : type + 's'}`.replace('Finances','Finance')); // fix plural
                    } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
                };
            }
        });

        // USER GARAGE
        if(document.getElementById('formUserGarage')) {
            document.getElementById('formUserGarage').onsubmit = async (e) => {
                e.preventDefault();
                ui.showLoader(true);
                try {
                    await db.collection('user_garage').add({
                        uid: state.user.uid, brand: document.getElementById('ugBrand').value, model: document.getElementById('ugModel').value, year: document.getElementById('ugYear').value, reg: document.getElementById('ugReg').value, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    document.getElementById('formUserGarage').reset(); ui.toast("Added to Garage!"); app.loadUserGarage();
                } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
            };
        }

        // EDIT VEHICLE
        document.getElementById('formEditVehicle').onsubmit = async (e) => {
            e.preventDefault(); const id = document.getElementById('editVId').value;
            ui.showLoader(true);
            try {
                await db.collection('vehicles').doc(id).update({
                    category: document.getElementById('editVCat').value, brand: document.getElementById('editVBrand').value, model: document.getElementById('editVModel').value, year: document.getElementById('editVYear').value, price: document.getElementById('editVPrice').value, desc: document.getElementById('editVDesc').value
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
            
            await db.collection('sites').doc(state.user.uid).set({ saleName: name, slug: slug, role: state.role, city: userDoc.data().city }, {merge: true});
            document.getElementById('websiteLockScreen').classList.add('hidden'); document.getElementById('websiteEditor').classList.remove('hidden');
            const link = `${window.location.origin}${window.location.pathname}#/${slug}`;
            document.getElementById('mySiteLink').innerText = link; document.getElementById('mySiteLink').href = link;
        };

        // SOCIAL
        document.getElementById('btnUnlockSocial').onclick = async () => {
            const name = document.getElementById('socialRealName').value; const file = document.getElementById('socialRealPhoto').files[0];
            if(!name || !file) return ui.toast("Name and Photo Required", "error");
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

        // CHAT SEND
        document.getElementById('chatForm').onsubmit = async (e) => {
            e.preventDefault(); const threadId = document.getElementById('chatThreadId').value; const text = document.getElementById('chatMessage').value.trim(); if(!text) return;
            try {
                await db.collection('chats').doc(threadId).collection('messages').add({ text: text, sender: state.user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                await db.collection('chats').doc(threadId).update({ lastMessage: text, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                document.getElementById('chatMessage').value = '';
            } catch(e) { ui.toast("Error sending", "error"); }
        };

        // PROMOTE: BUY CREDITS
        document.getElementById('formBuyCredits').onsubmit = async (e) => {
            e.preventDefault();
            const file = document.getElementById('creditReceipt').files[0];
            if(!file) return ui.toast("Receipt required", "error");
            ui.showLoader(true);
            try {
                const blob = await compressImage(file);
                const ref = storage.ref(`receipts/${state.user.uid}_${Date.now()}`);
                await ref.put(blob);
                const url = await ref.getDownloadURL();
                
                await db.collection('credit_requests').add({
                    uid: state.user.uid,
                    receipt: url,
                    status: 'pending',
                    amount: 1000,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                document.getElementById('formBuyCredits').reset();
                ui.toast("Request Submitted! Admin will verify.");
                app.loadPromoteTab();
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };

        // PROMOTE: CREATE CAMPAIGN
        document.getElementById('formCreateAd').onsubmit = async (e) => {
            e.preventDefault();
            const uDoc = await db.collection('users').doc(state.user.uid).get();
            const credits = uDoc.data().credits || 0;
            if(credits < 1) return ui.toast("Insufficient Credits. Please buy more.", "error");

            ui.showLoader(true);
            try {
                let imgUrl = null;
                const file = document.getElementById('adImage').files[0];
                if(file) { const blob = await compressImage(file); const ref = storage.ref(`ads/${Date.now()}`); await ref.put(blob); imgUrl = await ref.getDownloadURL(); }

                const data = {
                    uid: state.user.uid,
                    title: document.getElementById('adTitle').value,
                    content: document.getElementById('adContent').value,
                    link: document.getElementById('adLink').value,
                    target: document.getElementById('adTarget').value,
                    image: imgUrl,
                    status: 'active',
                    clicks: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('ads').add(data);
                // Deduct Credit
                await db.collection('users').doc(state.user.uid).update({ credits: firebase.firestore.FieldValue.increment(-1) });
                
                document.getElementById('formCreateAd').reset();
                ui.toast("Message Sent Successfully!");
                app.loadPromoteTab();
            } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
        };
    },

    renderPhotoStaging: () => { const box = document.getElementById('vPhotoStaging'); box.innerHTML = ''; state.vehicleImages.forEach((file, index) => { box.innerHTML += `<div class="img-stage-item"><img src="${URL.createObjectURL(file)}"><div class="img-remove-btn" onclick="app.removeStagedPhoto(${index})">x</div></div>`; }); },
    removeStagedPhoto: (index) => { state.vehicleImages.splice(index, 1); app.renderPhotoStaging(); },

    loadProfile: async () => {
        const doc = await db.collection('users').doc(state.user.uid).get();
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('profPhone').value = d.phone || ''; document.getElementById('profWhatsapp').value = d.whatsapp || ''; document.getElementById('profAddress').value = d.address || ''; document.getElementById('profCity').value = d.city || ''; document.getElementById('profBank').value = d.bank || '';
            if(state.profileComplete) {
                document.getElementById('profFields').disabled = true; document.getElementById('profileNotice').classList.add('hidden'); document.getElementById('saveProfile').classList.add('hidden'); document.getElementById('editProfileBtn').classList.remove('hidden');
                if(d.photo) document.getElementById('dashAvatar').innerHTML = `<img src="${d.photo}">`;
            }
        }
    },

    loadMyData: async (collection, listId, filterTerm = '') => {
        const list = document.getElementById(listId); list.innerHTML = '<div class="spinner"></div>';
        const snap = await db.collection(collection).where('uid', '==', state.user.uid).get();
        list.innerHTML = '';
        if(snap.empty) { list.innerHTML = '<p>No items found.</p>'; return; }

        snap.forEach(doc => {
            const d = doc.data();
            if(filterTerm && !JSON.stringify(d).toLowerCase().includes(filterTerm.toLowerCase())) return;

            const badge = d.published ? '<span class="status-indicator status-published">Published</span>' : '<span class="status-indicator status-hidden">Hidden</span>';
            const img = (d.images && d.images[0]) || d.image || 'https://via.placeholder.com/300';
            
            let title = d.brand ? `${d.brand} ${d.model}` : (d.title || d.name);
            let price = d.price ? `Rs. ${d.price}` : (d.daily ? `Rs. ${d.daily}/day` : '');

            let html = `<div class="v-card">${badge}<img src="${img}"><div class="v-info"><h4>${title}</h4><p class="v-price">${price}</p><div class="v-actions">`;
            
            if(collection === 'vehicles') html += `<button class="btn btn-primary btn-sm" onclick="app.openEditModal('${doc.id}')">Edit</button>`;
            
            html += `<button class="btn btn-outline btn-sm" onclick="app.togglePublish('${collection}', '${doc.id}', ${d.published})">${d.published ? 'Hide' : 'Show'}</button>
                     <button class="btn btn-danger btn-sm" onclick="app.deleteItem('${collection}', '${doc.id}')">Delete</button>
                     </div></div></div>`;
            list.innerHTML += html;
        });
    },

    loadUserGarage: async () => {
        const list = document.getElementById('myGarageList');
        const snap = await db.collection('user_garage').where('uid', '==', state.user.uid).get();
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="v-card" style="padding:15px;text-align:center;"><i class="fa-solid fa-car text-primary" style="font-size:3rem;margin-bottom:10px;"></i><h4>${d.brand} ${d.model} (${d.year})</h4><button class="btn btn-danger btn-sm full-width mt-2" onclick="app.deleteItem('user_garage', '${doc.id}')">Remove</button></div>`;
        });
    },

    searchVehicles: () => {
        const term = document.getElementById('searchV').value;
        app.loadMyData('vehicles', 'myVehiclesList', term);
    },

    openEditModal: async (id) => {
        const doc = await db.collection('vehicles').doc(id).get(); const d = doc.data();
        document.getElementById('editVId').value = id;
        document.getElementById('editVBrand').value = d.brand; document.getElementById('editVModel').value = d.model; document.getElementById('editVYear').value = d.year; document.getElementById('editVPrice').value = d.price; document.getElementById('editVDesc').value = d.desc;
        document.getElementById('editVehicleModal').classList.remove('hidden');
    },

    togglePublish: async (col, id, status) => { ui.showLoader(true); await db.collection(col).doc(id).update({published: !status}); app.loadMyData(col, 'my' + col.charAt(0).toUpperCase() + col.slice(1) + (col.endsWith('s')?'List':'List')); ui.showLoader(false); },
    deleteItem: async (col, id) => { if(!confirm("Delete this item?")) return; ui.showLoader(true); await db.collection(col).doc(id).delete(); app.loadMyData(col, 'my' + col.charAt(0).toUpperCase() + col.slice(1) + (col.endsWith('s')?'List':'List')); ui.showLoader(false); },
    
    loadWebsiteSettings: async () => { const doc = await db.collection('sites').doc(state.user.uid).get(); if(doc.exists && doc.data().saleName) { const d = doc.data(); document.getElementById('websiteLockScreen').classList.add('hidden'); document.getElementById('websiteEditor').classList.remove('hidden'); const link = `${window.location.origin}${window.location.pathname}#/${d.slug}`; document.getElementById('mySiteLink').innerText = link; document.getElementById('mySiteLink').href = link; } },
    
    // BUYER MARKETPLACE
    buyerFilter: (type) => { 
        state.buyerFilterType = type;
        document.querySelectorAll('#tabBuyerBrowse .chip').forEach(c => c.classList.remove('active'));
        if(type==='vehicles') document.getElementById('filterVehicles').classList.add('active');
        if(type==='parts') document.getElementById('filterParts').classList.add('active');
        if(type==='services') document.getElementById('filterServices').classList.add('active');
        if(type==='rentals') document.getElementById('filterRentals').classList.add('active');
        if(type==='finance_packages') document.getElementById('filterFinance').classList.add('active');
        if(type==='insurance_packages') document.getElementById('filterInsurance').classList.add('active');
        app.runBuyerSearch();
    },

    runBuyerSearch: async () => {
        const term = document.getElementById('buyerSearch').value.toLowerCase();
        const grid = document.getElementById('buyerGrid'); grid.innerHTML = 'Loading...';
        
        const col = state.buyerFilterType;
        const snap = await db.collection(col).where('published', '==', true).limit(50).get();
        let html = '';
        
        snap.forEach(doc => {
            const d = doc.data();
            let match = true;
            if(term) {
                const searchStr = `${d.brand||''} ${d.model||''} ${d.name||''} ${d.title||''} ${d.desc||''}`.toLowerCase();
                if(!searchStr.includes(term)) match = false;
            }

            if(match) {
                let cardContent = '';
                let title = d.brand ? `${d.brand} ${d.model}` : (d.title || d.name);
                let price = d.price ? `Rs. ${d.price}` : (d.daily ? `Rs. ${d.daily}/day` : (d.rate || d.premium || ''));
                
                const img = (d.images && d.images[0]) || d.image || 'https://via.placeholder.com/300';
                const clickAction = (col === 'vehicles') ? `onclick="siteRenderer.openDetailModal(${JSON.stringify(d).replace(/"/g, '&quot;')}, '')"` : '';
                
                html += `<div class="v-card"><img src="${img}" ${clickAction}><div class="v-info"><h4>${title}</h4><p class="v-price">${price}</p><button class="btn btn-primary full-width btn-sm" onclick="app.openBuyerChat('${d.uid}', 'Seller')">Chat Seller</button></div></div>`;
            }
        });
        grid.innerHTML = html || '<p>No results found.</p>';
    },

    // DIRECTORY
    loadDirectory: async () => { 
        const grid = document.getElementById('sellersGrid'); grid.innerHTML = 'Loading...'; 
        const snap = await db.collection('sites').orderBy('saleName').limit(50).get(); 
        state.allSites = []; 
        snap.forEach(doc => { const d = doc.data(); if(d.saleName && d.slug) state.allSites.push({id: doc.id, ...d}); }); 
        app.filterConnect(); 
    },
    connectFilter: (role) => { app.currentConnectRole = role; app.filterConnect(); },
    filterConnect: () => { 
        const search = document.getElementById('connectSearch').value.toLowerCase(); 
        const city = document.getElementById('connectCity').value.toLowerCase(); 
        let filtered = state.allSites; 
        if(app.currentConnectRole && app.currentConnectRole !== 'all') filtered = filtered.filter(s => s.role === app.currentConnectRole); 
        if(search) filtered = filtered.filter(s => s.saleName.toLowerCase().includes(search)); 
        if(city) filtered = filtered.filter(s => s.city && s.city.toLowerCase().includes(city)); 
        const grid = document.getElementById('sellersGrid'); grid.innerHTML = ''; 
        filtered.forEach(s => { 
            const logo = s.logo || 'https://via.placeholder.com/80?text=Logo'; 
            const link = `${window.location.origin}${window.location.pathname}#/${s.slug}`; 
            // FIXED: Passing Business Name to chat
            const safeName = s.saleName.replace(/'/g, "\\'");
            grid.innerHTML += `<div class="biz-card"><div class="biz-banner"></div><div class="biz-content"><img src="${logo}" class="biz-logo"><h3>${s.saleName}</h3><div class="biz-meta"><span><i class="fa-solid fa-location-dot"></i> ${s.city||'Sri Lanka'}</span><span class="badge">${s.role}</span></div><div class="biz-actions"><a href="${link}" target="_blank" class="btn btn-primary btn-sm full-width">Visit Page</a><button class="btn btn-outline btn-sm full-width" onclick="app.openBuyerChat('${s.id}', '${safeName}')">Chat</button></div></div></div>`; 
        }); 
    },

    // SOCIAL
    loadConnectSection: async () => { const doc = await db.collection('users').doc(state.user.uid).get(); if(!doc.data().socialName) { document.getElementById('socialLockScreen').classList.remove('hidden'); document.getElementById('socialFeedArea').classList.add('hidden'); } else { document.getElementById('socialLockScreen').classList.add('hidden'); document.getElementById('socialFeedArea').classList.remove('hidden'); app.loadFeed(); } },
    loadFeed: async () => { const div = document.getElementById('feedStream'); div.innerHTML = '<p class="text-center">Loading updates...</p>'; const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(20).get(); div.innerHTML = ''; snap.forEach(doc => { const p = doc.data(); const date = p.createdAt ? new Date(p.createdAt.toDate()).toLocaleDateString() : ''; const imgHtml = p.image ? `<img src="${p.image}" class="feed-img">` : ''; div.innerHTML += `<div class="feed-card"><div class="feed-header"><img src="${p.avatar}" class="feed-avatar"><div><strong>${p.author}</strong><br><small class="text-secondary">${date}</small></div></div><p>${p.text}</p>${imgHtml}</div>`; }); },
    showFeed: () => { document.getElementById('feedStream').classList.remove('hidden'); document.getElementById('peopleStream').classList.add('hidden'); document.getElementById('chatListStream').classList.add('hidden'); document.getElementById('postCreator').classList.remove('hidden'); },
    
    // FIXED: showPeople now correctly passes the name to openBuyerChat
    showPeople: async () => { 
        document.getElementById('feedStream').classList.add('hidden'); 
        document.getElementById('chatListStream').classList.add('hidden'); 
        document.getElementById('postCreator').classList.add('hidden'); 
        const grid = document.getElementById('peopleStream'); 
        grid.classList.remove('hidden'); 
        grid.innerHTML = 'Loading...'; 
        const snap = await db.collection('users').where('socialName', '!=', null).limit(20).get(); 
        grid.innerHTML = ''; 
        snap.forEach(doc => { 
            const u = doc.data(); 
            // We filter out the current user, but if logic fails, the chat function also protects
            if(doc.id === state.user.uid) return;
            
            const safeName = (u.socialName || 'User').replace(/'/g, "\\'");
            grid.innerHTML += `<div class="biz-card" style="padding:10px;text-align:center;"><img src="${u.socialPhoto}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin:0 auto 10px;border:2px solid #2563eb;"><h4>${u.socialName}</h4><span class="online-dot" style="margin-bottom:10px;"></span> Online<button class="btn btn-success btn-sm full-width" onclick="app.openBuyerChat('${doc.id}', '${safeName}')">Message</button></div>`; 
        }); 
    },
    
    showChats: async () => {
        document.getElementById('feedStream').classList.add('hidden'); document.getElementById('peopleStream').classList.add('hidden'); document.getElementById('postCreator').classList.add('hidden');
        const list = document.getElementById('chatListStream'); list.classList.remove('hidden'); list.innerHTML = 'Loading chats...';
        const snap = await db.collection('chats').where('participants', 'array-contains', state.user.uid).orderBy('updatedAt', 'desc').get();
        list.innerHTML = ''; if(snap.empty) { list.innerHTML = '<p>No conversations yet.</p>'; return; }
        snap.forEach(doc => { const c = doc.data(); list.innerHTML += `<div class="feed-card" style="cursor:pointer" onclick="app.openChatModal('${doc.id}', 'Chat')"><strong>Chat</strong> <br><small>${c.lastMessage || 'Start of conversation'}</small></div>`; });
    },
    
    // FIXED: openBuyerChat now accepts a Name, shows a Loader, and Handles Errors
    openBuyerChat: async (targetUid, targetName = 'User') => {
        if(targetUid === state.user.uid) return ui.toast("You cannot message yourself.", "error");

        ui.showLoader(true, "Opening Chat..."); // Visual feedback

        try {
            const participants = [state.user.uid, targetUid].sort();
            const threadId = participants.join('_');
            const doc = await db.collection('chats').doc(threadId).get();

            if(!doc.exists) {
                await db.collection('chats').doc(threadId).set({ 
                    participants: participants, 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(), 
                    lastMessage: '' 
                });
            }
            app.openChatModal(threadId, targetName);
        } catch (e) {
            ui.toast("Error opening chat: " + e.message, "error");
        } finally {
            ui.showLoader(false);
        }
    },
    
    openChatModal: (threadId, name) => {
        document.getElementById('chatModal').classList.remove('hidden'); document.getElementById('chatUserName').innerText = name; document.getElementById('chatThreadId').value = threadId; document.getElementById('chatHistory').innerHTML = '<p>Loading...</p>';
        if(app.chatUnsubscribe) app.chatUnsubscribe();
        app.chatUnsubscribe = db.collection('chats').doc(threadId).collection('messages').orderBy('createdAt', 'asc').onSnapshot(snap => {
            const div = document.getElementById('chatHistory'); div.innerHTML = '';
            snap.forEach(doc => { const m = doc.data(); const isMe = m.sender === state.user.uid; div.innerHTML += `<div style="text-align:${isMe?'right':'left'};margin-bottom:8px;"><span style="background:${isMe?'#eff6ff':'#f1f5f9'};padding:8px 12px;border-radius:12px;display:inline-block;border:${isMe?'1px solid #bfdbfe':'1px solid #e2e8f0'}">${m.text}</span></div>`; });
            div.scrollTop = div.scrollHeight;
        });
    },

    // PROMOTE & BIZ MESSAGES
    loadPromoteTab: async () => {
        const uDoc = await db.collection('users').doc(state.user.uid).get();
        const credits = uDoc.data().credits || 0;
        document.getElementById('userAdCredits').innerText = credits;
        
        // Load pending credit requests
        const reqSnap = await db.collection('credit_requests').where('uid', '==', state.user.uid).where('status', '==', 'pending').get();
        if(!reqSnap.empty) {
            const req = reqSnap.docs[0].data();
            const el = document.getElementById('creditStatus');
            el.classList.remove('hidden');
            el.innerHTML = `Credit Request Pending. Date: ${req.createdAt.toDate().toLocaleDateString()}`;
        }

        // Load My Ads
        const adsSnap = await db.collection('ads').where('uid', '==', state.user.uid).orderBy('createdAt', 'desc').get();
        const list = document.getElementById('myAdsList');
        list.innerHTML = '';
        if(adsSnap.empty) list.innerHTML = '<p>No active campaigns.</p>';
        adsSnap.forEach(doc => {
            const a = doc.data();
            list.innerHTML += `<div class="card" style="padding:15px; border-left:4px solid var(--primary);">
                <h4>${a.title}</h4>
                <p>Target: ${a.target}</p>
                <p><strong>Clicks: ${a.clicks}</strong></p>
                <small class="text-secondary">${a.createdAt.toDate().toLocaleDateString()}</small>
            </div>`;
        });
    },

    loadBizMessages: async () => {
        const uDoc = await db.collection('users').doc(state.user.uid).get();
        document.getElementById('myPendingEarnings').innerText = uDoc.data().earnings || 0;

        const list = document.getElementById('bizMessageList');
        list.innerHTML = '<div class="spinner"></div>';
        
        // Simple logic: Load ALL active ads. In prod, you'd filter by 'target' (seller/buyer/all)
        const snap = await db.collection('ads').where('status', '==', 'active').orderBy('createdAt', 'desc').limit(20).get();
        list.innerHTML = '';
        
        if(snap.empty) { list.innerHTML = '<p>No new messages.</p>'; return; }

        snap.forEach(doc => {
            const a = doc.data();
            // Don't show own ads
            if(a.uid === state.user.uid) return;

            const imgHtml = a.image ? `<img src="${a.image}" class="feed-img">` : '';
            list.innerHTML += `<div class="feed-card">
                <span class="ad-badge">Promoted</span>
                <h3>${a.title}</h3>
                <p>${a.content}</p>
                ${imgHtml}
                <button class="btn btn-primary full-width mt-4" onclick="app.clickBizMessage('${doc.id}', '${a.link}')">
                    Visit Link (Earn Rs. 2)
                </button>
            </div>`;
        });
    },

    clickBizMessage: async (adId, link) => {
        window.open(link, '_blank');
        
        // Increment Ad Click
        db.collection('ads').doc(adId).update({ clicks: firebase.firestore.FieldValue.increment(1) });
        
        // Pay User
        db.collection('users').doc(state.user.uid).update({ earnings: firebase.firestore.FieldValue.increment(2) });
        
        ui.toast("Rs. 2 added to pending earnings!");
        setTimeout(() => app.loadBizMessages(), 1000); // refresh UI
    },

    // ADMIN DASHBOARD
    loadAdminDashboard: async () => {
        // Credits
        const credList = document.getElementById('adminCreditList');
        const credSnap = await db.collection('credit_requests').where('status', '==', 'pending').get();
        credList.innerHTML = '';
        credSnap.forEach(doc => {
            const d = doc.data();
            credList.innerHTML += `<div class="card" style="padding:10px;">
                <p>User: ${d.uid}</p>
                <a href="${d.receipt}" target="_blank">View Receipt</a>
                <button class="btn btn-success btn-sm mt-2" onclick="app.approveCredit('${doc.id}', '${d.uid}', ${d.amount})">Approve ${d.amount} Credits</button>
            </div>`;
        });

        // Payouts (Users with > 500 earnings)
        const payList = document.getElementById('adminPayoutList');
        const paySnap = await db.collection('users').where('earnings', '>=', 100).get(); // Limit set low for testing
        payList.innerHTML = '';
        paySnap.forEach(doc => {
            const u = doc.data();
            payList.innerHTML += `<div class="card" style="padding:10px;">
                <p>User: ${u.email}</p>
                <p>Pending: Rs. ${u.earnings}</p>
                <p>Bank: ${u.bank || 'Not Set'}</p>
                <button class="btn btn-primary btn-sm mt-2" onclick="app.markPaid('${doc.id}')">Mark Paid</button>
            </div>`;
        });
    },

    approveCredit: async (reqId, userId, amount) => {
        if(!confirm("Approve this payment?")) return;
        ui.showLoader(true);
        try {
            await db.collection('users').doc(userId).update({ credits: firebase.firestore.FieldValue.increment(amount) });
            await db.collection('credit_requests').doc(reqId).update({ status: 'approved' });
            ui.toast("Credits added!");
            app.loadAdminDashboard();
        } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
    },

    markPaid: async (userId) => {
        if(!confirm("Confirm you have manually transferred the funds?")) return;
        ui.showLoader(true);
        await db.collection('users').doc(userId).update({ earnings: 0 }); // Reset earnings
        ui.toast("User marked as paid");
        app.loadAdminDashboard();
        ui.showLoader(false);
    }
};

const siteRenderer = {
    loadBySlug: async (slug) => {
        ui.showLoader(true, "Building Experience...");
        try {
            const sitesSnap = await db.collection('sites').where('slug', '==', slug).limit(1).get();
            if(sitesSnap.empty) throw new Error("Page not found");
            const uid = sitesSnap.docs[0].id; const s = sitesSnap.docs[0].data();
            const uDoc = await db.collection('users').doc(uid).get(); const u = uDoc.data();

            document.getElementById('genSiteName').innerText = s.saleName; 
            document.getElementById('genSiteCity').innerText = u.city || 'Sri Lanka'; 

            if(u.whatsapp) { document.getElementById('floatWhatsapp').href = `https://wa.me/${u.whatsapp.replace('+','')}`; document.getElementById('floatWhatsapp').classList.remove('hidden'); }

            const main = document.getElementById('genDynamicContent');
            main.innerHTML = '';

            // DYNAMIC RENDERER: Use sections from Page Builder if available
            if(s.sections && s.sections.length > 0) {
                for(const sec of s.sections) {
                    if(!sec.visible) continue;
                    
                    if(sec.type === 'hero') {
                        main.innerHTML += `<section class="hero-card">
                            <h1>${sec.content.title}</h1>
                            <p>${sec.content.subtitle}</p>
                            <a href="#inventory" class="btn-cta">${sec.content.cta}</a>
                        </section>`;
                    }
                    else if(sec.type === 'about') {
                        main.innerHTML += `<section id="about" class="about-section">
                            <h3>${sec.content.heading}</h3>
                            <p>${sec.content.text}</p>
                        </section>`;
                    }
                    else if(sec.type === 'vehicles' || sec.type === 'rentals') {
                        // For inventory, we inject a container and let JS fetch the real data
                        const invId = `inv_${sec.id}`;
                        main.innerHTML += `<section id="vehicles">
                            <h3>${sec.content.title || 'Inventory'}</h3>
                            <div class="search-inline"><input id="genSearch" placeholder="Search..."><button onclick="siteRenderer.filterGenGrid()">Search</button></div>
                            <div id="${invId}" class="vehicles-grid">Loading Inventory...</div>
                        </section>`;
                        // Async load inventory
                        siteRenderer.loadInventoryGrid(uid, s.role, invId);
                    }
                    else if(sec.type === 'contact') {
                        main.innerHTML += `<section id="contact" class="contact-section">
                            <h3>Contact Us</h3>
                            <p><i class="fa-solid fa-phone"></i> ${sec.content.phone || u.phone}</p>
                            <p><i class="fa-solid fa-envelope"></i> ${sec.content.email || u.email}</p>
                            <p><i class="fa-solid fa-location-dot"></i> ${sec.content.address || u.address}</p>
                        </section>`;
                    }
                }
            } else {
                // FALLBACK: Default Layout if no Page Builder data
                main.innerHTML = `<section class="hero-card"><h1>${s.saleName}</h1><p>Welcome to our official page.</p></section>
                <div id="fallbackInv" class="vehicles-grid"></div>`;
                siteRenderer.loadInventoryGrid(uid, s.role, 'fallbackInv');
            }

        } catch(e) { document.body.innerHTML = `<h1>${e.message}</h1>`; }
        ui.showLoader(false);
    },

    loadInventoryGrid: async (uid, role, containerId) => {
        let collection = 'vehicles';
        if(role === 'rental') collection = 'rentals';
        if(role === 'finance') collection = 'finance_packages';
        if(role === 'insurance') collection = 'insurance_packages';
        if(role === 'parts') collection = 'parts';
        if(role === 'service') collection = 'services';

        const items = await db.collection(collection).where('uid', '==', uid).where('published', '==', true).get();
        const grid = document.getElementById(containerId);
        grid.innerHTML = '';
        
        if(items.empty) { grid.innerHTML = '<p>No items listed yet.</p>'; return; }

        items.forEach(doc => {
            const d = doc.data();
            const img = (d.images && d.images[0]) || d.image || 'https://via.placeholder.com/300';
            
            let html = `<div class="vehicle-card" onclick="siteRenderer.openDetailModal(${JSON.stringify(d).replace(/"/g, '&quot;')})">
                <img src="${img}">
                <div class="v-details">
                    <h4>${d.brand || d.title || d.name} ${d.model || ''}</h4>`;
            
            if(d.price) html += `<p class="price">Rs. ${d.price}</p>`;
            else if(d.daily) html += `<p class="price">Rs. ${d.daily}/day</p>`;
            
            html += `<p class="meta">${d.year ? d.year : ''} ${d.fuel ? ' | '+d.fuel : ''}</p>
                </div>
            </div>`;
            
            grid.innerHTML += html;
        });
    },

    openDetailModal: (d) => {
        const modal = document.getElementById('siteVehicleModal'); const content = document.getElementById('siteModalContent');
        
        let slides = '';
        if(d.images && d.images.length > 0) {
            slides = d.images.map((img, i) => `<img src="${img}" class="slide-img ${i===0?'active':''}" onclick="siteRenderer.openLightbox('${img}')">`).join('');
            if(d.images.length > 1) slides += `<button class="slider-btn prev-btn" onclick="siteRenderer.moveSlide(-1)">&#10094;</button><button class="slider-btn next-btn" onclick="siteRenderer.moveSlide(1)">&#10095;</button>`;
        } else {
            slides = `<img src="${d.image}" class="slide-img active" style="width:100%">`;
        }

        content.innerHTML = `<div class="slider-container">${slides}</div>
        <div class="modal-info">
            <h2>${d.brand || d.title} ${d.model || ''}</h2>
            <p class="text-primary font-bold text-lg">${d.price ? 'Rs. '+d.price : (d.daily ? 'Rs. '+d.daily+'/day' : '')}</p>
            <div class="mt-4 p-4 bg-light rounded" style="color:black; white-space: pre-wrap;">${d.desc || 'No description provided.'}</div>
            <a href="javascript:void(0)" class="btn btn-success full-width mt-4" onclick="alert('Contact number in About section')"><i class="fa-brands fa-whatsapp"></i> Contact Seller</a>
        </div>`;
        modal.classList.remove('hidden'); siteRenderer.currentSlide = 0; siteRenderer.totalSlides = (d.images || []).length;
    },
    
    moveSlide: (dir) => { 
        if(siteRenderer.totalSlides <= 1) return;
        const imgs = document.querySelectorAll('.slide-img'); 
        imgs[siteRenderer.currentSlide].style.display = 'none'; 
        siteRenderer.currentSlide = (siteRenderer.currentSlide + dir + siteRenderer.totalSlides) % siteRenderer.totalSlides; 
        imgs[siteRenderer.currentSlide].style.display = 'block'; 
    },
    openLightbox: (src) => { document.getElementById('lightboxImg').src = src; document.getElementById('lightboxModal').classList.remove('hidden'); },
    filterGenGrid: () => { const q = document.getElementById('genSearch').value.toLowerCase(); document.querySelectorAll('.vehicle-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? 'flex' : 'none'); }
};

document.addEventListener('DOMContentLoaded', app.init);
