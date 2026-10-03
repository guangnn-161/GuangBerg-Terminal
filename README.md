# 📈 Bloomberg Terminal Quant Trader Portfolio

Trang web **Portfolio cá nhân** dành riêng cho **Quant Trader / Quantitative Researcher (Nhật Quang Nguyễn)** với phong cách **Bloomberg Terminal** ấn tượng.

---

## 🌟 Tính Năng Nổi Bật

- 🖥️ **Giao diện chuẩn Bloomberg Terminal**: Bảng màu Amber Orange / Neon Green / Cyan trên nền tối, hỗ trợ hiệu ứng retro CRT screen.
- ⚡ **Thanh Live Ticker thời gian thực**: Cập nhật giá crypto, cổ phiếu & chỉ số Quant liên tục với hiệu ứng flash xanh/đỏ.
- 📊 **Biểu đồ đường cong lợi nhuận NAV (Equity Curve)**: Render trực tiếp bằng HTML5 Canvas mịn đẹp với chỉ số Sharpe 2.85, CAGR, Max Drawdown.
- ⌨️ **Dòng lệnh tương tác Bloomberg CLI (`<CMD> GO`)**: Hỗ trợ nhập lệnh `HELP`, `BIO`, `STRAT`, `TECH`, `NAV`, `EXP`, `MSG`, `CLEAR` hoặc phím tắt `F1` - `F6`.
- 🔊 **Âm thanh Retro Beep**: Giả lập âm thanh Terminal retro bằng Web Audio API (có nút Mute / Bật/Tắt).
- 📱 **Responsive toàn diện**: Tối ưu hiển thị hoàn hảo trên cả Desktop, Tablet và Mobile.
- ⚙️ **Quản lý dữ liệu tập trung (`data.js`)**: Chỉnh sửa thông tin cá nhân cực kỳ nhanh chóng mà không cần động đến code UI.

---

## 🚀 Hướng Dẫn Host Trên GitHub Pages

Trang web được thiết kế dạng **Static Single-Page Application (HTML/CSS/JS thuần)**, không cần Node.js hay build tool. Bạn chỉ cần đẩy mã nguồn lên GitHub:

### Bước 1: Khởi tạo Git repository & Push lên GitHub
Mở Terminal hoặc Command Prompt tại thư mục `d:\Portfolio`:

```bash
git init
git add .
git commit -m "Initial commit: Bloomberg Terminal Quant Portfolio"
git branch -M main
git remote add origin https://github.com/<your-username>/portfolio.git
git push -u origin main
```
*(Thay `<your-username>` bằng tên tài khoản GitHub của bạn)*

### Bước 2: Kích hoạt GitHub Pages
1. Truy cập vào Repository của bạn trên GitHub: `https://github.com/<your-username>/portfolio`
2. Vào **Settings** > **Pages** (ở cột bên trái).
3. Tại phần **Build and deployment**:
   - **Source**: Chọn `Deploy from a branch`.
   - **Branch**: Chọn `main` và thư mục `/ (root)`.
4. Nhấn **Save**. 

Sau 1 - 2 phút, trang web của bạn sẽ chạy live tại địa chỉ:
`https://<your-username>.github.io/portfolio/`

---

## 🛠️ Hướng Dẫn Chỉnh Sửa Thông Tin Cá Nhân

Tất cả nội dung hiển thị trên trang web đều nằm trong file `data.js`:

```javascript
// d:/Portfolio/data.js
const PORTFOLIO_DATA = {
  profile: {
    name: "NHẬT QUANG NGUYỄN",
    title: "QUANTITATIVE TRADER & RESEARCHER",
    linkedin: "https://www.linkedin.com/in/nh%E1%BA%ADt-quang-nguy%E1%BB%85n-962499391/",
    email: "email-cua-ban@gmail.com",
    // ...
  },
  // Chỉnh sửa các chiến lược, kinh nghiệm, kỹ năng tại đây
};
```

Chỉ cần mở file `data.js` bằng bất kỳ trình soạn thảo nào (VS Code, Notepad...), sửa thông tin theo ý muốn rồi `git push`, trang web sẽ tự động cập nhật!
