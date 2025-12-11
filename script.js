// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBUjzMFao9BS3uXBOW3qYrLVqHaGn8qIk4", 
  authDomain: "onlineshop-30cd1.firebaseapp.com",
  projectId: "onlineshop-30cd1",
  storageBucket: "onlineshop-30cd1.firebasestorage.app",
  messagingSenderId: "818252574868",
  appId: "1:818252574868:web:8dd36825db589a886cc481"
};
// Init
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// --- STATE MANAGEMENT ---
const state = {
    user: null,
    userData: null,
    context: { type: 'personal', id: null }, // 'personal' | 'business'
    businesses: []
};

// --- AUTHENTICATION ---
const authUI = {
    mode: 'login',
    switch: (m) => {
        authUI.mode = m;
        document.querySelectorAll('.pill').forEach(el => el.classList.toggle('active'));
        document.getElementById('regFields').classList.toggle('hidden', m === 'login');
    },
    submit: async (e) => {
        e.preventDefault();
        ui.loader(true);
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        try {
            if (authUI.mode === 'login') {
                await auth.signInWithEmailAndPassword(email, pass);
            } else {
                const cred = await auth.createUserWithEmailAndPassword(email, pass);
                await db.collection('users').doc(cred.user.uid).set({
                    name: document.getElementById('fullName').value,
                    phone: document.getElementById('phone').value,
                    email: email,
                    wallet: 0,
                    joined: new Date()
                });
            }
        } catch (err) { ui.toast(err.message, 'error'); ui.loader(false); }
    }
};

// --- CORE APP ---
const app = {
    init: () => {
        auth.onAuthStateChanged(async u => {
            if (u) {
                state.user = u;
                // Load User Data
                const uDoc = await db.collection('users').doc(u.uid).get();
                state.userData = uDoc.data();
                
                // Load Businesses
                const bSnap = await db.collection('businesses').where('ownerUid', '==', u.uid).get();
                state.businesses = bSnap.docs.map(d => ({id: d.id, ...d.data()}));
                
                app.renderRail();
                app.setContext('personal');
                
                document.getElementById('viewAuth').classList.add('hidden');
                document.getElementById('viewApp').classList.remove('hidden');
                ui.loader(false);
            } else {
                document.getElementById('viewAuth').classList.remove('hidden');
                document.getElementById('viewApp').classList.add('hidden');
                ui.loader(false);
            }
        });
    },

    setContext: (type, id = null) => {
        state.context = { type, id };
        // Update Sidebar
        const sidebar = document.getElementById('sidebarMenu');
        sidebar.innerHTML = '';
        
        // Highlight Rail
        document.querySelectorAll('.rail-icon').forEach(e => e.classList.remove('active'));
        
        if (type === 'personal') {
            document.getElementById('railPersonal').classList.add('active');
            sidebar.innerHTML = `
                <div class="nav-head">Personal</div>
                <button class="nav-item active" onclick="ui.goto('v-feed')"><i class="fa-solid fa-newspaper"></i> Feed</button>
                <button class="nav-item" onclick="ui.goto('v-wallet')"><i class="fa-solid fa-wallet"></i> My Wallet</button>
                <button class="nav-item" onclick="ui.goto('v-earn')"><i class="fa-solid fa-bolt text-gold"></i> Earn Money</button>
                <button class="nav-item" onclick="ui.goto('v-partners')"><i class="fa-solid fa-handshake"></i> Partners</button>
            `;
            social.loadFeed();
            ui.goto('v-feed');
            app.renderMobileNav('personal');
        } else {
            document.getElementById(`railBiz-${id}`).classList.add('active');
            const b = state.businesses.find(x => x.id === id);
            sidebar.innerHTML = `
                <div class="nav-head">${b.name}</div>
                <button class="nav-item active" onclick="ui.goto('v-biz-dash')"><i class="fa-solid fa-gauge"></i> Dashboard</button>
                <button class="nav-item" onclick="ui.goto('v-biz-products')"><i class="fa-solid fa-box"></i> Inventory</button>
                <button class="nav-item" onclick="ui.goto('v-biz-funds')"><i class="fa-solid fa-credit-card"></i> Ad Funds</button>
                <button class="nav-item" onclick="ui.goto('v-biz-settings')"><i class="fa-solid fa-sliders"></i> Settings</button>
            `;
            biz.loadDash(id);
            app.renderMobileNav('business');
        }
    },

    renderRail: () => {
        const div = document.getElementById('railBizList');
        div.innerHTML = '';
        state.businesses.forEach(b => {
            div.innerHTML += `<div class="rail-icon" id="railBiz-${b.id}" onclick="app.setContext('business','${b.id}')"><img src="${b.logo || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'"></div>`;
        });
    },

    renderMobileNav: (ctx) => {
        // Only if mobile (simple check)
        if(window.innerWidth > 768) return;
        
        const exist = document.getElementById('mobNav');
        if(exist) exist.remove();
        
        const nav = document.createElement('div');
        nav.id = 'mobNav';
        nav.className = 'mobile-bottom-bar';
        
        if(ctx === 'personal') {
            nav.innerHTML = `
                <i class="fa-solid fa-newspaper mob-icon" onclick="ui.goto('v-feed')"></i>
                <i class="fa-solid fa-bolt mob-icon" onclick="ui.goto('v-earn')"></i>
                <i class="fa-solid fa-wallet mob-icon" onclick="ui.goto('v-wallet')"></i>
                <i class="fa-solid fa-bars mob-icon" onclick="biz.openContextModal()"></i>
            `;
        } else {
            nav.innerHTML = `
                <i class="fa-solid fa-gauge mob-icon" onclick="ui.goto('v-biz-dash')"></i>
                <i class="fa-solid fa-plus mob-icon" onclick="biz.addProductModal()"></i>
                <i class="fa-solid fa-credit-card mob-icon" onclick="ui.goto('v-biz-funds')"></i>
                <i class="fa-solid fa-arrow-left mob-icon" onclick="app.setContext('personal')"></i>
            `;
        }
        document.body.appendChild(nav);
    }
};

// --- BUSINESS LOGIC ---
const biz = {
    openCreateModal: () => {
        ui.modal(`
            <h3>Create Business</h3>
            <form onsubmit="biz.create(event)">
                <input type="text" id="newBizName" placeholder="Business Name" required>
                <select id="newBizType"><option value="store">Retail Store</option><option value="service">Service Provider</option><option value="pvt">Pvt Ltd Company</option></select>
                <button class="btn btn-primary full-width">Launch</button>
            </form>
        `);
    },
    create: async (e) => {
        e.preventDefault();
        ui.loader(true);
        try {
            const name = document.getElementById('newBizName').value;
            const type = document.getElementById('newBizType').value;
            const res = await db.collection('businesses').add({
                ownerUid: state.user.uid, name, type, wallet: 0, partnerActive: false
            });
            state.businesses.push({id: res.id, name, type, wallet: 0});
            app.renderRail();
            ui.closeModal();
            app.setContext('business', res.id);
        } catch(e) { ui.toast(e.message, 'error'); }
        ui.loader(false);
    },
    loadDash: (id) => {
        ui.goto('v-biz-dash');
        const b = state.businesses.find(x => x.id === id);
        document.getElementById('bizTitle').innerText = b.name;
        document.getElementById('bizType').innerText = b.type.toUpperCase();
        document.getElementById('bizWallet').innerText = `Rs. ${b.wallet}`;
        document.getElementById('bizCommission').value = b.commission || '';
        document.getElementById('bizPartnerActive').checked = b.partnerActive || false;
        document.getElementById('bizSiteLink').href = `index.html?site=${id}`;
    },
    saveSettings: async () => {
        const id = state.context.id;
        const active = document.getElementById('bizPartnerActive').checked;
        const comm = document.getElementById('bizCommission').value;
        await db.collection('businesses').doc(id).update({ partnerActive: active, commission: comm });
        ui.toast('Settings Saved');
    },
    openContextModal: () => {
        let html = `<h3>Switch Account</h3><div class="list-group">`;
        state.businesses.forEach(b => {
            html += `<div class="card p-2 mb-2" onclick="ui.closeModal();app.setContext('business','${b.id}')"><b>${b.name}</b></div>`;
        });
        html += `<button class="btn btn-primary full-width mt-2" onclick="ui.closeModal();biz.openCreateModal()">+ Create New</button></div>`;
        ui.modal(html);
    }
};

// --- FINANCE LOGIC (MONEY) ---
const finance = {
    // 1. BUSINESS: Deposit Funds
    deposit: async (e) => {
        e.preventDefault();
        ui.toast("Receipt Uploaded. Admin will verify.");
        // Logic: Upload image to Storage, add 'transaction' doc with status: pending
        document.getElementById('depSlip').value = '';
        document.getElementById('depAmount').value = '';
    },
    
    // 2. BUSINESS: Create Ad
    launchCampaign: async (e) => {
        e.preventDefault();
        const b = state.businesses.find(x => x.id === state.context.id);
        const count = parseInt(document.getElementById('campCount').value);
        const cost = count * 5; // Rs 5 per view
        
        if(b.wallet < cost) return ui.toast("Insufficient Ad Funds. Please Deposit.", "error");
        
        if(!confirm(`Cost: Rs. ${cost}. Proceed?`)) return;

        ui.loader(true);
        try {
            // Deduct
            await db.collection('businesses').doc(b.id).update({ wallet: b.wallet - cost });
            b.wallet -= cost;
            document.getElementById('bizWallet').innerText = `Rs. ${b.wallet}`;

            // Create Campaign
            await db.collection('ads').add({
                bizId: b.id,
                msg: document.getElementById('campMsg').value,
                link: document.getElementById('campLink').value,
                budget: count,
                active: true,
                createdAt: new Date()
            });
            ui.toast("Blast Sent!");
            document.getElementById('campMsg').value = '';
        } catch(e) { ui.toast(e.message, 'error'); }
        ui.loader(false);
    },

    // 3. USER: View Ad & Earn
    loadAds: async () => {
        const div = document.getElementById('adGrid');
        div.innerHTML = 'Loading...';
        const snap = await db.collection('ads').where('active','==',true).limit(20).get();
        div.innerHTML = '';
        snap.forEach(doc => {
            const ad = doc.data();
            if(ad.budget > 0) {
                div.innerHTML += `
                <div class="ad-card" onclick="finance.watchAd('${doc.id}', '${ad.link}')">
                    <p><b>${ad.msg}</b></p>
                    <div class="mt-2 text-gold"><i class="fa-solid fa-coins"></i> Earn Rs. 2.00</div>
                </div>`;
            }
        });
    },

    watchAd: (id, link) => {
        window.open(link, '_blank');
        ui.toast("Please wait 5 seconds to verify...", "info");
        
        setTimeout(async () => {
            // SECURITY NOTE: This is client-side. In production, use Cloud Function.
            const userRef = db.collection('users').doc(state.user.uid);
            await userRef.update({ wallet: firebase.firestore.FieldValue.increment(2) });
            
            // Log Transaction
            await db.collection('transactions').add({
                uid: state.user.uid, type: 'earning', amount: 2, desc: 'Ad View', date: new Date()
            });

            state.userData.wallet += 2;
            document.getElementById('walletBalance').innerText = `Rs. ${state.userData.wallet}`;
            ui.toast("Rs. 2.00 Added!", "success");
            finance.loadAds(); // Refresh
        }, 5000);
    },

    withdrawModal: () => {
        ui.modal(`
            <h3>Withdraw Funds</h3>
            <p>Available: Rs. ${state.userData.wallet}</p>
            <input type="text" placeholder="Bank Name & Account No" class="mt-2">
            <input type="number" placeholder="Amount" class="mt-2">
            <button class="btn btn-success full-width mt-2" onclick="ui.toast('Request Sent to Admin');ui.closeModal()">Request Payout</button>
        `);
    }
};

// --- SOCIAL LOGIC ---
const social = {
    loadFeed: async () => {
        const div = document.getElementById('feedStream');
        div.innerHTML = '<div class="spinner"></div>';
        const snap = await db.collection('posts').orderBy('createdAt','desc').limit(20).get();
        div.innerHTML = '';
        snap.forEach(d => {
            const p = d.data();
            div.innerHTML += `
                <div class="card mb-4">
                    <div class="flex-center" style="justify-content:flex-start; gap:10px;">
                        <img src="https://via.placeholder.com/40" style="border-radius:50%">
                        <div><b>${p.author}</b><br><small class="text-muted">${p.role}</small></div>
                    </div>
                    <p class="mt-2">${p.text}</p>
                    <div class="mt-2 flex-between text-muted text-sm">
                        <span><i class="fa-regular fa-heart"></i> Like</span>
                        <span><i class="fa-regular fa-comment"></i> Comment</span>
                    </div>
                </div>
            `;
        });
    },
    openPostModal: () => {
        ui.modal(`
            <h3>Create Post</h3>
            <textarea id="postTxt" rows="4" class="full-width" placeholder="What's on your mind?"></textarea>
            <button class="btn btn-primary full-width mt-2" onclick="social.post()">Post</button>
        `);
    },
    post: async () => {
        const txt = document.getElementById('postTxt').value;
        await db.collection('posts').add({
            uid: state.user.uid, author: state.userData.name, role: 'Individual', text: txt, createdAt: new Date()
        });
        ui.closeModal();
        ui.toast("Posted!");
        social.loadFeed();
    }
};

// --- UI UTILS ---
const ui = {
    loader: (s) => document.getElementById('loader').classList.toggle('hidden', !s),
    goto: (id) => {
        document.querySelectorAll('.tab-view').forEach(e => e.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
        document.getElementById(id).classList.remove('hidden');
        if(id === 'v-earn') finance.loadAds();
        if(id === 'v-wallet') document.getElementById('walletBalance').innerText = `Rs. ${state.userData.wallet}`;
    },
    modal: (html) => {
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('modal').classList.remove('hidden');
    },
    closeModal: () => document.getElementById('modal').classList.add('hidden'),
    toast: (msg, type='success') => {
        const d = document.createElement('div');
        d.className = 'toast';
        d.style.borderLeft = type === 'error' ? '4px solid red' : '4px solid #10b981';
        d.innerText = msg;
        document.getElementById('toastBox').appendChild(d);
        setTimeout(() => d.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', app.init);
