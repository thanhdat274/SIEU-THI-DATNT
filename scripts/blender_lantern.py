# Đèn lồng cột bên cửa tiệm (gđ177 "Đầu ngõ lên đèn") — tài sản 3D dựng thủ công bằng Blender.
# Low-poly stylized theo đúng bảng màu ấm của hệ thống thiết kế: cột gỗ, nón chóp đỏ, thân thuỷ tinh
# cam ấm, lõi phát sáng (emissive) để lúc chiều tối code bật sáng. Xuất GLB nén Draco + manifest kiểm kê.
#
# Chạy: blender --background --factory-startup --python scripts/blender_lantern.py
# Đầu ra: public/models/facade/den_long.glb + public/models/facade/facade-manifest.json
import bpy, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, 'public', 'models', 'facade')
os.makedirs(DST, exist_ok=True)
OUT = os.path.join(DST, 'den_long.glb')

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def M(name, color, rough=0.85, clearcoat=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Alpha'].default_value = alpha
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
    return mat

def EMP(name, color, strength=2.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.05, 0.03, 0.02, 1.0)
    bsdf.inputs['Emission Color'].default_value = (*color, 1.0)
    bsdf.inputs['Emission Strength'].default_value = strength
    return mat

def box(name, size, loc, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    if mat:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob

def cyl(name, radius, depth, loc, mat=None, rot=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    if rot:
        ob.rotation_euler = rot
    if mat:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob

def cone(name, radius, depth, loc, mat=None, rot=None):
    bpy.ops.mesh.primitive_cone_add(radius1=radius, radius2=0.02, depth=depth, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    if rot:
        ob.rotation_euler = rot
    if mat:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob

# ---- Bảng màu hệ thống thiết kế (bảng ấm) ----
WOOD = (0.42, 0.30, 0.18)   # gỗ sậm
RED  = (0.80, 0.25, 0.22)   # đỏ lồng đèn
GLASS= (1.0, 0.80, 0.42)    # thuỷ tinh cam ấm
METAL= (0.27, 0.35, 0.40)   # kim loại
GLOW = (1.0, 0.55, 0.18)    # lõi phát sáng

def build():
    reset_scene()
    wood_mat = M('wood', WOOD)
    red_mat  = M('red', RED, clearcoat=0.3)
    glass_mat= M('glass', GLASS, rough=0.3, alpha=0.55)
    metal_mat= M('metal', METAL, rough=0.4)
    glow_mat = EMP('glow', GLOW, strength=3.0)

    # Cột gỗ chôn xuống đất một chút
    cyl('post', 0.055, 2.5, (0, 0, 1.25), wood_mat)
    # Nắp cột + thanh vươn ra phía ngoài cửa
    cyl('postCap', 0.085, 0.12, (0, 0, 2.5), wood_mat)
    box('arm', (0.85, 0.055, 0.055), (0.24, 0, 2.32), wood_mat)
    box('armBrace', (0.05, 0.08, 0.08), (0.05, 0, 2.36), wood_mat)
    # Hai dây treo từ thanh xuống chóp nón
    cyl('stringL', 0.012, 0.62, (0.52, 0, 2.20), metal_mat)
    cyl('stringR', 0.012, 0.62, (0.62, 0, 2.20), metal_mat)
    # Chóp nón đỏ (quay xuống dưới = depth hướng -y)
    cone('cap', 0.30, 0.20, (0.57, 0, 1.98), red_mat, (math.pi, 0, 0))
    # Vòng kim loại giữa đỉnh
    cyl('capRing', 0.16, 0.06, (0.57, 0, 1.92), metal_mat)
    # Thân thuỷ tinh cam ấm (trụ hơi phình) + lõi phát sáng bên trong
    cyl('body', 0.22, 0.42, (0.57, 0, 1.70), glass_mat)
    cyl('glow', 0.12, 0.34, (0.57, 0, 1.70), glow_mat)
    cyl('bodyRing', 0.235, 0.05, (0.57, 0, 1.92), metal_mat)
    cyl('bodyRingB', 0.235, 0.05, (0.57, 0, 1.49), metal_mat)
    # Đáy chóp nhỏ
    cone('base', 0.10, 0.08, (0.57, 0, 1.44), red_mat, (math.pi, 0, 0))

    # Đánh dấu phần phát sáng để code bật/tắt theo giờ: đặt tên 'glow' trên mesh + object
    glow_ob = bpy.data.objects['glow']
    glow_ob.name = 'den_long_glow'

    # Gộp tất cả phần không phát sáng thành 1 mesh (đỡ draw call); giữ lõi phát sáng riêng
    glow_ob.select_set(True)
    bpy.ops.object.select_all(action='DESELECT')
    glue = []
    for ob in bpy.data.objects:
        if ob.type == 'MESH' and ob.name != 'den_long_glow':
            ob.select_set(True)
            glue.append(ob)
    bpy.context.view_layer.objects.active = glue[0]
    bpy.ops.object.join()
    main_ob = bpy.context.active_object
    main_ob.name = 'den_long_body'
    main_ob.select_set(False)

    # Toàn bộ cast shadow; gốc ở sát đất cạnh góc cột
    for ob in [main_ob, glow_ob]:
        for slot in ob.data.materials:
            pass
        ob.select_set(True)
    bpy.context.view_layer.objects.active = glow_ob
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    bpy.ops.object.select_all(action='DESELECT')
    main_ob.select_set(True)
    glow_ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format='GLB', use_selection=True,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_apply=True,
    )
    return main_ob, glow_ob

if __name__ == '__main__':
    main_ob, glow_ob = build()
    print(f'OK den_long -> {OUT} ({main_ob.name} + {glow_ob.name})')
