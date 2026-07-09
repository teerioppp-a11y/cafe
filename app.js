// --- นำ URL และ Anon Key จาก Supabase มาใส่ตรงนี้ ---
const SUPABASE_URL = 'https://lsyofqawzztamcdhktzt.supabase.co';
// ⚠️ อย่าลืมเอาคีย์ยาวๆ ของคุณ (anon public) มาใส่แทนที่คำว่า 'YOUR_ANON_KEY' ตรงนี้ด้วยนะครับ!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeW9mcWF3enp0YW1jZGhrdHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODQ0MjAsImV4cCI6MjA5OTE2MDQyMH0.6ijHGC-Cn_d5EfeoshtGYVUlpQJqgInH72sP9HU3-XY'; 

// แก้ไขปัญหาการประกาศตัวแปรซ้ำซ้อนกับระบบ Global SDK เรียบร้อยแล้ว
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ข้อมูลสินค้าภายในร้าน POS
const products = [
    { id: 1, name: 'Espresso', price: 50, type: 'coffee' },
    { id: 2, name: 'Americano', price: 55, type: 'coffee' },
    { id: 3, name: 'Latte', price: 65, type: 'coffee' },
    { id: 4, name: 'Mocha', price: 70, type: 'coffee' },
    { id: 5, name: 'Croissant', price: 60, type: 'bakery' },
    { id: 6, name: 'Brownie', price: 45, type: 'bakery' },
    { id: 7, name: 'Cheesecake', price: 85, type: 'bakery' }
];

let cart = [];
let currentUser = null;
let currentPoints = 0;

// โหลดข้อมูลเมื่อเปิดเว็บ
window.onload = async () => {
    checkTheme();
    renderProducts();
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showDashboard();
    }
};

// --- ระบบ Auth (Login/Register) ---
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

// --- ระบบ POS และ ตะกร้า ---
function renderProducts() {
    const coffeeList = document.getElementById('coffee-list');
    const bakeryList = document.getElementById('bakery-list');
    
    if(!coffeeList || !bakeryList) return;
    
    coffeeList.innerHTML = '';
    bakeryList.innerHTML = '';

    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `<h4>${p.name}</h4><p>${p.price} ฿</p>`;
        div.onclick = () => addToCart(p);
        
        if (p.type === 'coffee') coffeeList.appendChild(div);
        else bakeryList.appendChild(div);
    });
}

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
        li.innerHTML = `<span>${item.name}</span> <span>${item.price} ฿ <button style="padding:2px 5px; margin-left:10px; background:#dc3545; color:white; border:none; border-radius:3px;" onclick="removeFromCart(${index})">X</button></span>`;
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

// --- ระบบ Dark/Light Mode ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function checkTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.classList.add('dark-mode');
}
