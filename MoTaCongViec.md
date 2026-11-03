Chi tiết công việc từng Sprint 

Sprint 1 (20/10 - 26/10): Tìm kiếm dữ liệu, khởi tạo môi trường, xử lý dữ liệu

- Task 1.1: Cài đặt và thiết lập môi trường Anaconda (DATTCN_env), cài đặt các thư viện cần thiết.

- Task 1.2: Thu thập dataset giao dịch (PaySim) và cơ sở tri thức 16 kịch bản lừa đảo văn bản.

- Task 1.3: Tiền xử lý dữ liệu thô, làm sạch và chuẩn hóa định dạng phục vụ cho huấn luyện mô hình.

Sprint 2 (27/10 - 02/11): Huấn luyện module GNN

- Task 2.1: Xây dựng kiến trúc mạng đồ thị (GCN/GNN) bằng PyTorch Geometric.

- Task 2.2: Tiến hành huấn luyện mô hình GNN trên tập dữ liệu giao dịch dòng tiền.

- Task 2.3: Đánh giá kết quả huấn luyện và xuất file trọng số (HlmhGNN.pth).

Sprint 3 (03/11 - 09/11): Huấn luyện module NLP

- Task 3.1: Xây dựng pipeline xử lý ngôn ngữ tự nhiên (TF-IDF vectorizer, cosine similarity cho Search AI).

- Task 3.2: Xây dựng bộ quy tắc Rule-based kết hợp nhận diện từ khóa độc hại và trích xuất thực thể (STK, URL).

- Task 3.3: Đóng gói module NLP thành file XuLyNLP.py hoàn chỉnh.

Sprint 4 (10/11 - 16/11): Khởi tạo Backend FastAPI & Ráp nối NLP, GNN

- Task 4.1: Khởi tạo project FastAPI, cấu hình file main.py và CORS middleware.

- Task 4.2: Viết hàm load sẵn trọng số mô hình GNN và module NLP, đảm bảo không chạy lại quá trình train khi khởi động.

- Task 4.3: Xây dựng API endpoint nhận request và trả về kết quả phân tích đa tầng.

Sprint 5 (17/11 - 23/11): Xây dựng Web Demo

- Task 5.1: Thiết kế giao diện HTML/CSS/JS trực quan cho trang web demo chống lừa đảo.

- Task 5.2: Xây dựng các form nhập liệu nội dung tin nhắn và thông số giao dịch tài chính.

- Task 5.3: Lập trình hàm JavaScript gọi API bất đồng bộ (Fetch API) để tương tác với Backend.

Sprint 6 (24/11 - 30/11): Tích hợp hệ thống

- Task 6.1: Gắn kết hoàn chỉnh giữa Frontend (Giao diện Web) và Backend (FastAPI).

- Task 6.2: Kiểm tra sự đồng bộ cấu trúc dữ liệu JSON truyền nhận giữa các tầng.

- Task 6.3: Chạy thử nghiệm luồng hoạt động toàn cục lần đầu tiên trên môi trường local.

Sprint 7 (01/12 - 07/12): Kiểm thử hệ thống (Testing)

- Task 7.1: Thực hiện các ca kiểm thử (Test cases) với nhiều mẫu tin nhắn lừa đảo và hạn mức giao dịch đa dạng.

- Task 7.2: Ghi nhận lỗi phát sinh (nếu có) và tiến hành tối ưu hóa tốc độ phản hồi của hệ thống.

- Task 7.3: Cập nhật tài liệu ghi chú lỗi vào file TROUBLESHOOTING.md.

Sprint 8 (08/12 - 14/12): Hoàn thiện sản phẩm

- Task 8.1: Rà soát lại toàn bộ mã nguồn trên VS Code, dọn dẹp các file rác.

- Task 8.2: Đồng bộ hóa toàn bộ mã nguồn lên nhánh chính (main) của kho lưu trữ GitHub.

- Task 8.3: Quay video demo ngắn ghi lại toàn bộ tính năng hoạt động của hệ thống thực tế.

Sprint 9 (15/12 - 20/12): Viết báo cáo đồ án & Bàn giao

- Task 9.1: Hoàn thiện cấu trúc nội dung các chương trong cuốn báo cáo đồ án tốt nghiệp.

- Task 9.2: Chuẩn bị slide thuyết trình bảo vệ đồ án chuyên nghiệp.

- Task 9.3: Bàn giao sản phẩm và sẵn sàng bảo vệ trước hội đồng.
