/* ---------------------------
   script.js - full updated
   Includes: patched handlers + Biz Messages (purchases, admin approve, buyer claims)
   --------------------------- */

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

/* -----------------------
   UI helpers & safety
   ----------------------- */
window.ui = {
    showLoader: (show, text="Processing...") => {
        const el = document.getElementById('loader');
        if(el) {
            const txt = document.getElementById('loaderText');
            if(txt) txt.innerText = text;
            show ? el.classList.remove('hidden') : el.classList.add('hidden');
        }
    },
    toast: (msg, type='success') => {
        const container = document.getElementById('toastContainer');
        if(!container) return console.log('toast:', msg);
        const div = document.createElement('div'); div.className = `toast ${type}`; div.innerText = msg;
        container.appendChild(div); setTimeout(()=>div.remove(), 4000);
    },
    showView: (id) => {
        document.querySelectorAll('.view').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });
        const target = document.getElementById(id);
        if(target) { target.classList.remove('hidden'); target.classList.add('active'); }
    },
    switchTab: (id) => {
        if(state.user && !state.profileComplete && id !== 'tabProfile') return ui.toast("Please complete your Profile Settings first!", "error");

        document.querySelectorAll('.dash-tab').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(id);
        if(target) { target.classList.remove('hidden'); target.classList.add('active'); }
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
            if(id === 'tabBizMessages') { app.loadActiveBizMessages(); app.loadBuyerEarnings(); }
        }
    },
    closeModal: () => document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden')),

    resetDashboard: () => {
        const safeVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        safeVal('profPhone', ''); safeVal('profWhatsapp', ''); safeVal('profAddress', ''); safeVal('profCity', '');
        safeVal('profBankName', ''); safeVal('profBankAcc', ''); safeVal('profBankHolder', '');
        const profFields = document.getElementById('profFields'); if(profFields) profFields.disabled = false;
        const notice = document.getElementById('profileNotice'); if(notice) notice.classList.remove('hidden');
        const editBtn = document.getElementById('editProfileBtn'); if(editBtn) editBtn.classList.add('hidden');
        const saveBtn = document.getElementById('saveProfile'); if(saveBtn) saveBtn.classList.remove('hidden');
        const avatar = document.getElementById('dashAvatar'); if(avatar) avatar.innerHTML = '<i class="fa-solid fa-user"></i>';
        const dashEmail = document.getElementById('dashEmail'); if(dashEmail) dashEmail.innerText = 'User';
        const form = document.getElementById('formAddVehicle'); if(form) form.reset();
        const staging = document.getElementById('vPhotoStaging'); if(staging) staging.innerHTML = '';
        state.vehicleImages.forEach(f => { if(f && f._url) try{URL.revokeObjectURL(f._url);}catch(e){} });
        state.vehicleImages = [];
        const websiteEditor = document.getElementById('websiteEditor'); if(websiteEditor) websiteEditor.classList.add('hidden');
        const websiteLock = document.getElementById('websiteLockScreen'); if(websiteLock) websiteLock.classList.remove('hidden');
        safeVal('initSaleName', '');
        safeVal('webName', '');
        const mySiteLink = document.getElementById('mySiteLink'); if(mySiteLink) mySiteLink.innerText = '...';
        state.user = null; state.profileComplete = false; state.inventory = [];
    },

    renderSidebar: (role) => {
        const nav = document.getElementById('dynamicSidebar');
        if(!nav) return;
        let html = `<button onclick="ui.switchTab('tabProfile')" class="nav-item active"><i class="fa-solid fa-id-card"></i> Profile</button>`;
        if(role === 'seller') html += `<button onclick="ui.switchTab('tabAddVehicle')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Vehicle</button><button onclick="ui.switchTab('tabMyVehicles')" class="nav-item"><i class="fa-solid fa-list"></i> My Vehicles</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'parts') html += `<button onclick="ui.switchTab('tabAddPart')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Product</button><button onclick="ui.switchTab('tabMyParts')" class="nav-item"><i class="fa-solid fa-box"></i> My Products</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'service' || role === 'finance') html += `<button onclick="ui.switchTab('tabAddService')" class="nav-item"><i class="fa-solid fa-plus"></i> Add Service</button><button onclick="ui.switchTab('tabMyServices')" class="nav-item"><i class="fa-solid fa-list-check"></i> My Services</button><button onclick="ui.switchTab('tabWebsite')" class="nav-item"><i class="fa-solid fa-file-code"></i> Page Builder</button>`;
        else if(role === 'buyer') html += `<button onclick="ui.switchTab('tabBuyerBrowse')" class="nav-item"><i class="fa-solid fa-search"></i> Browse</button><button onclick="ui.switchTab('tabBizMessages')" class="nav-item"><i class="fa-solid fa-envelope-circle-check"></i> Biz Messages</button>`;
        
        html += `<button onclick="ui.switchTab('tabDirectory')" class="nav-item"><i class="fa-solid fa-address-book"></i> Directory</button>`;
        html += `<button onclick="ui.switchTab('tabConnect')" class="nav-item"><i class="fa-solid fa-share-nodes"></i> Connect</button>`;
        html += `<button onclick="ui.switchTab('tabPromote')" class="nav-item"><i class="fa-solid fa-bullhorn"></i> Promote</button>`;
        nav.innerHTML = html;
        const dashRole = document.getElementById('dashRole');
        if(dashRole) dashRole.innerText = role ? role.toUpperCase() : 'USER';
    }
};

/* -----------------------
   Image compression helper
   ----------------------- */
const compressImage = async (file) => {
    if (!file) return null;
    if (file.size <= 1024 * 1024) return file;
    return new Promise((resolve) => {
        const img = new Image(); img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const canvas = document.createElement('canvas'); const scale = Math.min(1, 1200 / img.width);
            canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(async (blob) => {
                resolve(blob || file);
                try { URL.revokeObjectURL(img.src); } catch(e) {}
            }, 'image/jpeg', 0.8);
        };
        img.onerror = () => { resolve(file); try{ URL.revokeObjectURL(img.src); }catch(e){} };
    });
};

/* -----------------------
   App core
   ----------------------- */
const app = {
    init: () => {
        if(window.location.hash.startsWith('#/')) {
            const slug = window.location.hash.substring(2);
            const initLoader = document.getElementById('initLoader'); if(initLoader) initLoader.classList.add('hidden');
            const platformApp = document.getElementById('platformApp'); if(platformApp) platformApp.classList.add('hidden');
            const generatedSite = document.getElementById('generatedSite'); if(generatedSite) generatedSite.classList.remove('hidden');
            siteRenderer.loadBySlug(slug);
            return;
        }

        const sel = document.getElementById('vCat');
        if(sel && sel.options.length === 0) state.categories.forEach(c => sel.appendChild(new Option(c, c)));
        const editSel = document.getElementById('editVCat');
        if(editSel && editSel.options.length === 0) state.categories.forEach(c => editSel.appendChild(new Option(c, c)));

        auth.onAuthStateChanged(async user => {
            const initLoader = document.getElementById('initLoader'); if(initLoader) initLoader.classList.add('hidden');
            if (user) {
                state.user = user;
                try {
                    const doc = await db.collection('users').doc(user.uid).get();
                    if(doc.exists) {
                        const data = doc.data();
                        state.role = data.role || 'seller';
                        if(data.phone && data.city && data.address && data.bankName && data.bankAcc && data.bankHolder) state.profileComplete = true;
                        ui.renderSidebar(state.role);
                        const dashEmail = document.getElementById('dashEmail'); if(dashEmail) dashEmail.innerText = user.email;
                        if(data.photo) { const dashAv = document.getElementById('dashAvatar'); if(dashAv) dashAv.innerHTML = `<img src="${data.photo}">`; }
                        ui.showView('viewDashboard');
                        const btnLoginNav = document.getElementById('btnLoginNav'); if(btnLoginNav) btnLoginNav.classList.add('hidden');
                        const btnLogoutNav = document.getElementById('btnLogoutNav'); if(btnLogoutNav) btnLogoutNav.classList.remove('hidden');

                        if(user.email === 'admin@vehiclebuilder.com') {
                            const navAdmin = document.getElementById('navAdmin'); if(navAdmin) navAdmin.classList.remove('hidden');
                        }

                        ui.switchTab('tabProfile');
                    }
                } catch(e) { console.error('user load error', e); }
            } else {
                ui.resetDashboard();
                ui.showView('viewLanding');
                const btnLoginNav = document.getElementById('btnLoginNav'); if(btnLoginNav) btnLoginNav.classList.remove('hidden');
                const btnLogoutNav = document.getElementById('btnLogoutNav'); if(btnLogoutNav) btnLogoutNav.classList.add('hidden');
            }
        });

        app.setupEvents();
    },

    setupEvents: () => {
        try {
            const btnLoginNav = document.getElementById('btnLoginNav'); if(btnLoginNav) btnLoginNav.onclick = () => ui.showView('viewAuth');
            const btnLogoutNav = document.getElementById('btnLogoutNav'); if(btnLogoutNav) btnLogoutNav.onclick = () => auth.signOut();
            const btnLogin = document.getElementById('btnLogin'); if(btnLogin) btnLogin.onclick = async () => { try { ui.showLoader(true); await auth.signInWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value); ui.showLoader(false); } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); } };
            const btnSignup = document.getElementById('btnSignup'); if(btnSignup) btnSignup.onclick = async () => { const role = new URLSearchParams(window.location.search).get('role') || 'seller'; try { ui.showLoader(true); const c = await auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value, document.getElementById('authPass').value); await db.collection('users').doc(c.user.uid).set({ email: c.user.email, role: role, createdAt: new Date() }); ui.showLoader(false); ui.toast("Account Created!"); window.location.href = window.location.pathname; } catch(e) { ui.showLoader(false); ui.toast(e.message, 'error'); } };

            // PROFILE SAVE (now includes bank details)
            const saveProfileBtn = document.getElementById('saveProfile');
            if(saveProfileBtn) {
                saveProfileBtn.onclick = async () => {
                    let phone = document.getElementById('profPhone').value;
                    let wa = document.getElementById('profWhatsapp').value;
                    const city = document.getElementById('profCity').value;
                    const addr = document.getElementById('profAddress').value;
                    const bankName = document.getElementById('profBankName').value;
                    const bankAcc = document.getElementById('profBankAcc').value;
                    const bankHolder = document.getElementById('profBankHolder').value;

                    if(!phone || !wa || !addr || !city || !bankName || !bankAcc || !bankHolder) return ui.toast("All profile & bank fields are required", "error");

                    const formatPhone = (p) => { let n = p.trim(); if(n.startsWith('0')) n = '+94' + n.substring(1); else if(!n.startsWith('+')) n = '+94' + n; return n; };
                    phone = formatPhone(phone); wa = formatPhone(wa);

                    ui.showLoader(true, "Saving...");
                    try {
                        let photoUrl = null;
                        const file = document.getElementById('profPhoto') ? document.getElementById('profPhoto').files[0] : null;
                        if(file) { const blob = await compressImage(file); const ref = storage.ref(`profiles/${state.user.uid}`); await ref.put(blob); photoUrl = await ref.getDownloadURL(); }
                        const data = { phone, whatsapp: wa, address: addr, city: city, bankName, bankAcc, bankHolder };
                        if(photoUrl) data.photo = photoUrl;
                        await db.collection('users').doc(state.user.uid).set(data, {merge: true});
                        state.profileComplete = true;
                        app.loadProfile();
                        ui.toast("Profile Saved! Dashboard Unlocked.");
                    } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
                };
            }

            const editProfileBtn = document.getElementById('editProfileBtn');
            if(editProfileBtn) {
                editProfileBtn.onclick = () => {
                    const profFields = document.getElementById('profFields'); if(profFields) profFields.disabled = false;
                    const saveBtn = document.getElementById('saveProfile'); if(saveBtn) saveBtn.classList.remove('hidden');
                    editProfileBtn.classList.add('hidden');
                };
            }

            // VEHICLE PHOTOS staging
            const vPhotosInput = document.getElementById('vPhotosInput');
            if(vPhotosInput) {
                vPhotosInput.addEventListener('change', (e) => {
                    const files = Array.from(e.target.files);
                    if(state.vehicleImages.length + files.length > 10) return ui.toast("Max 10 photos", "error");
                    files.forEach(f => { f._url = URL.createObjectURL(f); state.vehicleImages.push(f); });
                    app.renderPhotoStaging();
                });
            }

            // Add vehicle submit
            const formAddVehicle = document.getElementById('formAddVehicle');
            if(formAddVehicle) {
                formAddVehicle.onsubmit = async (e) => {
                    e.preventDefault(); if(state.vehicleImages.length === 0) return ui.toast("Upload at least one photo", "error");
                    ui.showLoader(true, "Publishing...");
                    try {
                        const imgPromises = state.vehicleImages.map(file => compressImage(file).then(blob => {
                            const ref = storage.ref(`vehicles/${state.user.uid}/${Date.now()}_${Math.random()}`);
                            return ref.put(blob).then(() => ref.getDownloadURL());
                        }));
                        const imgUrls = await Promise.all(imgPromises);
                        const ytLink = document.getElementById('vYoutube') ? document.getElementById('vYoutube').value : '';
                        let ytId = '';
                        if(ytLink) { const match = ytLink.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); if (match && match[2].length == 11) ytId = match[2]; }
                        const data = {
                            uid: state.user.uid,
                            category: document.getElementById('vCat') ? document.getElementById('vCat').value : '',
                            brand: document.getElementById('vBrand') ? document.getElementById('vBrand').value : '',
                            model: document.getElementById('vModel') ? document.getElementById('vModel').value : '',
                            trim: document.getElementById('vTrim') ? document.getElementById('vTrim').value : '',
                            year: document.getElementById('vYear') ? document.getElementById('vYear').value : '',
                            condition: document.getElementById('vCond') ? document.getElementById('vCond').value : '',
                            trans: document.getElementById('vTrans') ? document.getElementById('vTrans').value : '',
                            fuel: document.getElementById('vFuel') ? document.getElementById('vFuel').value : '',
                            price: document.getElementById('vPrice') ? document.getElementById('vPrice').value : '',
                            mileage: document.getElementById('vMileage') ? document.getElementById('vMileage').value : '',
                            body: document.getElementById('vBody') ? document.getElementById('vBody').value : '',
                            engine: document.getElementById('vEngine') ? document.getElementById('vEngine').value : '',
                            book: document.getElementById('vBook') ? document.getElementById('vBook').value : '',
                            finance: document.getElementById('vFinance') ? document.getElementById('vFinance').value : '',
                            desc: document.getElementById('vDesc') ? document.getElementById('vDesc').value : '',
                            youtube: ytId,
                            images: imgUrls,
                            published: true,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        await db.collection('vehicles').add(data);
                        formAddVehicle.reset();
                        state.vehicleImages.forEach(f => { if(f && f._url) try{ URL.revokeObjectURL(f._url);}catch(e){} });
                        state.vehicleImages = [];
                        const staging = document.getElementById('vPhotoStaging'); if(staging) staging.innerHTML = '';
                        ui.toast("Published!");
                        ui.switchTab('tabMyVehicles');
                    } catch(err) { ui.toast(err.message, "error"); } finally { ui.showLoader(false); }
                };
            }

            // FULL EDIT VEHICLE
            const formEditVehicle = document.getElementById('formEditVehicle');
            if(formEditVehicle) {
                formEditVehicle.onsubmit = async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('editVId') ? document.getElementById('editVId').value : null;
                    const ytLink = document.getElementById('editVYoutube') ? document.getElementById('editVYoutube').value : '' ;
                    let ytId = '';
                    if(ytLink) { const match = ytLink.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); if (match && match[2].length == 11) ytId = match[2]; }
                    ui.showLoader(true);
                    try {
                        if(!id) throw new Error('Missing vehicle id');
                        await db.collection('vehicles').doc(id).update({
                            category: document.getElementById('editVCat') ? document.getElementById('editVCat').value : '',
                            brand: document.getElementById('editVBrand') ? document.getElementById('editVBrand').value : '',
                            model: document.getElementById('editVModel') ? document.getElementById('editVModel').value : '',
                            trim: document.getElementById('editVTrim') ? document.getElementById('editVTrim').value : '',
                            year: document.getElementById('editVYear') ? document.getElementById('editVYear').value : '',
                            condition: document.getElementById('editVCond') ? document.getElementById('editVCond').value : '',
                            trans: document.getElementById('editVTrans') ? document.getElementById('editVTrans').value : '',
                            fuel: document.getElementById('editVFuel') ? document.getElementById('editVFuel').value : '',
                            price: document.getElementById('editVPrice') ? document.getElementById('editVPrice').value : '',
                            mileage: document.getElementById('editVMileage') ? document.getElementById('editVMileage').value : '',
                            body: document.getElementById('editVBody') ? document.getElementById('editVBody').value : '',
                            engine: document.getElementById('editVEngine') ? document.getElementById('editVEngine').value : '',
                            book: document.getElementById('editVBook') ? document.getElementById('editVBook').value : 'Original Book',
                            finance: document.getElementById('editVFinance') ? document.getElementById('editVFinance').value : 'no',
                            desc: document.getElementById('editVDesc') ? document.getElementById('editVDesc').value : '',
                            youtube: ytId
                        });
                        ui.toast("Updated Successfully");
                        const evModal = document.getElementById('editVehicleModal'); if(evModal) evModal.classList.add('hidden');
                        app.loadMyData('vehicles', 'myVehiclesList');
                    } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
                };
            }

            // WEBSITE UNLOCK (keeps same)
            const btnUnlockWebsite = document.getElementById('btnUnlockWebsite');
            if(btnUnlockWebsite) {
                btnUnlockWebsite.onclick = async () => {
                    const nameEl = document.getElementById('initSaleName'); const name = nameEl ? nameEl.value.trim() : '';
                    if(!name) return ui.toast("Enter a name", "error");
                    const userDocSnap = await db.collection('users').doc(state.user.uid).get();
                    const userDoc = userDocSnap.exists ? userDocSnap.data() : {};
                    if(!userDoc.city) return ui.toast("Update City in Profile first!", "error");
                    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${userDoc.city.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                    const webNameEl = document.getElementById('webName'); if(webNameEl) webNameEl.value = name;
                    const websiteLock = document.getElementById('websiteLockScreen'); if(websiteLock) websiteLock.classList.add('hidden');
                    const websiteEditor = document.getElementById('websiteEditor'); if(websiteEditor) websiteEditor.classList.remove('hidden');
                    const mySiteLink = document.getElementById('mySiteLink');
                    const link = `${window.location.origin}${window.location.pathname}#/${slug}`;
                    if(mySiteLink) { mySiteLink.innerText = link; mySiteLink.href = link; }
                };
            }

            // SaveWebsite (guarded)
            const saveWebsiteBtn = document.getElementById('saveWebsite');
            if(saveWebsiteBtn) {
                saveWebsiteBtn.onclick = async () => {
                    ui.showLoader(true);
                    try {
                        const userDocSnap = await db.collection('users').doc(state.user.uid).get();
                        const userDoc = userDocSnap.exists ? userDocSnap.data() : {};
                        const webNameEl = document.getElementById('webName'); const nameVal = webNameEl ? webNameEl.value : '';
                        const slug = `${nameVal.toLowerCase().replace(/[^a-z0-9]/g, '')}-${(userDoc.city||'').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                        const data = {
                            saleName: nameVal,
                            slug: slug,
                            role: state.role,
                            city: userDoc.city || '',
                            about: document.getElementById('webAbout') ? document.getElementById('webAbout').value : '',
                            why: document.getElementById('webWhy') ? document.getElementById('webWhy').value : '',
                            fb: document.getElementById('webFb') ? document.getElementById('webFb').value : '',
                            navStyle: document.getElementById('webNavStyle') ? document.getElementById('webNavStyle').value : ''
                        };
                        const logoFile = document.getElementById('webLogo') ? document.getElementById('webLogo').files[0] : null;
                        if(logoFile) { const blob = await compressImage(logoFile); const ref = storage.ref(`sites/${state.user.uid}/logo`); await ref.put(blob); data.logo = await ref.getDownloadURL(); }
                        await db.collection('sites').doc(state.user.uid).set(data, {merge: true});
                        ui.toast("Published!");
                    } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
                };
            }

            // SOCIAL CONNECT
            const btnUnlockSocial = document.getElementById('btnUnlockSocial');
            if(btnUnlockSocial) {
                btnUnlockSocial.onclick = async () => {
                    const nameEl = document.getElementById('socialRealName'); const fileEl = document.getElementById('socialRealPhoto');
                    const name = nameEl ? nameEl.value : '';
                    const file = fileEl ? fileEl.files[0] : null;
                    if(!name || !file) return ui.toast("Real Name and Photo Required", "error");
                    ui.showLoader(true);
                    try {
                        const blob = await compressImage(file); const ref = storage.ref(`social/${state.user.uid}`); await ref.put(blob); const url = await ref.getDownloadURL();
                        await db.collection('users').doc(state.user.uid).update({ socialName: name, socialPhoto: url });
                        app.loadConnectSection();
                    } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
                };
            }

            const formPostFeed = document.getElementById('formPostFeed');
            if(formPostFeed) {
                formPostFeed.onsubmit = async (e) => {
                    e.preventDefault(); ui.showLoader(true);
                    try {
                        let imgUrl = null; const fileEl = document.getElementById('feedImage'); const file = fileEl ? fileEl.files[0] : null;
                        if(file) { const blob = await compressImage(file); const ref = storage.ref(`posts/${Date.now()}`); await ref.put(blob); imgUrl = await ref.getDownloadURL(); }
                        const userDoc = await db.collection('users').doc(state.user.uid).get();
                        await db.collection('posts').add({ uid: state.user.uid, author: userDoc.data().socialName, avatar: userDoc.data().socialPhoto, text: document.getElementById('feedText') ? document.getElementById('feedText').value : '', image: imgUrl, createdAt: firebase.firestore.FieldValue.serverTimestamp(), role: state.role });
                        formPostFeed.reset(); ui.toast("Posted!"); app.loadFeed();
                    } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
                };
            }

            // PROMOTE AD SUBMIT
            const btnSubmitAd = document.getElementById('btnSubmitAd');
            if(btnSubmitAd) {
                btnSubmitAd.onclick = async () => {
                    const file = document.getElementById('adImage') ? document.getElementById('adImage').files[0] : null;
                    const receipt = document.getElementById('adReceipt') ? document.getElementById('adReceipt').files[0] : null;
                    const url = document.getElementById('adUrl') ? document.getElementById('adUrl').value : '';
                    if(!file || !receipt || !url) return ui.toast("All fields required", "error");
                    ui.showLoader(true);
                    try {
                        const imgBlob = await compressImage(file); const recBlob = await compressImage(receipt);
                        const imgRef = storage.ref(`ads/${state.user.uid}_img`); await imgRef.put(imgBlob);
                        const recRef = storage.ref(`ads/${state.user.uid}_rec`); await recRef.put(recBlob);
                        await db.collection('ads').add({ uid: state.user.uid, image: await imgRef.getDownloadURL(), receipt: await recRef.getDownloadURL(), url: url, target: document.getElementById('adTarget') ? document.getElementById('adTarget').value : 'all', status: 'pending', clicks: 0, createdAt: new Date() });
                        ui.toast("Ad Submitted for Review!"); app.loadMyAds();
                    } catch(e) { ui.toast(e.message); } finally { ui.showLoader(false); }
                };
            }

            // ------------------------
            //  BIZ MESSAGES: purchase
            // ------------------------
            const btnBuyBizMessages = document.getElementById('btnBuyBizMessages');
            if(btnBuyBizMessages) {
                btnBuyBizMessages.onclick = async () => {
                    // only sellers/parts/service/finance should create purchases - but allow any "business" role
                    if(!state.user) return ui.toast("Sign in first", "error");
                    const message = document.getElementById('bizMessageText') ? document.getElementById('bizMessageText').value.trim() : '';
                    const qtyRaw = document.getElementById('bizMessageQty') ? document.getElementById('bizMessageQty').value : '0';
                    const qty = Math.max(0, Number(qtyRaw));
                    const receiptFile = document.getElementById('bizReceipt') ? document.getElementById('bizReceipt').files[0] : null;
                    if(!message || !qty || qty <= 0 || !receiptFile) return ui.toast("Message, quantity and receipt are required", "error");

                    const unitPrice = 5;
                    const total = unitPrice * qty; // Rs.5 per message

                    ui.showLoader(true, "Submitting purchase...");
                    try {
                        // upload receipt
                        const recBlob = await compressImage(receiptFile);
                        const recRef = storage.ref(`bizReceipts/${state.user.uid}_${Date.now()}`);
                        await recRef.put(recBlob);
                        const receiptUrl = await recRef.getDownloadURL();

                        // save purchase doc
                        const doc = {
                            uid: state.user.uid,
                            message,
                            qty,
                            remaining: qty,
                            unitPrice,
                            total,
                            receipt: receiptUrl,
                            status: 'pending',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        const r = await db.collection('bizPurchases').add(doc);
                        ui.toast("Purchase submitted. Admin will review and activate it.");
                        // refresh my purchases list
                        app.loadMyBizPurchases();
                    } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
                };
            }

            // ------------------------
            //  Admin: Approve Biz Purchases & manage claims
            // ------------------------
            // this is wired into the admin UI functions below (loadAdminAds)
        } catch(err) {
            console.error('setupEvents error', err);
        }
    },

    /* photo staging */
    renderPhotoStaging: () => {
        const box = document.getElementById('vPhotoStaging'); if(!box) return;
        box.innerHTML = '';
        state.vehicleImages.forEach((file, index) => {
            if(!file._url) file._url = URL.createObjectURL(file);
            box.innerHTML += `<div class="img-stage-item"><img src="${file._url}"><div class="img-remove-btn" onclick="app.removeStagedPhoto(${index})">x</div></div>`;
        });
    },
    removeStagedPhoto: (index) => {
        const f = state.vehicleImages[index];
        if(f && f._url) { try { URL.revokeObjectURL(f._url); } catch(e) {} }
        state.vehicleImages.splice(index, 1);
        app.renderPhotoStaging();
    },

    loadProfile: async () => {
        const doc = await db.collection('users').doc(state.user.uid).get();
        if(doc.exists) {
            const d = doc.data();
            const setIf = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
            setIf('profPhone', d.phone || ''); setIf('profWhatsapp', d.whatsapp || ''); setIf('profAddress', d.address || ''); setIf('profCity', d.city || '');
            setIf('profBankName', d.bankName || ''); setIf('profBankAcc', d.bankAcc || ''); setIf('profBankHolder', d.bankHolder || '');
            if(state.profileComplete) {
                const profFields = document.getElementById('profFields'); if(profFields) profFields.disabled = true;
                const notice = document.getElementById('profileNotice'); if(notice) notice.classList.add('hidden');
                const saveBtn = document.getElementById('saveProfile'); if(saveBtn) saveBtn.classList.add('hidden');
                const editBtn = document.getElementById('editProfileBtn'); if(editBtn) editBtn.classList.remove('hidden');
                if(d.photo) { const avatar = document.getElementById('dashAvatar'); if(avatar) avatar.innerHTML = `<img src="${d.photo}">`; }
            }
        }
    },

    /* load my items into a given list slot */
    loadMyData: async (collection, listId) => {
        const listEle = document.getElementById(listId);
        if(listEle) listEle.innerHTML = 'Loading...';
        try {
            const snap = await db.collection(collection).where('uid', '==', state.user.uid).get();
            state.inventory = [];
            snap.forEach(doc => state.inventory.push({id: doc.id, ...doc.data()}));
            // route by listId
            app.renderListTo(listId, state.inventory);
        } catch(e) {
            const listEle2 = document.getElementById(listId);
            if(listEle2) listEle2.innerHTML = 'Error loading data';
            console.error('loadMyData err', e);
        }
    },

    renderListTo: (listId, items) => {
        if(listId === 'myVehiclesList') { app.renderVehicleList(items); return; }
        if(listId === 'myPartsList') {
            const list = document.getElementById('myPartsList'); if(!list) return;
            list.innerHTML = '';
            if(items.length === 0) { list.innerHTML = '<p>No products found.</p>'; return; }
            items.forEach(d => {
                const img = d.images && d.images.length ? d.images[0] : 'https://via.placeholder.com/300';
                list.innerHTML += `<div class="v-card">${d.published ? '<span class="status-indicator status-published">Published</span>' : '<span class="status-indicator status-hidden">Hidden</span>'}<img src="${img}"><div class="v-info"><h4>${d.name || d.title || 'Product'}</h4><p class="v-price">Rs. ${d.price || ''}</p><div class="v-actions"><button class="btn btn-primary btn-sm" onclick="">Edit</button><button class="btn btn-outline btn-sm" onclick="">Toggle</button><button class="btn btn-danger btn-sm" onclick="">Delete</button></div></div></div>`;
            });
            return;
        }
        if(listId === 'myServicesList') {
            const list = document.getElementById('myServicesList'); if(!list) return;
            list.innerHTML = '';
            if(items.length === 0) { list.innerHTML = '<p>No services found.</p>'; return; }
            items.forEach(d => {
                list.innerHTML += `<div class="card"><h4>${d.name || d.title}</h4><p>${d.desc || ''}</p></div>`;
            });
            return;
        }
        const el = document.getElementById(listId);
        if(el) el.innerText = JSON.stringify(items, null, 2);
    },

    renderVehicleList: (items) => {
        const list = document.getElementById('myVehiclesList'); if(!list) return;
        list.innerHTML = '';
        const tipBox = document.getElementById('inventoryTip');
        const hasHidden = items.some(i => i.published === false);
        const hasPublished = items.some(i => i.published === true);
        if(tipBox) {
            if(hasPublished) tipBox.innerHTML = `<i class="fa-solid fa-lightbulb text-primary"></i> <strong>Tip:</strong> Use "Hide" to remove vehicles without deleting.`;
            else if(hasHidden) tipBox.innerHTML = `<i class="fa-solid fa-lightbulb text-primary"></i> <strong>Tip:</strong> Use "Show" to display your vehicle again.`;
            else tipBox.innerHTML = '';
        }
        if(items.length === 0) { list.innerHTML = '<p>No items found.</p>'; return; }
        items.forEach(d => {
            const badge = d.published ? '<span class="status-indicator status-published">Published</span>' : '<span class="status-indicator status-hidden">Hidden</span>';
            const img = d.images && d.images.length ? d.images[0] : 'https://via.placeholder.com/300';
            list.innerHTML += `<div class="v-card">${badge}<img src="${img}"><div class="v-info"><h4>${d.brand || ''} ${d.model || ''}</h4><p class="v-price">Rs. ${d.price || ''}</p><div class="v-actions"><button class="btn btn-primary btn-sm" onclick="app.openEditModal('${d.id}')">Edit</button><button class="btn btn-outline btn-sm" onclick="app.togglePublish('vehicles', '${d.id}', ${d.published})">${d.published ? 'Hide' : 'Show'}</button><button class="btn btn-danger btn-sm" onclick="app.deleteItem('vehicles', '${d.id}')">Delete</button></div></div></div>`;
        });
    },

    searchVehicles: () => {
        const term = document.getElementById('searchV') ? document.getElementById('searchV').value.toLowerCase() : '';
        const filtered = state.inventory.filter(v => (v.brand && v.brand.toLowerCase().includes(term)) || (v.model && v.model.toLowerCase().includes(term)));
        app.renderVehicleList(filtered);
    },

    openEditModal: async (id) => {
        try {
            const doc = await db.collection('vehicles').doc(id).get();
            const d = doc.data() || {};
            if(document.getElementById('editVId')) document.getElementById('editVId').value = id;
            if(document.getElementById('editVCat')) document.getElementById('editVCat').value = d.category || '';
            if(document.getElementById('editVBrand')) document.getElementById('editVBrand').value = d.brand || '';
            if(document.getElementById('editVModel')) document.getElementById('editVModel').value = d.model || '';
            if(document.getElementById('editVTrim')) document.getElementById('editVTrim').value = d.trim || '';
            if(document.getElementById('editVYear')) document.getElementById('editVYear').value = d.year || '';
            if(document.getElementById('editVCond')) document.getElementById('editVCond').value = d.condition || '';
            if(document.getElementById('editVTrans')) document.getElementById('editVTrans').value = d.trans || '';
            if(document.getElementById('editVFuel')) document.getElementById('editVFuel').value = d.fuel || '';
            if(document.getElementById('editVPrice')) document.getElementById('editVPrice').value = d.price || '';
            if(document.getElementById('editVMileage')) document.getElementById('editVMileage').value = d.mileage || '';
            if(document.getElementById('editVBody')) document.getElementById('editVBody').value = d.body || '';
            if(document.getElementById('editVEngine')) document.getElementById('editVEngine').value = d.engine || '';
            if(document.getElementById('editVBook')) document.getElementById('editVBook').value = d.book || 'Original Book';
            if(document.getElementById('editVFinance')) document.getElementById('editVFinance').value = d.finance || 'no';
            if(document.getElementById('editVDesc')) document.getElementById('editVDesc').value = d.desc || '';
            if(document.getElementById('editVYoutube')) document.getElementById('editVYoutube').value = d.youtube ? `https://youtu.be/${d.youtube}` : '';
            const modal = document.getElementById('editVehicleModal'); if(modal) modal.classList.remove('hidden');
        } catch(e) { ui.toast(e.message, 'error'); }
    },

    togglePublish: async (col, id, status) => { ui.showLoader(true); try { await db.collection(col).doc(id).update({published: !status}); app.loadMyData(col, col === 'vehicles' ? 'myVehiclesList' : (col === 'parts' ? 'myPartsList' : 'myServicesList')); } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); } },
    deleteItem: async (col, id) => { if(!confirm("Delete this item?")) return; ui.showLoader(true); try { await db.collection(col).doc(id).delete(); app.loadMyData(col, col === 'vehicles' ? 'myVehiclesList' : (col === 'parts' ? 'myPartsList' : 'myServicesList')); } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); } },

    /* Website settings + directory + connect feed (unchanged logic) */
    loadWebsiteSettings: async () => {
        try {
            const doc = await db.collection('sites').doc(state.user.uid).get();
            if(doc.exists && doc.data().saleName) {
                const d = doc.data();
                const websiteLock = document.getElementById('websiteLockScreen'); if(websiteLock) websiteLock.classList.add('hidden');
                const websiteEditor = document.getElementById('websiteEditor'); if(websiteEditor) websiteEditor.classList.remove('hidden');
                const webNameEl = document.getElementById('webName'); if(webNameEl) webNameEl.value = d.saleName;
                if(d.slug) { const link = `${window.location.origin}${window.location.pathname}#/${d.slug}`; const mySiteLink = document.getElementById('mySiteLink'); if(mySiteLink) { mySiteLink.innerText = link; mySiteLink.href = link; } }
            }
        } catch(e) { console.error('loadWebsiteSettings err', e); }
    },

    loadDirectory: async () => {
        const grid = document.getElementById('sellersGrid'); if(grid) grid.innerHTML = 'Loading...';
        try {
            const snap = await db.collection('sites').orderBy('saleName').limit(50).get();
            state.allSites = [];
            snap.forEach(doc => { const d = doc.data(); if(d.saleName && d.slug) state.allSites.push({id: doc.id, ...d}); });
            app.filterConnect();
        } catch(e) {
            if(grid) grid.innerHTML = 'Error loading';
            console.error('loadDirectory err', e);
        }
    },

    connectFilter: (role) => { app.currentConnectRole = role; app.filterConnect(); },

    filterConnect: () => {
        const search = document.getElementById('connectSearch') ? document.getElementById('connectSearch').value.toLowerCase() : '';
        const city = document.getElementById('connectCity') ? document.getElementById('connectCity').value.toLowerCase() : '';
        let filtered = state.allSites || [];
        if(app.currentConnectRole && app.currentConnectRole !== 'all') filtered = filtered.filter(s => s.role === app.currentConnectRole);
        if(search) filtered = filtered.filter(s => s.saleName && s.saleName.toLowerCase().includes(search));
        if(city) filtered = filtered.filter(s => s.city && s.city.toLowerCase().includes(city));
        const grid = document.getElementById('sellersGrid'); if(!grid) return;
        grid.innerHTML = '';
        filtered.forEach(s => {
            const logo = s.logo || 'https://via.placeholder.com/80';
            const link = `${window.location.origin}${window.location.pathname}#/${s.slug}`;
            grid.innerHTML += `<div class="biz-card"><div class="biz-banner"></div><div class="biz-content"><img src="${logo}" class="biz-logo"><h3>${s.saleName}</h3><div class="biz-meta"><span><i class="fa-solid fa-location-dot"></i> ${s.city||'Sri Lanka'}</span><span class="badge">${s.role}</span></div><div class="biz-actions"><a href="${link}" target="_blank" class="btn btn-primary btn-sm full-width">Visit Page</a></div></div></div>`;
        });
    },

    loadConnectSection: async () => {
        try {
            const doc = await db.collection('users').doc(state.user.uid).get();
            const data = doc.exists ? doc.data() : {};
            if(!data.socialName) {
                const lock = document.getElementById('socialLockScreen'); if(lock) lock.classList.remove('hidden');
                const feedArea = document.getElementById('socialFeedArea'); if(feedArea) feedArea.classList.add('hidden');
            } else {
                const lock = document.getElementById('socialLockScreen'); if(lock) lock.classList.add('hidden');
                const feedArea = document.getElementById('socialFeedArea'); if(feedArea) feedArea.classList.remove('hidden');
                app.loadFeed();
            }
        } catch(e) { console.error('loadConnectSection err', e); }
    },

    loadFeed: async () => {
        const div = document.getElementById('feedStream'); if(!div) return;
        div.innerHTML = '<p class="text-center">Loading updates...</p>';
        try {
            const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(20).get();
            div.innerHTML = '';
            snap.forEach(doc => {
                const p = doc.data();
                const date = p.createdAt ? new Date(p.createdAt.toDate()).toLocaleDateString() : '';
                const imgHtml = p.image ? `<img src="${p.image}" class="feed-img">` : '';
                div.innerHTML += `<div class="feed-card"><div class="feed-header"><img src="${p.avatar}" class="feed-avatar"><div><strong>${p.author}</strong><br><small class="text-secondary">${date}</small></div></div><p>${p.text}</p>${imgHtml}</div>`;
            });
        } catch(e) { div.innerHTML = 'Error loading feed'; console.error('loadFeed err', e); }
    },

    showFeed: () => { const fs = document.getElementById('feedStream'); if(fs) fs.classList.remove('hidden'); const ps = document.getElementById('peopleStream'); if(ps) ps.classList.add('hidden'); const pc = document.getElementById('postCreator'); if(pc) pc.classList.remove('hidden'); },

    showPeople: async () => {
        const feedStream = document.getElementById('feedStream'); if(feedStream) feedStream.classList.add('hidden');
        const postCreator = document.getElementById('postCreator'); if(postCreator) postCreator.classList.add('hidden');
        const grid = document.getElementById('peopleStream'); if(!grid) return;
        grid.classList.remove('hidden'); grid.innerHTML = 'Loading...';
        try {
            const snap = await db.collection('users').where('socialName', '!=', null).limit(20).get();
            grid.innerHTML = '';
            snap.forEach(doc => {
                const u = doc.data();
                if(u.role === 'buyer' || doc.id === state.user.uid) return;
                grid.innerHTML += `<div class="biz-card" style="padding:10px;text-align:center;"><img src="${u.socialPhoto}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin:0 auto 10px;border:2px solid #2563eb;"><h4>${u.socialName}</h4><span class="online-dot" style="margin-bottom:10px;"></span> Online<button class="btn btn-success btn-sm full-width" onclick="app.openMsgModal('${u.phone}')">Message</button></div>`;
            });
        } catch(e) { grid.innerHTML = 'Error loading people'; console.error('showPeople err', e); }
    },

    openMsgModal: (phone) => { const msgTarget = document.getElementById('msgTargetPhone'); if(msgTarget) msgTarget.value = phone; const msgModal = document.getElementById('msgModal'); if(msgModal) msgModal.classList.remove('hidden'); },

    loadMyAds: async () => {
        const div = document.getElementById('myAdsList'); if(div) div.innerHTML = 'Loading...';
        try {
            const snap = await db.collection('ads').where('uid', '==', state.user.uid).get();
            if(div) div.innerHTML = '';
            snap.forEach(doc => { const a = doc.data(); const badge = a.status === 'active' ? '<span class="badge" style="background:green;color:white">Active</span>' : '<span class="badge">Pending</span>'; if(div) div.innerHTML += `<div class="card" style="padding:10px;">${badge} <strong>Target: ${a.target}</strong> <br> Clicks: ${a.clicks || 0}</div>`; });
        } catch(e) { if(div) div.innerHTML = 'Error'; console.error('loadMyAds err', e); }
        // also show my biz purchases
        app.loadMyBizPurchases();
    },

    /* My Biz Purchases (for business users) */
    loadMyBizPurchases: async () => {
        const el = document.getElementById('myBizPurchases'); if(!el) return;
        el.innerHTML = 'Loading...';
        try {
            const snap = await db.collection('bizPurchases').where('uid','==', state.user.uid).orderBy('createdAt','desc').get();
            el.innerHTML = '';
            if(snap.empty) { el.innerHTML = '<p>No purchases yet.</p>'; return; }
            snap.forEach(doc => {
                const p = doc.data();
                const status = p.status || 'pending';
                el.innerHTML += `<div style="padding:8px;border:1px solid #eef2ff;border-radius:8px;margin-bottom:8px;">
                    <strong>Message:</strong> ${p.message || ''}<br>
                    <strong>Qty:</strong> ${p.qty || 0} &nbsp; <strong>Remaining:</strong> ${p.remaining || 0} &nbsp; <strong>Total:</strong> Rs. ${p.total || 0}<br>
                    <em>Status: ${status}</em>
                </div>`;
            });
        } catch(e) { el.innerHTML = 'Error loading'; console.error('loadMyBizPurchases err', e); }
    },

    /* ADMIN: load pending ads + pending biz purchases + pending claims */
    loadAdminAds: async () => {
        const div = document.getElementById('adminAdList'); if(div) div.innerHTML = 'Loading Pending Ads...';
        const bizDiv = document.getElementById('adminBizPurchases'); if(bizDiv) bizDiv.innerHTML = 'Loading Biz Purchases...';
        const claimsDiv = document.getElementById('adminClaims'); if(claimsDiv) claimsDiv.innerHTML = 'Loading Claims...';
        try {
            // normal ads
            const snap = await db.collection('ads').where('status','==','pending').get();
            if(div) div.innerHTML = '';
            snap.forEach(doc => {
                const a = doc.data();
                if(div) div.innerHTML += `<div class="biz-card"><img src="${a.receipt}" style="width:100%;height:150px;object-fit:cover"><div class="biz-content"><p>User: ${a.uid}</p><button class="btn btn-success btn-sm" onclick="app.approveAd('${doc.id}')">Approve</button></div></div>`;
            });
            // biz purchases
            const bp = await db.collection('bizPurchases').where('status','==','pending').get();
            if(bizDiv) bizDiv.innerHTML = '';
            bp.forEach(doc => {
                const p = doc.data();
                if(bizDiv) bizDiv.innerHTML += `<div style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;"><strong>From:</strong> ${p.uid} <br><strong>Message:</strong> ${p.message}<br><strong>Qty:</strong> ${p.qty} <br><img src="${p.receipt}" style="max-width:200px;margin-top:8px"><div style="margin-top:8px"><button class="btn btn-success btn-sm" onclick="app.approveBizPurchase('${doc.id}')">Activate</button> <button class="btn btn-danger btn-sm" onclick="app.rejectBizPurchase('${doc.id}')">Reject</button></div></div>`;
            });
            // claims
            const cl = await db.collection('bizClaims').where('status','==','pending').get();
            if(claimsDiv) claimsDiv.innerHTML = '';
            cl.forEach(doc => {
                const c = doc.data();
                if(claimsDiv) claimsDiv.innerHTML += `<div style="padding:10px;border:1px solid #f1f5f9;border-radius:8px;margin-bottom:8px;"><strong>Buyer:</strong> ${c.buyerId}<br><strong>Amount:</strong> Rs. ${c.amount}<br><strong>Purchase:</strong> ${c.purchaseId}<br><button class="btn btn-success btn-sm" onclick="app.markClaimPaid('${doc.id}')">Mark Paid</button></div>`;
            });
        } catch(e) {
            if(div) div.innerHTML = 'Error'; if(bizDiv) bizDiv.innerHTML = 'Error'; if(claimsDiv) claimsDiv.innerHTML = 'Error';
            console.error('loadAdminAds err', e);
        }
    },

    approveAd: async (id) => { await db.collection('ads').doc(id).update({status:'active'}); ui.toast("Ad Approved"); app.loadAdminAds(); },

    /* Biz purchase admin actions */
    approveBizPurchase: async (id) => {
        ui.showLoader(true);
        try {
            const docRef = db.collection('bizPurchases').doc(id);
            const docSnap = await docRef.get(); if(!docSnap.exists) throw new Error('Not found');
            await docRef.update({ status: 'active', activatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            ui.toast('Biz purchase activated');
            app.loadAdminAds();
        } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
    },
    rejectBizPurchase: async (id) => {
        if(!confirm('Reject this purchase?')) return;
        ui.showLoader(true);
        try {
            await db.collection('bizPurchases').doc(id).update({ status: 'rejected' });
            ui.toast('Rejected');
            app.loadAdminAds();
        } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
    },

    /* Buyers: load active biz purchases and show claim button */
    loadActiveBizMessages: async () => {
        const el = document.getElementById('bizMessagesList'); if(!el) return;
        el.innerHTML = 'Loading...';
        try {
            const snap = await db.collection('bizPurchases').where('status','==','active').orderBy('createdAt','desc').limit(100).get();
            el.innerHTML = '';
            if(snap.empty) { el.innerHTML = '<p>No active messages right now.</p>'; return; }
            snap.forEach(doc => {
                const p = doc.data(); const pid = doc.id;
                if(!p.remaining || p.remaining <= 0) return;
                const cardHtml = `<div class="v-card" style="padding:12px;">
                    <div class="v-info">
                        <h4>${p.message}</h4>
                        <p class="text-secondary">From: ${p.uid} &nbsp; Remaining: ${p.remaining}</p>
                        <div style="display:flex;gap:8px;margin-top:8px">
                            <button class="btn btn-primary btn-sm" onclick="app.claimBizMessage('${pid}')">Claim Rs 2</button>
                            <button class="btn btn-outline btn-sm" onclick="window.open('${p.receipt}','_blank')">View Receipt</button>
                        </div>
                    </div>
                </div>`;
                el.innerHTML += cardHtml;
            });
        } catch(e) { el.innerHTML = 'Error loading'; console.error('loadActiveBizMessages err', e); }
    },

    /* Claim function uses transaction to safely decrement remaining, create claim record and update buyer earnings pending */
    claimBizMessage: async (purchaseId) => {
        if(!state.user) return ui.toast('Sign in to claim', 'error');
        ui.showLoader(true, 'Claiming...');
        try {
            // check user bank details
            const userDocSnap = await db.collection('users').doc(state.user.uid).get();
            const u = userDocSnap.exists ? userDocSnap.data() : {};
            if(!u.bankName || !u.bankAcc || !u.bankHolder) { ui.showLoader(false); return ui.toast('Please save bank details in profile to claim payouts', 'error'); }

            // prevent double claim by the same buyer for the same purchase
            const claimedSnap = await db.collection('bizClaims').where('purchaseId','==', purchaseId).where('buyerId','==', state.user.uid).get();
            if(!claimedSnap.empty) { ui.showLoader(false); return ui.toast('You already claimed this message', 'error'); }

            const purchaseRef = db.collection('bizPurchases').doc(purchaseId);
            const buyerRef = db.collection('users').doc(state.user.uid);

            await db.runTransaction(async (tx) => {
                const pSnap = await tx.get(purchaseRef);
                if(!pSnap.exists) throw new Error('Purchase not found');
                const p = pSnap.data();
                if(!p.remaining || p.remaining <= 0) throw new Error('No remaining messages');

                // decrement remaining
                tx.update(purchaseRef, { remaining: (p.remaining - 1) });

                // create claim
                const claimDoc = {
                    purchaseId,
                    buyerId: state.user.uid,
                    amount: 2,
                    status: 'pending', // admin will mark paid after manual transfer
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                tx.set(db.collection('bizClaims').doc(), claimDoc);

                // update buyer earnings: keep fields earningsPending and earningsPaid
                const buyerData = (await tx.get(buyerRef)).data() || {};
                const pending = Number(buyerData.earningsPending || 0) + 2;
                tx.set(buyerRef, { earningsPending: pending }, { merge: true });
            });

            ui.toast('Claim recorded. Admin will process payout within 30 days.');
            app.loadActiveBizMessages();
            app.loadBuyerEarnings();
        } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
    },

    /* Show buyer earnings and bank info */
    loadBuyerEarnings: async () => {
        const cont = document.getElementById('earningsContent'); if(!cont) return;
        cont.innerHTML = 'Loading...';
        try {
            const doc = await db.collection('users').doc(state.user.uid).get();
            const d = doc.exists ? doc.data() : {};
            const pending = d.earningsPending || 0;
            const paid = d.earningsPaid || 0;
            cont.innerHTML = `<p><strong>Pending:</strong> Rs. ${pending}</p><p><strong>Paid:</strong> Rs. ${paid}</p><p><strong>Bank:</strong> ${d.bankName||'---'} / ${d.bankAcc||'---'} (${d.bankHolder||'---'})</p><p class="text-sm text-secondary">Payouts are processed manually by admin within 30 days after verification.</p>`;
        } catch(e) { cont.innerHTML = 'Error loading'; console.error('loadBuyerEarnings err', e); }
    },

    /* Admin: mark claim paid - update claim + transfer pending->paid in user's doc */
    markClaimPaid: async (claimId) => {
        if(!confirm('Mark this claim as paid? (you must have transferred funds manually)')) return;
        ui.showLoader(true);
        try {
            const claimRef = db.collection('bizClaims').doc(claimId);
            await db.runTransaction(async (tx) => {
                const cSnap = await tx.get(claimRef);
                if(!cSnap.exists) throw new Error('Claim not found');
                const c = cSnap.data();
                if(c.status === 'paid') throw new Error('Already marked paid');
                // set claim status
                tx.update(claimRef, { status: 'paid', paidAt: firebase.firestore.FieldValue.serverTimestamp() });
                // update buyer earnings: deduct pending add paid
                const buyerRef = db.collection('users').doc(c.buyerId);
                const buyerSnap = await tx.get(buyerRef);
                const bd = buyerSnap.exists ? buyerSnap.data() : {};
                const pending = Number(bd.earningsPending || 0) - (c.amount || 0);
                const paid = Number(bd.earningsPaid || 0) + (c.amount || 0);
                tx.set(buyerRef, { earningsPending: Math.max(0, pending), earningsPaid: paid }, { merge: true });
            });
            ui.toast('Marked paid and updated user balance.');
            app.loadAdminAds();
            // optionally refresh buyer view if admin is acting as buyer
        } catch(e) { ui.toast(e.message, 'error'); } finally { ui.showLoader(false); }
    },

    approveAd: async (id) => { await db.collection('ads').doc(id).update({status:'active'}); ui.toast("Ad Approved"); app.loadAdminAds(); },

    buyerFilter: async (type) => { /* placeholder for buyer filters */ }
};

/* -----------------------
   Site renderer (unchanged)
   ----------------------- */
const siteRenderer = {
    loadBySlug: async (slug) => {
        ui.showLoader(true, "Building Experience...");
        try {
            const sitesSnap = await db.collection('sites').where('slug', '==', slug).limit(1).get();
            if(sitesSnap.empty) throw new Error("Page not found");
            const uid = sitesSnap.docs[0].id; const s = sitesSnap.docs[0].data();
            const uDoc = await db.collection('users').doc(uid).get(); const u = uDoc.exists ? uDoc.data() : {};
            const elText = (id, value) => { const e = document.getElementById(id); if(e) e.innerText = value || ''; };
            elText('genSiteName', s.saleName);
            elText('genSiteCity', u.city || 'Sri Lanka');
            elText('genHeroTitle', s.heroTitle || s.saleName || '');
            elText('genHeroSub', s.heroSub || '');
            elText('genContactAddress', u.address || '');
            elText('genContactPhone', u.phone || '');
            if(u.whatsapp) { const floatWa = document.getElementById('floatWhatsapp'); if(floatWa) { floatWa.href = `https://wa.me/${u.whatsapp.replace('+','')}`; floatWa.classList.remove('hidden'); } }
            const itemsSnap = await db.collection('vehicles').where('uid', '==', uid).where('published', '==', true).get();
            const grid = document.getElementById('genGrid'); if(!grid) return;
            grid.innerHTML = '';
            itemsSnap.forEach(doc => {
                const d = doc.data();
                const card = document.createElement('div'); card.className = 'vehicle-card';
                card.onclick = () => siteRenderer.openDetailModal(d, u.whatsapp || '');
                const img = (d.images && d.images.length) ? d.images[0] : 'https://via.placeholder.com/400';
                card.innerHTML = `<img src="${img}" loading="lazy"><h4>${d.brand || ''} ${d.model || ''}</h4><p>Rs. ${d.price || ''}</p><p class="text-sm text-secondary">${d.mileage || ''} km | ${d.condition || 'Used'}</p>`;
                grid.appendChild(card);
            });
        } catch(e) { document.body.innerHTML = `<h1>${e.message}</h1>`; }
        ui.showLoader(false);
    },
    openDetailModal: (d, waNumber) => {
        const modal = document.getElementById('siteVehicleModal'); const content = document.getElementById('siteModalContent');
        if(!modal || !content) return;
        const imgs = Array.isArray(d.images) ? d.images : [];
        let slides = '';
        if(imgs.length) slides = imgs.map((img, i) => `<img src="${img}" class="slide-img ${i===0?'active':''}" onclick="siteRenderer.openLightbox('${img}')">`).join('');
        else slides = '<div style="color:#94a3b8;padding:20px">No images available</div>';
        let youtubeEmbed = '';
        if(d.youtube) youtubeEmbed = `<div class="mt-4"><iframe width="100%" height="300" src="https://www.youtube.com/embed/${d.youtube}" frameborder="0" allowfullscreen></iframe></div>`;
        const waClean = waNumber ? waNumber.replace('+','') : '';
        const waLink = waClean ? `https://wa.me/${waClean}?text=Hi, I am interested in ${encodeURIComponent((d.brand||'') + ' ' + (d.model||''))}` : '#';
        content.innerHTML = `<div class="slider-container">${slides}<button class="slider-btn prev-btn" onclick="siteRenderer.moveSlide(-1)">&#10094;</button><button class="slider-btn next-btn" onclick="siteRenderer.moveSlide(1)">&#10095;</button></div><div class="modal-info"><h2>${d.brand || ''} ${d.model || ''} (${d.year || ''})</h2><p class="text-primary font-bold text-lg">Rs. ${d.price || ''}</p><div class="grid-2 mt-4"><p><strong>Mileage:</strong> ${d.mileage || ''} km</p><p><strong>Fuel:</strong> ${d.fuel || ''}</p></div><div class="mt-4 p-4 bg-light rounded" style="color:black;">${d.desc || ''}</div>${youtubeEmbed}${ waClean ? `<a href="${waLink}" target="_blank" class="btn btn-success full-width mt-4"><i class="fa-brands fa-whatsapp"></i> Chat Seller</a>` : '' }</div>`;
        modal.classList.remove('hidden'); siteRenderer.currentSlide = 0; siteRenderer.totalSlides = imgs.length || 1;
    },
    moveSlide: (dir) => {
        const imgs = document.querySelectorAll('.slide-img');
        if(!imgs || imgs.length === 0) return;
        if(typeof siteRenderer.currentSlide === 'undefined') siteRenderer.currentSlide = 0;
        imgs[siteRenderer.currentSlide].style.display = 'none';
        siteRenderer.totalSlides = imgs.length;
        siteRenderer.currentSlide = (siteRenderer.currentSlide + dir + siteRenderer.totalSlides) % siteRenderer.totalSlides;
        imgs[siteRenderer.currentSlide].style.display = 'block';
    },
    openLightbox: (src) => {
        const lbImg = document.getElementById('lightboxImg'); const lb = document.getElementById('lightboxModal');
        if(lbImg) lbImg.src = src;
        if(lb) lb.classList.remove('hidden');
    },
    filterGenGrid: () => { const q = document.getElementById('genSearch') ? document.getElementById('genSearch').value.toLowerCase() : ''; document.querySelectorAll('#genGrid .vehicle-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? '' : 'none'); }
};

/* start */
document.addEventListener('DOMContentLoaded', app.init);
