const SUPABASE_URL = 'https://tyvbsgonfticxuaggzgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dmJzZ29uZnRpY3h1YWdnemdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjgwMTgsImV4cCI6MjA5OTE0NDAxOH0.IZWsX-ChzMrhMvsnSp3AdglRNfZQoYctzw5NhBLg-VM'; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- เพิ่มข้อมูลลิงก์รูปภาพ (image) ให้กับสินค้าแต่ละตัว ---
const products = [
    { id: 1, name: 'Espresso', price: 50, type: 'coffee', image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=300&q=80' },
    { id: 2, name: 'Americano', price: 55, type: 'coffee', image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=300&q=80' },
    { id: 3, name: 'Latte', price: 65, type: 'coffee', image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=300&q=80' },
    { id: 4, name: 'Mocha', price: 70, type: 'coffee', image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=300&q=80' },
    { id: 5, name: 'Croissant', price: 60, type: 'bakery', image: 'https://images.unsplash.com/photo-1555507036-ab1e4006aaeb?auto=format&fit=crop&w=300&q=80' },
    { id: 6, name: 'Brownie', price: 45, type: 'bakery', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=300&q=80' },
    { id: 7, name: 'Cheesecake', price: 85, type: 'bakery', image: 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?auto=format&fit=crop&w=300&q=80' }
];

let cart = [];
let currentUser = null;
let currentPoints = 0;

window.onload = async () => {
    checkTheme();
    renderProducts();
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showDashboard();
    }
};

// --- ระบบ Auth ---
async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-msg');
    msg.innerText = "กำลังประมวลผล...";
    
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        msg.innerText = "Error: " + error.message;
    } else {
        msg.innerText = "สมัครสำเร็จ! กำลังเข้าสู่ระบบ...";
        setTimeout(() => { login(); }, 1000);
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-msg');
    msg.innerText = "กำลังเข้าสู่ระบบ...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        msg.innerText = "Error: " + error.message;
    } else {
        currentUser = data.user;
        showDashboard();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('login-section').classList.add('active');
    cart = [];
    updateCart();
    document.getElementById('auth-msg').innerText = "";
}

async function showDashboard() {
    document.getElementById('login-section').classList.remove('active');
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('active');
    await fetchPoints();
}

async function fetchPoints() {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('points')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        currentPoints = data.points;
    } else if (error && error.code === 'PGRST116') {
        await supabaseClient.from('profiles').insert([{ id: currentUser.id, points: 0 }]);
        currentPoints = 0;
    }
    document.getElementById('user-points').innerText = `แต้มสะสม: ${currentPoints}`;
}

// --- ระบบดึงข้อมูลสินค้ามาแสดง (อัปเดตให้รองรับรูปภาพ) ---
function renderProducts() {
    const coffeeList = document.getElementById('coffee-list');
    const bakeryList = document.getElementById('bakery-list');
    
    if(!coffeeList || !bakeryList) return;
    
    coffeeList.innerHTML = '';
    bakeryList.innerHTML = '';

    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
            <div class="product-img-box">
                <img src="${p.image}" alt="${p.name}">
            </div>
            <div class="product-info">
                <h4>${p.name}</h4>
                <p>${p.price} ฿</p>
            </div>
        `;
        div.onclick = () => addToCart(p);
        
        if (p.type === 'coffee') coffeeList.appendChild(div);
        else bakeryList.appendChild(div);
    });
}

// --- ระบบตะกร้าสินค้า ---
function addToCart(product) {
    cart.push(product);
    updateCart();
}

function updateCart() {
    const ul = document.getElementById('cart-items');
    ul.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price;
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.name}</span> <span>${item.price} ฿ <button style="padding:2px 5px; margin-left:10px; background:var(--danger-color); color:white; border:none; border-radius:3px;" onclick="removeFromCart(${index})">X</button></span>`;
        ul.appendChild(li);
    });

    document.getElementById('total-price').innerText = total;
    const earn = Math.floor(total / 50);
    document.getElementById('earn-points').innerText = earn;
    
    document.getElementById('checkout-btn').disabled = cart.length === 0;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

async function checkout() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const earnedPoints = Math.floor(total / 50);
    const newTotalPoints = currentPoints + earnedPoints;

    const { error } = await supabaseClient
        .from('profiles')
        .update({ points: newTotalPoints })
        .eq('id', currentUser.id);

    if (!error) {
        alert(`ชำระเงินสำเร็จ! ยอดรวม ${total} บาท\nคุณได้รับ ${earnedPoints} แต้ม`);
        cart = [];
        updateCart();
        fetchPoints();
    } else {
        alert('เกิดข้อผิดพลาดในการบันทึกแต้ม: ' + error.message);
    }
}

// --- ระบบโหมดมืด-สว่าง ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function checkTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.classList.add('dark-mode');
}
