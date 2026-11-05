function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );
}

function getCategorySVG(kategori) {
  const icons = {
    Dompet:
      '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    HP: '<rect width="14" height="20" x="5" y="2" rx="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
    Kunci:
      '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    Kartu:
      '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M6 15h4"/>',
    Tas: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  };
  const path =
    icons[kategori] ||
    '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>';
  return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5E5E5E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function mediaHTML(item) {
  if (!item.foto_url) return getCategorySVG(item.kategori);
  return `<img src="${escapeHTML(item.foto_url)}" alt="${escapeHTML(item.nama)}" data-kategori="${escapeHTML(item.kategori)}">`;
}

function attachImageFallback(root) {
  root.querySelectorAll("img[data-kategori]").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        img.parentElement.innerHTML = getCategorySVG(img.dataset.kategori);
      },
      { once: true },
    );
  });
}

function isDone(item) {
  return item.status === "selesai" || item.status === "diklaim";
}

function getBadgeInfo(item) {
  if (isDone(item)) {
    return {
      cls: "badge-selesai",
      label: item.tipe === "hilang" ? "SUDAH DITEMUKAN" : "SUDAH DIKEMBALIKAN",
    };
  }
  if (item.tipe === "hilang") return { cls: "badge-hilang", label: "HILANG" };
  return { cls: "badge-ditemukan", label: "DITEMUKAN" };
}

function getDoneButtonLabel(item) {
  return item.tipe === "hilang"
    ? "Tandai Sudah Ditemukan"
    : "Tandai Sudah Dikembalikan";
}

function shortCode(id) {
  return "FK-" + String(id).replace(/-/g, "").substring(0, 4).toUpperCase();
}

function formatTanggal(str) {
  if (!str) return "";
  const d = new Date(String(str).slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return String(str);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function resizeImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality,
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// 1. LOGIKA(index.html)
const itemsGrid = document.getElementById("itemsGrid");
if (itemsGrid) {
  const searchInput = document.getElementById("searchInput");
  const kategoriFilter = document.getElementById("kategoriFilter");
  const tipeFilter = document.getElementById("tipeFilter");
  const statusFilter = document.getElementById("statusFilter");

  async function updateGlobalStats() {
    try {
      const res = await fetch("/api/items");
      const allItems = await res.json();
      if (Array.isArray(allItems)) {
        const statHilang = document.getElementById("statHilang");
        const statDitemukan = document.getElementById("statDitemukan");
        const statSelesai = document.getElementById("statSelesai");
        if (statHilang)
          statHilang.textContent = allItems.filter(
            (i) => i.tipe === "hilang" && !isDone(i),
          ).length;
        if (statDitemukan)
          statDitemukan.textContent = allItems.filter(
            (i) => i.tipe === "ditemukan" && !isDone(i),
          ).length;
        if (statSelesai)
          statSelesai.textContent = allItems.filter((i) => isDone(i)).length;
      }
    } catch (e) {}
  }

  let requestId = 0;

  async function loadItems() {
    const myRequest = ++requestId;
    itemsGrid.innerHTML =
      '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.append("q", searchInput.value.trim());
    if (kategoriFilter.value) params.append("kategori", kategoriFilter.value);
    if (tipeFilter.value) params.append("tipe", tipeFilter.value);
    if (statusFilter.value) params.append("status", statusFilter.value);

    try {
      const res = await fetch(`/api/items?${params.toString()}`);
      const items = await res.json();
      if (myRequest !== requestId) return;

      if (!Array.isArray(items) || items.length === 0) {
        itemsGrid.innerHTML = `<div class="empty-state">Belum ada laporan yang cocok. Coba ubah filter atau lapor barang baru.</div>`;
        return;
      }

      itemsGrid.innerHTML = items
        .map((item) => {
          const badge = getBadgeInfo(item);
          return `
          <a href="/detail.html?id=${encodeURIComponent(item.id)}" class="item-card${isDone(item) ? " is-done" : ""}">
            <div class="card-media">${mediaHTML(item)}</div>
            <div class="card-body">
              <div class="card-top">
                <span class="mono-tag">${escapeHTML(shortCode(item.id))} • ${escapeHTML(item.kategori)}</span>
                <span class="badge ${badge.cls}">${badge.label}</span>
              </div>
              <h2 class="card-title">${escapeHTML(item.nama)}</h2>
              <div class="card-meta">
                <span>${escapeHTML(item.lokasi)}</span>
                <span class="mono-tag">${escapeHTML(formatTanggal(item.tanggal))}</span>
              </div>
            </div>
          </a>
        `;
        })
        .join("");
      attachImageFallback(itemsGrid);
    } catch (err) {
      if (myRequest !== requestId) return;
      itemsGrid.innerHTML = `<div class="empty-state">Gagal memuat daftar laporan. Pastikan server berjalan.</div>`;
    }
  }

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadItems, 250);
  });
  [kategoriFilter, tipeFilter, statusFilter].forEach((el) => {
    el.addEventListener("change", loadItems);
  });

  updateGlobalStats();
  loadItems();
}

// 2. LOGIKA(form.html)

const itemForm = document.getElementById("itemForm");
if (itemForm) {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  const fotoInput = document.getElementById("foto");
  const previewContainer = document.getElementById("previewContainer");
  const fotoPreview = document.getElementById("fotoPreview");
  const errorBox = document.getElementById("errorBox");
  const submitBtn = document.getElementById("submitBtn");

  document.getElementById("tanggal").valueAsDate = new Date();

  if (editId) {
    document.getElementById("formTitle").textContent = "Edit Laporan";
    fetch(`/api/items/${editId}`)
      .then((r) => r.json())
      .then((data) => {
        document.getElementById("tipe").value = data.tipe;
        document.getElementById("nama").value = data.nama;
        document.getElementById("kategori").value = data.kategori;
        document.getElementById("lokasi").value = data.lokasi;
        document.getElementById("tanggal").value = data.tanggal;
        document.getElementById("deskripsi").value = data.deskripsi || "";
        document.getElementById("kontak").value = data.kontak;
        if (data.foto_url) {
          fotoPreview.src = data.foto_url;
          previewContainer.style.display = "block";
        }
      });
  }

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      fotoPreview.src = URL.createObjectURL(file);
      previewContainer.style.display = "block";
    }
  });

  itemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan...";

    const formData = new FormData(itemForm);
    const rawFile = fotoInput.files[0];

    if (rawFile) {
      if (rawFile.size > 2 * 1024 * 1024) {
        const resized = await resizeImage(rawFile);
        if (resized.size > 2 * 1024 * 1024) {
          errorBox.textContent = "Ukuran foto maksimal 2 MB";
          errorBox.style.display = "block";
          submitBtn.disabled = false;
          submitBtn.textContent = "Simpan Laporan";
          return;
        }
        formData.set("foto", resized);
      }
    }

    const url = editId ? `/api/items/${editId}` : "/api/items";
    const method = editId ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, body: formData });
      const result = await res.json();

      if (!res.ok) {
        errorBox.textContent = result.error || "Gagal menyimpan laporan";
        errorBox.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Simpan Laporan";
        return;
      }
      window.location.href = `/detail.html?id=${result.id}`;
    } catch (err) {
      errorBox.textContent = "Koneksi ke server gagal";
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Simpan Laporan";
    }
  });
}

// 3. LOGIKA (detail.html)

const detailContainer = document.getElementById("detailContainer");
if (detailContainer) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  async function loadDetail() {
    const res = await fetch(`/api/items/${id}`);
    if (!res.ok) {
      detailContainer.innerHTML = `<p>Laporan tidak ditemukan.</p>`;
      return;
    }
    const item = await res.json();
    const badge = getBadgeInfo(item);
    const code = shortCode(item.id);

    const cleanPhone = item.kontak.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const waText = encodeURIComponent(
      `Halo, saya melihat laporan ${item.tipe} "${item.nama}" (${code}) di aplikasi FindKu.`,
    );

    detailContainer.innerHTML = `
      <div class="card-media" style="border: 1px solid var(--border); border-radius: 4px;">${mediaHTML(item)}</div>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="card-top">
          <span class="mono-tag">${escapeHTML(code)} • ${escapeHTML(item.kategori)}</span>
          <span class="badge ${badge.cls}">${badge.label}</span>
        </div>
        <h1 style="font-size: 28px;">${escapeHTML(item.nama)}</h1>
        <p style="color: var(--text-muted);">${escapeHTML(item.deskripsi || "Tidak ada deskripsi ciri-ciri tambahan.")}</p>
        <div style="border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 12px 0; display: grid; gap: 8px;">
          <div><strong>Lokasi:</strong> ${escapeHTML(item.lokasi)}</div>
          <div><strong>Tanggal:</strong> <span class="mono-tag">${escapeHTML(formatTanggal(item.tanggal))}</span></div>
          <div><strong>Kontak WA:</strong> <span class="mono-tag">${escapeHTML(item.kontak)}</span></div>
        </div>
        <a href="https://wa.me/${cleanPhone}?text=${waText}" target="_blank" rel="noopener" class="btn btn-primary">
          Hubungi Pelapor
        </a>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
          ${!isDone(item) ? `<button id="doneBtn" class="btn btn-outline">${getDoneButtonLabel(item)}</button>` : ""}
          <a href="/form.html?id=${encodeURIComponent(item.id)}" class="btn btn-outline">Edit Laporan</a>
          <button id="deleteBtn" class="btn btn-danger">Hapus Laporan</button>
        </div>
      </div>
    `;
    attachImageFallback(detailContainer);

    const doneBtn = document.getElementById("doneBtn");
    if (doneBtn) {
      doneBtn.addEventListener("click", async () => {
        if (!confirm(`Tandai laporan "${item.nama}" sebagai selesai?`)) return;
        const r = await fetch(`/api/items/${item.id}/status`, {
          method: "PATCH",
        });
        if (!r.ok) {
          alert("Gagal mengubah status laporan");
          return;
        }
        loadDetail();
      });
    }

    document.getElementById("deleteBtn").addEventListener("click", async () => {
      if (
        confirm(`Apakah Anda yakin ingin menghapus laporan "${item.nama}"?`)
      ) {
        await fetch(`/api/items/${item.id}`, { method: "DELETE" });
        window.location.href = "/";
      }
    });
  }

  loadDetail();
}
