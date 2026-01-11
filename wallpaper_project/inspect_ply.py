import struct
import os

def inspect_ply(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return

    print(f"Inspecting: {file_path}")
    print("-" * 30)

    with open(file_path, 'rb') as f:
        # 读取 Header
        header_lines = []
        while True:
            line = f.readline().decode('utf-8', errors='ignore').strip()
            header_lines.append(line)
            if line == "end_header":
                break
        
        # 打印 Header 关键信息
        properties = []
        element_count = 0
        for line in header_lines:
            print(f"[HEADER] {line}")
            if line.startswith("element vertex"):
                element_count = int(line.split()[-1])
            if line.startswith("property"):
                properties.append(line.split()[-1])

        print("-" * 30)
        print(f"Total Points: {element_count}")
        print(f"Properties found: {properties}")

        # 检查是否包含 Gaussian Splat 必须的属性
        required_props = ['x', 'y', 'z', 'opacity', 'scale_0', 'rot_0']
        missing = [p for p in required_props if p not in properties]
        
        if missing:
            print(f"\n[WARNING] Missing critical Gaussian Splat properties: {missing}")
            print("This might be a standard Point Cloud, not a Gaussian Splat file.")
            print("The viewer ONLY supports Gaussian Splat PLY files.")
        else:
            print("\n[SUCCESS] Header looks like a valid Gaussian Splat file.")

        # 尝试读取第一个点的数据 (假设是 float32)
        # 注意：这只是粗略读取，如果不压缩的话
        if "format binary_little_endian" in header_lines[0] or "format binary_little_endian" in header_lines[1]:
            try:
                # 简单估算步长：float(4 bytes) * prop数量
                stride = len(properties) * 4
                data = f.read(stride)
                if len(data) == stride:
                    values = struct.unpack('f' * len(properties), data)
                    print("-" * 30)
                    print("First point data (Raw estimate):")
                    for i, val in enumerate(values):
                        print(f"  {properties[i]}: {val}")
            except Exception as e:
                print(f"Could not read binary data: {e}")

inspect_ply("scene.ply")
