/**
 * PORTFOLIO DATA CONFIGURATION - NHẬT QUANG NGUYỄN (QUANT TRADER)
 * 
 * Bạn có thể dễ dàng chỉnh sửa các thông tin bên dưới để cập nhật nội dung trên website.
 */

const PORTFOLIO_DATA = {
  profile: {
    name: "NHẬT QUANG NGUYỄN",
    title: "QUANTITATIVE TRADER & RESEARCHER",
    ticker: "NQ-QUANT <EQUITY>",
    status: "ACTIVE / TRADING",
    location: "Vietnam / Remote",
    linkedin: "https://www.linkedin.com/in/nh%E1%BA%ADt-quang-nguy%E1%BB%85n-962499391/",
    github: "https://github.com/",
    email: "contact@nhatquang-quant.com",
    bio: [
      "Quant Trader chuyên xây dựng, kiểm thử (backtest) và triển khai các thuật toán giao dịch tự động trên thị trường Tài chính & Crypto.",
      "Tập trung vào các chiến lược Statistical Arbitrage, Market Making, Volatility Trading và Machine Learning Momentum.",
      "Sử dụng tư duy định lượng toán học, mô hình hoá rủi ro khắt khe và hệ thống thực thi độ trễ thấp (low-latency execution)."
    ]
  },

  // Chỉ số hiệu suất tổng quan (Key Performance Metrics)
  metrics: {
    sharpeRatio: "2.85",
    sortinoRatio: "3.42",
    cagr: "+34.2%",
    maxDrawdown: "-4.12%",
    winRate: "67.4%",
    profitFactor: "2.15",
    avgTradesPerDay: "~1,420",
    executionLatency: "< 4.2ms"
  },

  // Dữ liệu đường cong lợi nhuận NAV (dùng vẽ biểu đồ Canvas)
  navData: [
    { date: "2023-Q1", nav: 100.0, benchmark: 100.0 },
    { date: "2023-Q2", nav: 108.4, benchmark: 102.1 },
    { date: "2023-Q3", nav: 114.2, benchmark: 101.5 },
    { date: "2023-Q4", nav: 122.9, benchmark: 107.8 },
    { date: "2024-Q1", nav: 135.1, benchmark: 114.2 },
    { date: "2024-Q2", nav: 141.0, benchmark: 112.9 },
    { date: "2024-Q3", nav: 149.8, benchmark: 118.4 },
    { date: "2024-Q4", nav: 162.3, benchmark: 124.0 },
    { date: "2025-Q1", nav: 174.5, benchmark: 128.6 },
    { date: "2025-Q2", nav: 188.2, benchmark: 131.2 },
    { date: "2025-Q3", nav: 196.4, benchmark: 135.0 },
    { date: "2025-Q4", nav: 212.8, benchmark: 139.8 },
    { date: "2026-Q1", nav: 228.6, benchmark: 142.5 }
  ],

  // Các chiến lược giao dịch cốt lõi (Core Strategies)
  strategies: [
    {
      code: "STAT-ARB",
      name: "Statistical Arbitrage & Pair Trading",
      allocation: "35%",
      description: "Khai thác tính dừng (stationarity) và quan hệ đồng tích hợp (cointegration) giữa các cặp tài sản bằng mô hình Kalman Filter & Vector Error Correction (VECM).",
      tags: ["Python", "Cointegration", "Kalman Filter", "Low-Latency"]
    },
    {
      code: "MM-ALGO",
      name: "Algorithmic Market Making",
      allocation: "25%",
      description: "Cung cấp thanh khoản liên tục trên Order Book bằng mô hình Avellaneda-Stoikov, quản lý rủi ro kho hàng (inventory risk) và tối ưu hóa spread.",
      tags: ["C++", "Order Book Depth", "Avellaneda-Stoikov", "Limit Orders"]
    },
    {
      code: "VOL-SURF",
      name: "Volatility Surface Arbitrage",
      allocation: "20%",
      description: "Giao dịch chênh lệch giá biến động lịch sử (HV) vs biến động ngầm định (IV) trên thị trường Option (Deribit/CBOE) sử dụng mô hình SABR & Black-Scholes Delta Hedging.",
      tags: ["Options", "Delta-Neutral", "SABR Model", "Greeks Risk"]
    },
    {
      code: "ML-MOM",
      name: "Machine Learning Alpha & Momentum",
      allocation: "20%",
      description: "Dự đoán xu hướng giá ngắn hạn từ dữ liệu Tick-by-Tick & Order Flow Imbalance (OFI) sử dụng mô hình LightGBM & PyTorch Transformer.",
      tags: ["PyTorch", "LightGBM", "Order Flow Imbalance", "Feature Engineering"]
    }
  ],

  // Kỹ năng & Công nghệ (Tech Stack)
  skills: {
    languages: ["Python (Advanced)", "C++ 20", "SQL", "Rust", "Q / KDB+"],
    libraries: ["PyTorch", "NumPy", "pandas", "SciPy", "statsmodels", "Polars", "LightGBM"],
    infrastructure: ["Docker", "Kubernetes", "Linux Kernel Tuning", "Redis", "Kafka", "TimescaleDB"],
    tradingPlatforms: ["Interactive Brokers (IBKR API)", "CCXT", "Binance API", "Deribit API", "MetaTrader 5", "QuantConnect"]
  },

  // Kinh nghiệm làm việc & Học vấn
  experience: [
    {
      period: "2023 - PRESENT",
      role: "Quantitative Trader / Researcher",
      company: "Proprietary Trading Desk / Systematic Alpha",
      details: [
        "Phát triển và vận hành hệ thống auto-trading xử lý 1,000+ giao dịch mỗi ngày.",
        "Thiết kế thuật toán lọc tín hiệu nhiễu trên dữ liệu High-Frequency Tick Data.",
        "Tối ưu hóa hệ thống khớp lệnh độ trễ dưới 5ms."
      ]
    },
    {
      period: "2021 - 2023",
      role: "Quantitative Analyst",
      company: "Financial Technology & Investment Firm",
      details: [
        "Xây dựng pipeline dữ liệu tài chính thời gian thực xử lý hàng chục triệu bản ghi.",
        "Nghiên cứu các mô hình phân bổ danh mục Markowitz, Black-Litterman và Risk Parity.",
        "Thực hiện stress testing và kiểm soát rủi ro VaR (Value at Risk)."
      ]
    }
  ],

  education: [
    {
      period: "2018 - 2022",
      degree: "B.Sc. in Quantitative Finance / Applied Mathematics / Computer Science",
      institution: "University of Economics & Technology",
      notes: "Tập trung: Xác suất Thống kê, Giải thuật Cấu trúc dữ liệu, Tài chính Định lượng."
    }
  ],

  // Ticker thị trường mô phỏng (Live Simulated Ticker Bar)
  tickers: [
    { symbol: "BTC/USD", price: 92450.00, change: "+3.42%", dir: "up" },
    { symbol: "ETH/USD", price: 3480.50, change: "+2.15%", dir: "up" },
    { symbol: "S&P 500", price: 5820.10, change: "-0.35%", dir: "down" },
    { symbol: "NQ-NAV", price: 228.60, change: "+12.4%", dir: "up" },
    { symbol: "ALPHA-S1", price: 1.842, change: "+0.88%", dir: "up" },
    { symbol: "SHARPE", price: 2.85, change: "STABLE", dir: "neutral" },
    { symbol: "MAX-DD", price: -4.12, change: "SAFE", dir: "up" },
    { symbol: "LATENCY", price: 4.18, change: "ms", dir: "neutral" }
  ]
};
