import http.server
import socketserver
import os

PORT = 8000

class COOPCOEPServer(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 开启 SharedArrayBuffer 必须的两个安全头
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        # 允许缓存，但在开发时最好禁用以免改了没效果
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

# 确保切换到脚本所在目录，避免路径错误
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print(f"Serving at http://localhost:{PORT}")
print("Security headers enabled: COOP & COEP")
print("Press Ctrl+C to stop.")

with socketserver.TCPServer(("", PORT), COOPCOEPServer) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
