const supabase = require("../lib/supabase");
const BUCKET = process.env.SUPABASE_BUCKET || "findku-photos";

const TIPE_VALID = ["hilang", "ditemukan"];
const STATUS_VALID = ["aktif", "selesai"];

const DONE_STATUSES = ["selesai", "diklaim"];

async function uploadPhoto(file) {
  if (!file) return null;
  const ext = file.originalname.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

exports.getItems = async (req, res) => {
  try {
    const { q, kategori, tipe, status } = req.query;

    let query = supabase
      .from("items")
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });

    if (q) query = query.ilike("nama", `%${q}%`);
    if (kategori) query = query.eq("kategori", kategori);

    const notDone = (qb) =>
      qb.not("status", "in", `(${DONE_STATUSES.join(",")})`);

    let statusFromTipe = null;
    if (tipe === "hilang") {
      query = query.eq("tipe", "hilang");
    } else if (tipe === "ditemukan") {
      query = query.eq("tipe", "ditemukan");
    } else if (tipe === "dikembalikan") {
      query = query.eq("tipe", "ditemukan");
      statusFromTipe = "selesai";
    }

    const effectiveStatus = statusFromTipe || status;

    if (effectiveStatus === "selesai") {
      query = query.in("status", DONE_STATUSES);
    } else if (effectiveStatus === "aktif") {
      query = notDone(query);
    } else if (tipe === "hilang" || tipe === "ditemukan") {
      query = notDone(query);
    }

    if (tipe === "dikembalikan" && status === "aktif") {
      return res.json([]);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getItemById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createItem = async (req, res) => {
  try {
    const { nama, kategori, deskripsi, lokasi, tanggal, tipe, kontak } =
      req.body;
    if (!nama || !kategori || !lokasi || !tanggal || !tipe || !kontak) {
      return res.status(400).json({ error: "Semua field wajib harus diisi" });
    }
    if (!TIPE_VALID.includes(tipe)) {
      return res
        .status(400)
        .json({ error: "Tipe laporan harus hilang atau ditemukan" });
    }

    let foto_url = null;
    if (req.file) {
      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({ error: "Ukuran foto maksimal 2 MB" });
      }
      foto_url = await uploadPhoto(req.file);
    }

    const { data, error } = await supabase
      .from("items")
      .insert([
        {
          nama,
          kategori,
          deskripsi,
          lokasi,
          tanggal,
          tipe,
          kontak,
          foto_url,
          status: "aktif",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { nama, kategori, deskripsi, lokasi, tanggal, tipe, kontak } =
      req.body;
    if (tipe && !TIPE_VALID.includes(tipe)) {
      return res
        .status(400)
        .json({ error: "Tipe laporan harus hilang atau ditemukan" });
    }
    const updates = {
      nama,
      kategori,
      deskripsi,
      lokasi,
      tanggal,
      tipe,
      kontak,
    };

    if (req.file) {
      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({ error: "Ukuran foto maksimal 2 MB" });
      }
      updates.foto_url = await uploadPhoto(req.file);
    }

    const { data, error } = await supabase
      .from("items")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markClaimed = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("items")
      .update({ status: "selesai" })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ message: "Laporan berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
