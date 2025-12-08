// ==========================================
// 1. CONFIGURATION & INIT
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBUjzMFao9BS3uXBOW3qYrLVqHaGn8qIk4", 
  authDomain: "onlineshop-30cd1.firebaseapp.com",
  projectId: "onlineshop-30cd1",
  storageBucket: "onlineshop-30cd1.firebasestorage.app",
  messagingSenderId: "818252574868",
  appId: "1:818252574868:web:8dd36825db589a886cc481"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// State
let currentUser = null;
let currentSiteId = null; // usually same as uid
let isAdmin = false;

// Categories
const CATEGORIES = [
    "Car", "SUV / Crossover", "Van", "Pickup", "Lorry / Truck", "Bus / Coach",
    "Motorcycle", "Scooter / Moped", "Three-wheeler", "Tractor / Agricultural",
    "Construction / Heavy equipment", "Trailer", "Recreational Vehicle (RV)", 
    "ATV / UTV", "Special-purpose vehicles", "Marine"
];

// ==========================================
// 2. ROUTING & VIEW CONTROLLER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('seller');

    if (sellerId) {
        // RENDER PUBLIC USER SITE
        document.getElementById('platformApp').classList.add('hidden');
        document.getElementById('generatedSite').classList.remove('hidden');
        renderUserWebsite(sellerId);
    } else {
        // RENDER BUILDER PLATFORM
        initPlatform();
    }
});

function initPlatform() {
    setupAuthObserver();
    setupNavigation();
    setupForms();
    populateSelects();
}

function showSection(id) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showDashTab(id) {
    document.querySelectorAll('.dash-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.dash-nav').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${id}`).classList.add('active');
    document.querySelector(`button[data-tab="${id}"]`).classList.add('active');
    
    // Refresh data on tab switch
    if(id === 'myVehicles') loadMyVehicles();
    if(id === 'sellers') loadSellersDirectory();
    if(id === 'admin') loadAdminPanel();
}

// ==========================================
// 3. AUTHENTICATION
// ==========================================
function setupAuthObserver() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            document.getElementById('navLogin').classList.add('hidden');
            document.getElementById('navDashboard').classList.remove('hidden');
            document.getElementById('navLogout').classList.remove('hidden');
            document.getElementById('userSiteLink').href = `index.html?seller=${user.uid}`;
            document.getElementById('userSiteLink').textContent = `${window.location.origin}/index.html?seller=${user.uid}`;
            
            // Check Admin
            if(user.email === 'admin@vehiclebuilder.com') { // Replace with robust role check in production
                isAdmin = true;
                document.getElementById('adminTabBtn').classList.remove('hidden');
            }
            
            loadUserProfile();
            loadSiteSettings();
            showSection('dashboardSection');
        } else {
            document.getElementById('navLogin').classList.remove('hidden');
            document.getElementById('navDashboard').classList.add('hidden');
            document.getElementById('navLogout').classList.add('hidden');
            showSection('landingPage');
        }
    });
}

document.getElementById('btnLogin').addEventListener('click', () => {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert(err.message));
});

document.getElementById('btnSignup').addEventListener('click', () => {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    auth.createUserWithEmailAndPassword(e, p).then(() => {
        // Create initial user doc
        db.collection('users').doc(auth.currentUser.uid).set({
            email: e,
            createdAt: new Date(),
            role: 'user'
        });
    }).catch(err => alert(err.message));
});

document.getElementById('navLogout').addEventListener('click', () => auth.signOut());
document.getElementById('navLogin').addEventListener('click', () => showSection('authSection'));
document.getElementById('navHome').addEventListener('click', () => showSection('landingPage'));
document.getElementById('navDashboard').addEventListener('click', () => showSection('dashboardSection'));

function setupNavigation() {
    document.querySelectorAll('.dash-nav').forEach(btn => {
        btn.addEventListener('click', (e) => showDashTab(e.currentTarget.dataset.tab));
    });
}

// ==========================================
// 4. UTILS: COMPRESSION
// ==========================================
async function compressImage(file) {
    if(file.size <= 1024 * 1024) return file; // < 1MB, no compress

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    await img.decode();

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
    return blob;
}

// ==========================================
// 5. DASHBOARD: PROFILE & SITE SETTINGS
// ==========================================
async function loadUserProfile() {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if(doc.exists) {
        const d = doc.data();
        document.getElementById('profPhone').value = d.phone || '';
        document.getElementById('profWhatsapp').value = d.whatsapp || '';
        document.getElementById('profAddress').value = d.address || '';
        if(d.photoUrl) {
            document.getElementById('profilePreview').src = d.photoUrl;
            document.getElementById('profilePreview').classList.remove('hidden');
        }
    }
}

document.getElementById('btnSaveProfile').addEventListener('click', async () => {
    const file = document.getElementById('profilePhotoInput').files[0];
    let photoUrl = document.getElementById('profilePreview').src;

    if(file) {
        const compressed = await compressImage(file);
        const ref = storage.ref(`users/${currentUser.uid}/profile.jpg`);
        await ref.put(compressed);
        photoUrl = await ref.getDownloadURL();
    }

    await db.collection('users').doc(currentUser.uid).set({
        phone: document.getElementById('profPhone').value,
        whatsapp: document.getElementById('profWhatsapp').value,
        address: document.getElementById('profAddress').value,
        photoUrl: photoUrl
    }, { merge: true });
    
    alert('Profile Saved!');
});

// Website Settings
async function loadSiteSettings() {
    const doc = await db.collection('sites').doc(currentUser.uid).get();
    if(doc.exists) {
        const d = doc.data();
        document.getElementById('webSaleName').value = d.saleName || '';
        document.getElementById('webNavStyle').value = d.navStyle || 'style1';
        document.getElementById('webHeroTitle').value = d.heroTitle || '';
        document.getElementById('webHeroSub').value = d.heroSub || '';
        document.getElementById('webAbout').value = d.about || '';
        document.getElementById('webWhy').value = d.whyChoose || 'We provide the best vehicles...'; // Default
        document.getElementById('webFbLink').value = d.fbLink || '';
        // Note: loading existing images for gallery/logo is omitted for brevity but follows same pattern
    }
}

document.getElementById('btnSaveWebsite').addEventListener('click', async () => {
    // Handling File Uploads for Site assets would go here similar to Profile
    // Saving text data:
    await db.collection('sites').doc(currentUser.uid).set({
        saleName: document.getElementById('webSaleName').value,
        navStyle: document.getElementById('webNavStyle').value,
        heroTitle: document.getElementById('webHeroTitle').value,
        heroSub: document.getElementById('webHeroSub').value,
        about: document.getElementById('webAbout').value,
        whyChoose: document.getElementById('webWhy').value,
        fbLink: document.getElementById('webFbLink').value
    }, { merge: true });
    alert('Website Updated!');
});

// ==========================================
// 6. DASHBOARD: VEHICLES
// ==========================================
function populateSelects() {
    const catSel = document.getElementById('vCategory');
    CATEGORIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.innerText = c;
        catSel.appendChild(opt);
    });
}

document.getElementById('addVehicleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!currentUser) return;

    // Collect Data
    const vData = {
        uid: currentUser.uid,
        category: document.getElementById('vCategory').value,
        brand: document.getElementById('vBrand').value,
        model: document.getElementById('vModel').value,
        trim: document.getElementById('vTrim').value,
        year: document.getElementById('vYear').value,
        condition: document.getElementById('vCondition').value,
        transmission: document.getElementById('vTransmission').value,
        body: document.getElementById('vBody').value,
        fuel: document.getElementById('vFuel').value,
        engine: document.getElementById('vEngine').value,
        mileage: document.getElementById('vMileage').value,
        book: document.getElementById('vBook').value,
        finance: document.getElementById('vFinance').value,
        desc: document.getElementById('vDesc').value,
        youtube: document.getElementById('vYoutube').value,
        price: document.getElementById('vPrice').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        published: false
    };

    // Upload Images
    const files = document.getElementById('vPhotos').files;
    const imgUrls = [];
    if(files.length > 0) {
        for(let i=0; i<Math.min(files.length, 10); i++) {
            const compressed = await compressImage(files[i]);
            const ref = storage.ref(`vehicles/${currentUser.uid}/${Date.now()}_${i}.jpg`);
            await ref.put(compressed);
            imgUrls.push(await ref.getDownloadURL());
        }
    }
    vData.images = imgUrls;

    await db.collection('vehicles').add(vData);
    document.getElementById('addVehicleForm').reset();
    alert('Vehicle Added! Go to My Vehicles to publish it.');
});

async function loadMyVehicles() {
    const list = document.getElementById('myVehiclesList');
    list.innerHTML = 'Loading...';
    
    const snap = await db.collection('vehicles')
        .where('uid', '==', currentUser.uid)
        .orderBy('timestamp', 'desc') // Requires Index in Firestore
        .get();

    list.innerHTML = '';
    snap.forEach(doc => {
        const v = doc.data();
        const div = document.createElement('div');
        div.className = 'v-card';
        div.innerHTML = `
            <img src="${v.images && v.images.length ? v.images[0] : 'placeholder.jpg'}">
            <div class="v-details">
                <h3>${v.brand} ${v.model} (${v.year})</h3>
                <p class="v-price">${v.price}</p>
                <div class="v-actions">
                    <button class="btn-sm btn-secondary" onclick="deleteVehicle('${doc.id}')">Delete</button>
                    <button class="btn-sm btn-primary" onclick="togglePublish('${doc.id}', ${v.published})">
                        ${v.published ? 'Unpublish' : 'Publish'}
                    </button>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

window.deleteVehicle = async (id) => {
    if(confirm('Are you sure?')) {
        await db.collection('vehicles').doc(id).delete();
        loadMyVehicles();
    }
};

window.togglePublish = async (id, status) => {
    await db.collection('vehicles').doc(id).update({ published: !status });
    loadMyVehicles();
};

// ==========================================
// 7. PUBLIC SITE GENERATOR (The Magic)
// ==========================================
async function renderUserWebsite(sellerId) {
    // Fetch Settings
    const siteDoc = await db.collection('sites').doc(sellerId).get();
    const userDoc = await db.collection('users').doc(sellerId).get();
    
    if(!siteDoc.exists || !userDoc.exists) {
        document.body.innerHTML = "<h1>Seller not found.</h1>";
        return;
    }

    const s = siteDoc.data();
    const u = userDoc.data();

    // 1. Navbar
    const header = document.getElementById('genHeader');
    let navHtml = '';
    
    // Mobile toggle logic
    const menuItems = `
        <a href="#genVehicles">Vehicles</a>
        <a href="#genAbout">About Us</a>
        <a href="#genWhy">Why Us</a>
        <a href="#genGallery">Gallery</a>
        <a href="#genContact">Contact</a>
    `;

    if(s.navStyle === 'style2') {
        navHtml = `
            <div class="gen-nav-style2">
                <div class="brand-box">
                    ${s.logoUrl ? `<img src="${s.logoUrl}" class="gen-logo">` : ''}
                    <span style="font-weight:bold; font-size:1.2rem">${s.saleName || 'Car Sale'}</span>
                </div>
                <div class="gen-menu">${menuItems}</div>
            </div>
        `;
    } else {
        // Style 1 (Center)
        navHtml = `
            <div class="gen-nav-style1">
                ${s.logoUrl ? `<img src="${s.logoUrl}" class="gen-logo">` : ''}
                <div class="gen-name">${s.saleName || 'Car Sale'}</div>
                <div class="gen-menu">${menuItems}</div>
            </div>
        `;
    }
    // Add mobile toggle logic
    navHtml += `<div class="mobile-toggle" onclick="document.querySelector('.gen-menu').classList.toggle('open')">☰</div>`;
    header.innerHTML = navHtml;

    // 2. Hero
    const hero = document.getElementById('genHero');
    hero.innerHTML = `
        <h1>${s.heroTitle || `Welcome to ${s.saleName}`}</h1>
        <p>${s.heroSub || 'Find your dream vehicle today'}</p>
    `;

    // 3. Vehicles (Published only)
    const vSnap = await db.collection('vehicles')
        .where('uid', '==', sellerId)
        .where('published', '==', true)
        .get();

    const vGrid = document.getElementById('genVehicleGrid');
    const categories = new Set();

    vSnap.forEach(doc => {
        const v = doc.data();
        categories.add(v.category);
        const el = document.createElement('div');
        el.className = 'v-card';
        el.innerHTML = `
            <img src="${v.images[0]}" onclick="showVehicleModal('${doc.id}')">
            <div class="v-details">
                <h4>${v.brand} ${v.model}</h4>
                <p class="v-price">Rs. ${v.price}</p>
            </div>
        `;
        vGrid.appendChild(el);
    });

    // 4. About & Why
    document.getElementById('genAboutContent').innerText = s.about || 'We are a trusted vehicle dealer...';
    document.getElementById('genWhyContent').innerHTML = `
        <div class="card"><h3>Trusted</h3><p>${s.whyChoose}</p></div>
        <div class="card"><h3>Best Price</h3><p>Guaranteed market rates.</p></div>
    `;

    // 5. Contact & WhatsApp
    document.getElementById('genContactDetails').innerHTML = `
        <p><i class="fa fa-phone"></i> ${u.phone}</p>
        <p><i class="fa fa-map-marker"></i> ${u.address}</p>
    `;
    
    if(u.whatsapp) {
        document.getElementById('genWhatsappFloat').href = `https://wa.me/${u.whatsapp}`;
    } else {
        document.getElementById('genWhatsappFloat').classList.add('hidden');
    }

    // 6. Facebook Popup (Scroll logic)
    if(s.fbLink) {
        window.addEventListener('scroll', () => {
            const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            if(scrollPercent > 50 && !sessionStorage.getItem('fbShown')) {
                document.getElementById('fbModal').classList.remove('hidden');
                document.getElementById('fbLinkContainer').innerHTML = `<a href="${s.fbLink}" target="_blank" class="btn-primary">Visit our Page</a>`;
                sessionStorage.setItem('fbShown', 'true');
            }
        });
    }

    // 7. Admin Ads Logic
    window.addEventListener('scroll', () => {
         const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
         if(scrollPercent > 30 && !sessionStorage.getItem('adShown')) {
             // Ideally fetch random ad from DB
             document.getElementById('adModal').classList.remove('hidden');
             document.getElementById('adDisplayArea').innerHTML = "<h3>Sponsored Ad Here</h3>";
             sessionStorage.setItem('adShown', 'true');
         }
    });

    // 8. Navbar hide on scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > lastScroll && currentScroll > 100) {
            header.style.top = '-100px'; // Hide
        } else {
            header.style.top = '0';
        }
        lastScroll = currentScroll;
    });
}

// ==========================================
// 8. ADMIN & CONNECT
// ==========================================
async function loadSellersDirectory() {
    const grid = document.getElementById('sellersGrid');
    grid.innerHTML = 'Loading...';
    const snap = await db.collection('sites').get();
    
    grid.innerHTML = '';
    snap.forEach(doc => {
        const s = doc.data();
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${s.saleName}</h3>
            <button onclick="window.open('index.html?seller=${doc.id}', '_blank')" class="btn-sm btn-primary">Visit Website</button>
        `;
        grid.appendChild(div);
    });
}

// Helper to show vehicle details modal
window.showVehicleModal = async (vid) => {
    // Fetch full details and show in generic modal
    const doc = await db.collection('vehicles').doc(vid).get();
    const v = doc.data();
    const modal = document.getElementById('modalOverlay');
    document.getElementById('modalBody').innerHTML = `
        <h2>${v.brand} ${v.model}</h2>
        <img src="${v.images[0]}" style="width:100%">
        <p>${v.desc}</p>
        <p>Price: ${v.price}</p>
        <p>Contact Seller</p>
    `;
    modal.classList.remove('hidden');
}

// Close generic modal
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('modalOverlay').classList.add('hidden');
});
