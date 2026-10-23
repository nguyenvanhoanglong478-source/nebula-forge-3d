# 🌌 NEBULA FORGE 3D — Vũ Trụ Tương Tác & Hạt Lượng Tử

> **Live Demo (GitHub Pages):** [**https://nguyenvanhoanglong478-source.github.io/nebula-forge-3d/**](https://nguyenvanhoanglong478-source.github.io/nebula-forge-3d/)

**Nebula Forge 3D** là một dự án không gian 3D tương tác thời gian thực (Real-time Interactive 3D WebGL Experience) được xây dựng bằng **Three.js (WebGL 2.0)**, **Custom GLSL Shaders**, **Unreal Bloom Post-Processing**, và **Procedural Web Audio API Synthesizer**.

---

## ✨ Tính Năng Nổi Bật

1. **32,000+ Hạt Lượng Tử Tăng Tốc GPU (Custom GLSL Shaders)**
   - Hệ thống hạt chuyển động mượt mà ở 60 FPS với hiệu ứng phát sáng HDR (`UnrealBloomPass`).
   - Vật lý đàn hồi (Spring Physics) kết hợp trường lực 3D thời gian thực theo vị trí con trỏ chuột trong không gian 3 chiều.

2. **4 Chế Độ Mô Phỏng Vũ Trụ Đa Chiều**
   - 🕳️ **Hố Đen Gargantua (`Black Hole`)**: Chân trời sự kiện, vòng cầu photon phát sáng Fresnel (Gravitational Lensing) và đĩa bồi tụ xoáy cùng tia bức xạ cực.
   - 🧬 **Lõi Lượng Tử (`Quantum Core`)**: Cấu trúc nút thắt đa chiều Torus Knot $(p=3, q=5)$ kết hợp lồng đa diện đối xứng xoay ngược chiều.
   - 🪐 **Hệ Hành Tinh (`Solaris System`)**: Ngôi sao trung tâm cùng 6 hành tinh có vành đai, mặt trăng và vành đai tiểu hành tinh. Cho phép bắn thêm sao chổi có đuôi sáng vào quỹ đạo hấp dẫn.
   - 🌊 **Sóng Ngân Hà (`Cyberwave Matrix`)**: Ma trận sóng giao thoa 3D thời gian thực kết hợp các khối tinh thể năng lượng bay lơ lửng.

3. **Tương Tác Vật Lý & Điều Khiển Thời Gian Thực**
   - **3 Chế độ Trường Lực Chuột**: Xoáy Hút (`Vortex`), Hấp Dẫn (`Attract`), Đẩy Lượng Tử (`Repel`).
   - **5 Bảng Màu Tinh Vân (Palettes)**: *Interstellar Gold*, *Cyberpunk Neon*, *Quantum Emerald*, *Crimson Supernova*, *Violet Aurora*.
   - **Phóng Sao Chổi (`Double Click`)**: Click đúp vào bất kỳ vị trí nào trong không gian 3D để phóng một sao chổi bay theo quỹ đạo hấp dẫn.
   - **Vụ Nổ Siêu Tân Tinh (`Spacebar`)**: Giải phóng sóng xung kích đẩy văng toàn bộ 32,000 hạt lượng tử cùng hiệu ứng âm thanh trầm.
   - **Bộ Tổng Hợp Âm Thanh Vũ Trụ (`Web Audio API`)**: Tự động sinh âm thanh Ambient Drone và nốt nhạc hòa âm (Chime) theo tốc độ di chuyển chuột mà không cần file âm thanh ngoài.
   - **Chụp Ảnh Màn Hình 3D (`📸`)**: Xuất trực tiếp khung hình WebGL ra file ảnh `.PNG`.

---

## 🎮 Hướng Dẫn Điều Khiển

| Thao tác | Chức năng |
| :--- | :--- |
| **Kéo Chuột Trái** | Xoay góc nhìn Camera 360° quanh tâm vũ trụ |
| **Kéo Chuột Phải** | Dịch chuyển (Pan) vị trí Camera |
| **Con Lăn Chuột** | Thu phóng (Zoom In / Zoom Out) |
| **Di Chuyển Chuột** | Tạo trường lực 3D bẻ cong quỹ đạo 32,000 hạt |
| **Click Đúp (Double Click)** | Phóng Sao Chổi mới & tạo vòng sóng xung kích tại điểm trỏ |
| **Phím `Space`** | Kích hoạt vụ nổ Siêu Tân Tinh (Supernova Shockwave) |
| **Phím `H`** | Ẩn / Hiện toàn bộ giao diện HUD để ngắm cảnh Cinematic |
| **Phím `F`** | Bật / Tắt chế độ Toàn màn hình (Fullscreen) |

---

## 🛠️ Công Nghệ Sử Dụng

- **Nền tảng 3D**: [Three.js r170](https://threejs.org/) (ES Modules)
- **Hậu kỳ hình ảnh (Post-Processing)**: `EffectComposer`, `RenderPass`, `UnrealBloomPass`
- **Shaders**: Custom GLSL Vertex & Fragment Shaders (Additive Blending, Fresnel Photon Sphere, Distance Color Mixing)
- **Âm thanh**: Native Browser `Web Audio API` (Oscillators, BiquadFilter, Gain Envelope)
- **Giao diện**: Glassmorphism Sci-Fi HUD, CSS Variables, Responsive Layout
- **Triển khai**: GitHub Pages

---

## 🚀 Chạy Dự Án Tại Máy Cá Nhân (Local)

Dự án sử dụng chuẩn **ES Modules (`importmap`)** thuần túy nên không cần cài đặt `node_modules` phức tạp:

```bash
git clone https://github.com/nguyenvanhoanglong478-source/nebula-forge-3d.git
cd nebula-forge-3d
# Mở bằng bất kỳ static server nào (ví dụ Python hoặc VS Code Live Server):
python -m http.server 8080
```
Sau đó truy cập `http://localhost:8080` trên trình duyệt.
