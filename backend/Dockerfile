FROM python:3.11-slim

WORKDIR /app

# 安装必要的系统依赖（rembg 等处理图片可能需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 将当前目录的代码全部复制过去
COPY . .

# 暴露 8000 端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]