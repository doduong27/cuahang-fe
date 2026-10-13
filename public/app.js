// Cấu hình URL Backend:
// Trong K8s Ingress, frontend và backend cùng chung domain qua /api
const API_BASE = window.location.origin;

let cart = [];

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

async function fetchBackendInfo() {
  const startTime = performance.now();
  try {
    const res = await fetch(`${API_BASE}/healthz`);
    const latency = Math.round(performance.now() - startTime);
    document.getElementById("apiLatency").textContent = `${latency} ms`;

    if (res.ok) {
      const data = await res.json();
      document.getElementById("backendStatus").textContent = "Online (Healthy)";
      document.getElementById("backendStatus").className = "text-emerald-400 font-mono";

      // Cập nhật huy hiệu môi trường
      const env = (data.environment || "dev").toUpperCase();
      const badge = document.getElementById("envBadge");
      badge.textContent = `Môi trường: ${env}`;
      if (env === "PROD" || env === "PRODUCTION") {
        badge.className = "px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30";
      } else if (env === "STAG" || env === "STAGING") {
        badge.className = "px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30";
      } else {
        badge.className = "px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30";
      }
    } else {
      throw new Error("HTTP error " + res.status);
    }
  } catch (err) {
    document.getElementById("backendStatus").textContent = "Không thể kết nối";
    document.getElementById("backendStatus").className = "text-rose-400 font-mono";
    document.getElementById("apiLatency").textContent = "-- ms";
  }

  // Lấy Pod ID
  try {
    const infoRes = await fetch(`${API_BASE}/api/info`);
    if (infoRes.ok) {
      const info = await infoRes.json();
      document.getElementById("podHostname").textContent = info.hostname || "localhost";
    }
  } catch (e) {}
}

async function fetchProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = `
    <div class="col-span-full py-12 text-center text-slate-400">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-500 mb-2"></i>
      <p class="text-sm">Đang tải sản phẩm từ PostgreSQL...</p>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) throw new Error("Lỗi nạp sản phẩm");
    const products = await res.json();

    document.getElementById("productCountBadge").textContent = `${products.length} sản phẩm khả dụng`;

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
          <p>Chưa có sản phẩm nào. Hãy chạy script seed database!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(p => `
      <div class="bg-slate-800/80 rounded-xl overflow-hidden border border-slate-700/60 hover:border-indigo-500/50 transition duration-200 flex flex-col group shadow-lg">
        <div class="h-44 overflow-hidden bg-slate-900 relative">
          <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500'}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <span class="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur text-slate-300 text-[10px] px-2 py-0.5 rounded font-medium border border-slate-700">
            ${p.category || 'Công nghệ'}
          </span>
        </div>
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <h4 class="font-bold text-sm text-white group-hover:text-indigo-400 transition">${p.name}</h4>
            <div class="text-base font-extrabold text-indigo-400 mt-1">${formatVND(p.price)}</div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <span class="text-xs text-slate-400">Còn lại: <b class="text-slate-200">${p.stock}</b></span>
            <button onclick="addToCart('${p.name}', ${p.price})" class="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition border border-indigo-500/30 flex items-center gap-1.5">
              <i class="fa-solid fa-plus text-[10px]"></i> Thêm
            </button>
          </div>
        </div>
      </div>
    `).join("");

  } catch (err) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-rose-400 space-y-2">
        <i class="fa-solid fa-triangle-exclamation text-3xl"></i>
        <p class="font-medium text-sm">Không thể tải dữ liệu từ Backend API: ${err.message}</p>
        <p class="text-xs text-slate-400">Kiểm tra kết nối Pod và Database VM (192.168.1.253).</p>
      </div>
    `;
  }
}

function addToCart(name, price) {
  cart.push({ name, price });
  document.getElementById("cartCount").textContent = cart.length;
}

function openCart() {
  if (cart.length === 0) {
    alert("Giỏ hàng của bạn đang trống!");
    return;
  }
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const confirmOrder = confirm(`Giỏ hàng có ${cart.length} sản phẩm.\nTổng cộng: ${formatVND(total)}\n\nBạn có muốn gửi đơn hàng tới Backend API không?`);
  if (confirmOrder) {
    submitOrder(total);
  }
}

async function submitOrder(total) {
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Khách hàng DevOps Lab",
        totalAmount: total
      })
    });
    if (res.ok) {
      alert("✅ Đơn hàng đã được lưu thành công vào PostgreSQL!");
      cart = [];
      document.getElementById("cartCount").textContent = "0";
    } else {
      alert("❌ Lỗi khi gửi đơn hàng!");
    }
  } catch (e) {
    alert("❌ Lỗi kết nối: " + e.message);
  }
}

function refreshData() {
  fetchBackendInfo();
  fetchProducts();
}

window.addEventListener("DOMContentLoaded", () => {
  refreshData();
  // Polling mỗi 10s kiểm tra sức khỏe pod
  setInterval(fetchBackendInfo, 10000);
});
