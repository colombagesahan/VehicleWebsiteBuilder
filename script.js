// 1. FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBUjzMFao9BS3uXBOW3qYrLVqHaGn8qIk4", 
  authDomain: "onlineshop-30cd1.firebaseapp.com",
  projectId: "onlineshop-30cd1",
  storageBucket: "onlineshop-30cd1.firebasestorage.app",
  messagingSenderId: "818252574868",
  appId: "1:818252574868:web:8dd36825db589a886cc481"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 2. STATE & CONSTANTS
let currentUser = null;
const CATEGORIES = [
    "Car", "SUV / Crossover", "Van", "Pickup", "Lorry / Truck", "Bus / Coach",
    "Motorcycle", "Scooter / Moped", "Three-wheeler", "Tractor / Agricultural",
    "Construction / Heavy equipment", "Trailer", "Recreational Vehicle (RV)", 
    "ATV / UTV", "Special-purpose vehicles", "Marine"
];

// 3. UTILITY FUNCTIONS
const showLoader = (show = true) => {
    document.getElementById('globalLoader').classList.toggle('hidden', !show);
};

const showToast = (msg, type = 'success') => {
    const box = document.getElementById('toastBox');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    box.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// Image Compression Logic (Provided by user, wrapped in Promise)
const compressImage = async (file) => {
    if(file.size <= 1024 * 1024) return file; // < 1MB
    
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.src = url;
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
    });
};

// 4. ROUTING & INIT
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('seller');

    if (sellerId) {
        // Mode: Generated Site
        document.getElementById('appContainer').classList.add('hidden');
        document.getElementById('siteContainer').classList.remove('hidden');
        renderUserSite(sellerId);
    } else {
        // Mode: Builder Platform
        initPlatform();
    }
});

function initPlatform() {
    // Populate Selects
    const catSel = document.getElementById('vCat');
    CATEGORIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.innerText = c;
        catSel.appendChild(opt);
    });

    // Auth Listener
    auth.onAuthStateChanged(user => {
        currentUser = user;
        showLoader(false);
        if (user) {
            document.getElementById('viewLanding').classList.add('hidden');
            document.getElementById('viewAuth').classList.add('hidden');
            document.getElementById('viewDashboard').classList.remove('hidden');
            document.getElementById('navLoginBtn').classList.add('hidden');
            document.getElementById('navLogoutBtn').classList.remove('hidden');
            
            document.getElementById('dashUserEmail').innerText = user.email;
            if(user.email === 'admin@vehiclebuilder.com') { // Basic admin check
                document.getElementById('adminBtn').classList.remove('hidden');
            }
            
            loadProfileData();
            loadWebsiteSettings();
        } else {
            document.getElementById('navLoginBtn').classList.remove('hidden');
            document.getElementById('navLogoutBtn').classList.add('hidden');
            document.getElementById('viewDashboard').classList.add('hidden');
            document.getElementById('viewLanding').classList.remove('hidden');
        }
    });

    // Navigation Events
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const target = btn.dataset.target;
            document.getElementById(target).classList.add('active');
            
            if(target === 'panelMyVehicles') loadMyVehicles();
            if(target === 'panelConnect') loadConnect();
        });
    });

    document.getElementById('navLoginBtn').addEventListener('click', () => {
        document.getElementById('viewLanding').classList.add('hidden');
        document.getElementById('viewAuth').classList.remove('hidden');
    });

    document.getElementById('navLogoutBtn').addEventListener('click', () => auth.signOut());
    document.getElementById('getStartedBtn').addEventListener('click', () => document.getElementById('navLoginBtn').click());
}

// 5. AUTH LOGIC
document.getElementById('doLogin').addEventListener('click', async () => {
    const e = document.getElementById('emailInput').value;
    const p = document.getElementById('passwordInput').value;
    try {
        showLoader(true);
        await auth.signInWithEmailAndPassword(e, p);
    } catch(err) {
        showToast(err.message, 'error');
        showLoader(false);
    }
});

document.getElementById('doSignup').addEventListener('click', async () => {
    const e = document.getElementById('emailInput').value;
    const p = document.getElementById('passwordInput').value;
    try {
        showLoader(true);
        const cred = await auth.createUserWithEmailAndPassword(e, p);
        // Create initial user doc
        await db.collection('users').doc(cred.user.uid).set({
            email: e, createdAt: new Date()
        });
        showToast('Account created!');
    } catch(err) {
        showToast(err.message, 'error');
        showLoader(false);
    }
});

// 6. DASHBOARD LOGIC
// --- Profile ---
async function loadProfileData() {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if(doc.exists) {
        const d = doc.data();
        document.getElementById('upPhone').value = d.phone || '';
        document.getElementById('upWhatsapp').value = d.whatsapp || '';
        document.getElementById('upAddress').value = d.address || '';
        if(d.photo) document.getElementById('dashProfileImg').src = d.photo;
    }
}

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    showLoader(true);
    try {
        const file = document.getElementById('upPhoto').files[0];
        let photoUrl = null;
        if(file) {
            const blob = await compressImage(file);
            const ref = storage.ref(`profiles/${currentUser.uid}`);
            await ref.put(blob);
            photoUrl = await ref.getDownloadURL();
        }

        const data = {
            phone: document.getElementById('upPhone').value,
            whatsapp: document.getElementById('upWhatsapp').value,
            address: document.getElementById('upAddress').value
        };
        if(photoUrl) data.photo = photoUrl;

        await db.collection('users').doc(currentUser.uid).set(data, {merge: true});
        showToast('Profile Saved');
    } catch(err) {
        showToast(err.message, 'error');
    }
    showLoader(false);
});

// --- Add Vehicle ---
document.getElementById('addVehicleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);
    try {
        // Upload images first
        const files = document.getElementById('vPhotos').files;
        const imgUrls = [];
        for(let i=0; i<Math.min(files.length, 10); i++) {
            const blob = await compressImage(files[i]);
            const ref = storage.ref(`vehicles/${currentUser.uid}/${Date.now()}_${i}.jpg`);
            await ref.put(blob);
            imgUrls.push(await ref.getDownloadURL());
        }

        const vData = {
            uid: currentUser.uid,
            cat: document.getElementById('vCat').value,
            brand: document.getElementById('vBrand').value,
            model: document.getElementById('vModel').value,
            trim: document.getElementById('vTrim').value,
            year: document.getElementById('vYear').value,
            cond: document.getElementById('vCond').value,
            trans: document.getElementById('vTrans').value,
            fuel: document.getElementById('vFuel').value,
            price: document.getElementById('vPrice').value,
            mil: document.getElementById('vMil').value,
            body: document.getElementById('vBody').value,
            eng: document.getElementById('vEng').value,
            book: document.getElementById('vBook').value,
            fin: document.getElementById('vFinance').value,
            desc: document.getElementById('vDesc').value,
            tube: document.getElementById('vTube').value,
            imgs: imgUrls,
            ts: firebase.firestore.FieldValue.serverTimestamp(),
            published: false
        };

        await db.collection('vehicles').add(vData);
        document.getElementById('addVehicleForm').reset();
        document.getElementById('vPhotoPreview').innerHTML = '';
        showToast('Vehicle Added. Please publish it from "My Vehicles"');
    } catch(err) {
        showToast(err.message, 'error');
    }
    showLoader(false);
});

// Image Preview for Form
document.getElementById('vPhotos').addEventListener('change', (e) => {
    const box = document.getElementById('vPhotoPreview');
    box.innerHTML = '';
    Array.from(e.target.files).slice(0,10).forEach(file => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        box.appendChild(img);
    });
});

// --- My Vehicles ---
async function loadMyVehicles() {
    const list = document.getElementById('myVehiclesGrid');
    list.innerHTML = '<p class="text-center">Loading...</p>';
    
    // Simplistic fetching (sorting handled in UI for small datasets or needs index)
    const snap = await db.collection('vehicles').where('uid', '==', currentUser.uid).get();
    
    list.innerHTML = '';
    if(snap.empty) {
        list.innerHTML = '<p class="text-center">No vehicles added yet.</p>';
        return;
    }

    snap.forEach(doc => {
        const v = doc.data();
        const card = document.createElement('div');
        card.className = 'dash-card';
        card.innerHTML = `
            <img src="${v.imgs && v.imgs.length ? v.imgs[0] : 'https://via.placeholder.com/300'}" loading="lazy">
            <div class="card-body">
                <h4>${v.brand} ${v.model}</h4>
                <p>Rs. ${v.price}</p>
                <small>${v.published ? '<span style="color:var(--success)">● Published</span>' : '<span style="color:var(--danger)">● Draft</span>'}</small>
            </div>
            <div class="card-actions">
                <button class="btn-text" onclick="togglePublish('${doc.id}', ${v.published})">
                    ${v.published ? 'Unpublish' : 'Publish'}
                </button>
                <button class="btn-text" style="color:var(--danger)" onclick="deleteVehicle('${doc.id}')">Delete</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.togglePublish = async (id, currentStatus) => {
    showLoader(true);
    await db.collection('vehicles').doc(id).update({ published: !currentStatus });
    loadMyVehicles();
    showLoader(false);
};

window.deleteVehicle = async (id) => {
    if(!confirm("Are you sure?")) return;
    showLoader(true);
    await db.collection('vehicles').doc(id).delete();
    loadMyVehicles();
    showLoader(false);
};

// --- Website Settings ---
window.openSubTab = (id) => {
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.remove('hidden');
    event.target.classList.add('active');
};

async function loadWebsiteSettings() {
    const doc = await db.collection('sites').doc(currentUser.uid).get();
    const link = `${window.location.origin}${window.location.pathname}?seller=${currentUser.uid}`;
    document.getElementById('mySiteLink').href = link;
    document.getElementById('mySiteLink').innerText = link;

    if(doc.exists) {
        const d = doc.data();
        document.getElementById('wsName').value = d.name || '';
        document.getElementById('wsNavStyle').value = d.navStyle || '1';
        document.getElementById('wsHeroTitle').value = d.heroTitle || '';
        document.getElementById('wsHeroSub').value = d.heroSub || '';
        document.getElementById('wsAbout').value = d.about || '';
        document.getElementById('wsWhy').value = d.why || '';
        document.getElementById('wsFb').value = d.fb || '';
        document.getElementById('wsCustomDomain').value = d.customDomain || '';
    }
}

document.getElementById('saveWebsiteBtn').addEventListener('click', async () => {
    showLoader(true);
    try {
        // Upload logic for Logo/Favicon/Gallery omitted for brevity but same as Profile
        const data = {
            name: document.getElementById('wsName').value,
            navStyle: document.getElementById('wsNavStyle').value,
            heroTitle: document.getElementById('wsHeroTitle').value,
            heroSub: document.getElementById('wsHeroSub').value,
            about: document.getElementById('wsAbout').value,
            why: document.getElementById('wsWhy').value,
            fb: document.getElementById('wsFb').value,
            customDomain: document.getElementById('wsCustomDomain').value
        };
        await db.collection('sites').doc(currentUser.uid).set(data, {merge: true});
        showToast('Website Settings Saved');
    } catch(err) {
        showToast(err.message, 'error');
    }
    showLoader(false);
});

// --- Connect ---
async function loadConnect() {
    const list = document.getElementById('sellersList');
    list.innerHTML = 'Loading...';
    const snap = await db.collection('sites').get();
    list.innerHTML = '';
    snap.forEach(doc => {
        const s = doc.data();
        const d = document.createElement('div');
        d.className = 'dash-card';
        d.innerHTML = `
            <div class="card-body">
                <h3>${s.name || 'Unnamed Sale'}</h3>
                <button class="btn btn-primary mt-4" onclick="window.open('?seller=${doc.id}', '_blank')">Visit Website</button>
            </div>
        `;
        list.appendChild(d);
    });
}

// 7. PUBLIC SITE RENDERER
async function renderUserSite(uid) {
    showLoader(true);
    try {
        const [siteDoc, userDoc] = await Promise.all([
            db.collection('sites').doc(uid).get(),
            db.collection('users').doc(uid).get()
        ]);

        if(!siteDoc.exists) throw new Error("Site not found");
        
        const s = siteDoc.data();
        const u = userDoc.data();

        // 1. Navbar
        const header = document.getElementById('siteHeader');
        let navHtml = '';
        const menuHtml = `
            <div class="site-menu">
                <a href="#siteVehicles">Vehicles</a>
                <a href="#siteAbout">About</a>
                <a href="#siteGallery">Gallery</a>
                <a href="#siteContact">Contact</a>
            </div>
            <div class="mobile-toggle" onclick="document.querySelector('.site-menu').classList.toggle('open')">☰</div>
        `;

        if(s.navStyle === '2') {
            navHtml = `
                <div class="nav-style-2">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${s.logo ? `<img src="${s.logo}">` : ''}
                        <h3>${s.name || 'Car Sale'}</h3>
                    </div>
                    ${menuHtml}
                </div>
            `;
        } else {
            navHtml = `
                <div class="nav-style-1">
                    <div class="logo-area">
                        ${s.logo ? `<img src="${s.logo}">` : ''}
                        <h3>${s.name || 'Car Sale'}</h3>
                    </div>
                    ${menuHtml}
                </div>
            `;
        }
        header.innerHTML = navHtml;

        // Scroll Hide Nav
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const current = window.pageYOffset;
            if (current > lastScroll && current > 100) {
                header.style.top = '-100px';
            } else {
                header.style.top = '0';
            }
            lastScroll = current;
        });

        // 2. Hero
        const hero = document.getElementById('siteHero');
        hero.innerHTML = `<h1>${s.heroTitle || 'Welcome'}</h1><p>${s.heroSub || 'Best prices in town'}</p>`;
        hero.style.backgroundImage = "url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80')";

        // 3. Vehicles
        const vSnap = await db.collection('vehicles').where('uid', '==', uid).where('published', '==', true).get();
        const grid = document.getElementById('siteVehicleGrid');
        const filters = document.getElementById('siteCatFilters');
        const cats = new Set();
        
        vSnap.forEach(doc => {
            const v = doc.data();
            cats.add(v.cat);
            const card = document.createElement('div');
            card.className = `dash-card filter-item`;
            card.dataset.cat = v.cat;
            card.innerHTML = `
                <img src="${v.imgs[0]}" onclick="openVModal('${doc.id}')" style="cursor:pointer">
                <div class="card-body">
                    <h4>${v.brand} ${v.model}</h4>
                    <p class="text-success font-bold">Rs. ${v.price}</p>
                    <button class="btn btn-primary full-width mt-4" onclick="openVModal('${doc.id}')">View Details</button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Category Filters
        filters.innerHTML = `<button class="cat-btn active" onclick="filterV('all')">All</button>`;
        cats.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'cat-btn';
            btn.innerText = c;
            btn.onclick = () => filterV(c);
            filters.appendChild(btn);
        });

        // 4. Content
        document.getElementById('siteAboutContent').innerText = s.about || 'About content...';
        document.getElementById('siteWhyContent').innerHTML = (s.why || 'Reliable\nAffordable').split('\n').map(t => `<div class="feature-card"><h4>${t}</h4></div>`).join('');
        
        // 5. Contact
        document.getElementById('siteContactInfo').innerHTML = `
            <h3>Get In Touch</h3>
            <p><i class="fa fa-phone"></i> ${u.phone}</p>
            <p><i class="fa fa-map-marker"></i> ${u.address}</p>
        `;
        
        if(u.whatsapp) {
            const wa = document.getElementById('floatWhatsapp');
            wa.href = `https://wa.me/${u.whatsapp}`;
            wa.classList.remove('hidden');
        }

        // 6. Facebook Logic
        if(s.fb) {
            window.addEventListener('scroll', () => {
                if(window.scrollY > document.body.scrollHeight * 0.5 && !sessionStorage.getItem('fbShown')) {
                    document.getElementById('fbModal').classList.remove('hidden');
                    document.getElementById('fbLinkArea').innerHTML = `<a href="${s.fb}" target="_blank" class="btn btn-primary">Visit Page</a>`;
                    sessionStorage.setItem('fbShown', 'true');
                }
            });
            document.getElementById('siteFooter').innerHTML = `<div class="text-center p-4 bg-dark text-white"><a href="${s.fb}" target="_blank" class="text-white">Visit our Facebook</a><br><small>Powered by VehicleWebsiteBuilder</small></div>`;
        }

        // 7. Admin Ads (Scroll 30%)
        window.addEventListener('scroll', () => {
            if(window.scrollY > document.body.scrollHeight * 0.3 && !sessionStorage.getItem('adShown')) {
                document.getElementById('adModal').classList.remove('hidden');
                document.getElementById('adDisplayArea').innerHTML = `
                    <div class="text-center">
                        <h3>Sponsored</h3>
                        <div style="background:#eee; height:200px; display:flex; align-items:center; justify-content:center;">Ad Space Available</div>
                        <button class="btn btn-primary mt-4">Learn More</button>
                    </div>
                `;
                sessionStorage.setItem('adShown', 'true');
            }
        });

    } catch(e) {
        document.body.innerHTML = `<h1 class="text-center mt-4">Error loading site: ${e.message}</h1>`;
    }
    showLoader(false);
}

// Filter Logic
window.filterV = (cat) => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.filter-item').forEach(el => {
        el.style.display = (cat === 'all' || el.dataset.cat === cat) ? 'block' : 'none';
    });
};

// Modal Logic
window.openVModal = async (vid) => {
    showLoader(true);
    const doc = await db.collection('vehicles').doc(vid).get();
    const v = doc.data();
    showLoader(false);
    
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `
        <h2>${v.brand} ${v.model}</h2>
        <div class="preview-grid" style="grid-template-columns: 1fr; margin-bottom:1rem;">
            <img src="${v.imgs[0]}" style="height:300px; object-fit:contain; background:#000;">
        </div>
        <div class="form-grid">
            <p><strong>Price:</strong> Rs. ${v.price}</p>
            <p><strong>Year:</strong> ${v.year}</p>
            <p><strong>Mileage:</strong> ${v.mil} km</p>
            <p><strong>Fuel:</strong> ${v.fuel}</p>
        </div>
        <hr class="mt-4 mb-4">
        <p>${v.desc}</p>
        ${v.tube ? `<a href="${v.tube}" target="_blank" class="btn btn-primary mt-4">Watch Video</a>` : ''}
    `;
};

window.closeModal = () => {
    document.getElementById('modalOverlay').classList.add('hidden');
};
